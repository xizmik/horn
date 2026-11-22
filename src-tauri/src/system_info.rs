use serde::Serialize;
use std::time::Instant;
use sysinfo::{Components, Disks, Networks, System};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub kind: String,
    pub total_gb: f64,
    pub free_gb: f64,
    pub used_gb: f64,
    pub used_percent: f32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemTelemetry {
    pub cpu_percent: f32,
    pub ram_used_gb: f64,
    pub ram_total_gb: f64,
    pub ram_percent: f32,
    pub gpu_percent: Option<f32>,
    pub gpu_name: Option<String>,
    pub temperature_c: Option<f32>,
    pub battery_percent: Option<u8>,
    pub battery_charging: bool,
    pub net_down_kbps: f64,
    pub net_up_kbps: f64,
    pub disks: Vec<DiskInfo>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OsCompatibility {
    pub is_windows_11: bool,
    pub build_number: u32,
    pub os_label: String,
    pub supports_alignment: bool,
    pub supports_position: bool,
    pub supports_icon_size: bool,
}

pub struct TelemetryCollector {
    pub system: System,
    pub networks: Networks,
    pub components: Components,
    pub disks: Disks,
    last_net_poll: Instant,
    last_gpu_poll: Instant,
    last_disk_poll: Instant,
    cached_gpu: (Option<f32>, Option<f32>, Option<String>),
    cached_disks: Vec<DiskInfo>,
}

impl TelemetryCollector {
    pub fn new() -> Self {
        let mut disks = Disks::new_with_refreshed_list();
        let cached_disks = map_disks(&mut disks);
        Self {
            system: System::new_all(),
            networks: Networks::new_with_refreshed_list(),
            components: Components::new_with_refreshed_list(),
            disks,
            last_net_poll: Instant::now(),
            last_gpu_poll: Instant::now() - std::time::Duration::from_secs(10),
            last_disk_poll: Instant::now(),
            cached_gpu: (None, None, None),
            cached_disks,
        }
    }

    pub fn collect(&mut self) -> SystemTelemetry {
        self.system.refresh_cpu_usage();
        self.system.refresh_memory();
        self.components.refresh();
        self.networks.refresh();

        let cpu = (self.system.global_cpu_usage() * 10.0).round() / 10.0;
        let total = self.system.total_memory() as f64 / 1_073_741_824.0;
        let used = self.system.used_memory() as f64 / 1_073_741_824.0;
        let ram_pct = if total > 0.0 {
            (((used / total) * 100.0) * 10.0).round() as f32 / 10.0
        } else { 0.0 };

        let elapsed = self.last_net_poll.elapsed().as_secs_f64().max(0.2);
        self.last_net_poll = Instant::now();
        let mut rx_bytes: u64 = 0;
        let mut tx_bytes: u64 = 0;
        for (_name, data) in self.networks.iter() {
            rx_bytes += data.received();
            tx_bytes += data.transmitted();
        }
        let net_down_kbps = ((rx_bytes as f64 / 1024.0) / elapsed * 10.0).round() / 10.0;
        let net_up_kbps = ((tx_bytes as f64 / 1024.0) / elapsed * 10.0).round() / 10.0;

        if self.last_gpu_poll.elapsed().as_secs() >= 3 {
            self.last_gpu_poll = Instant::now();
            self.cached_gpu = query_nvidia_gpu();
        }

        if self.last_disk_poll.elapsed().as_secs() >= 10 {
            self.last_disk_poll = Instant::now();
            self.cached_disks = map_disks(&mut self.disks);
        }

        let mut max_temp: Option<f32> = None;
        for comp in self.components.iter() {
            let t = comp.temperature();
            if t.is_finite() && t > 1.0 && t < 130.0 {
                max_temp = Some(max_temp.map_or(t, |cur| cur.max(t)));
            }
        }
        let temperature_c = max_temp.or(self.cached_gpu.1).map(|t| (t * 10.0).round() / 10.0);
        let (battery_percent, battery_charging) = read_battery_status();

        SystemTelemetry {
            cpu_percent: cpu,
            ram_used_gb: (used * 10.0).round() / 10.0,
            ram_total_gb: (total * 10.0).round() / 10.0,
            ram_percent: ram_pct,
            gpu_percent: self.cached_gpu.0,
            gpu_name: self.cached_gpu.2.clone(),
            temperature_c,
            battery_percent,
            battery_charging,
            net_down_kbps,
            net_up_kbps,
            disks: self.cached_disks.clone(),
        }
    }
}

fn map_disks(disks: &mut Disks) -> Vec<DiskInfo> {
    disks.refresh_list();
    disks.refresh();
    disks.iter().map(|d| {
        let total = d.total_space() as f64 / 1_073_741_824.0;
        let free = d.available_space() as f64 / 1_073_741_824.0;
        let used = (total - free).max(0.0);
        let pct = if total > 0.0 { ((used / total) * 100.0) as f32 } else { 0.0 };
        let mount = d.mount_point().to_string_lossy().to_string();
        let name = d.name().to_string_lossy().to_string();
        DiskInfo {
            name: if name.is_empty() { mount.clone() } else { name },
            mount_point: mount,
            kind: format!("{:?}", d.kind()),
            total_gb: (total * 10.0).round() / 10.0,
            free_gb: (free * 10.0).round() / 10.0,
            used_gb: (used * 10.0).round() / 10.0,
            used_percent: (pct * 10.0).round() / 10.0,
        }
    }).collect()
}

#[cfg(windows)]
fn query_nvidia_gpu() -> (Option<f32>, Option<f32>, Option<String>) {
    use std::os::windows::process::CommandExt;
    use std::process::Command;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let output = Command::new("nvidia-smi")
        .args(["--query-gpu=utilization.gpu,temperature.gpu,name", "--format=csv,noheader,nounits"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    if let Ok(out) = output {
        if out.status.success() {
            let text = String::from_utf8_lossy(&out.stdout);
            if let Some(line) = text.lines().next() {
                let parts: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
                if parts.len() >= 3 {
                    return (parts[0].parse().ok(), parts[1].parse().ok(), Some(parts[2].to_string()));
                }
            }
        }
    }
    (None, None, None)
}
#[cfg(not(windows))]
fn query_nvidia_gpu() -> (Option<f32>, Option<f32>, Option<String>) { (None, None, None) }

#[cfg(windows)]
fn read_battery_status() -> (Option<u8>, bool) {
    #[repr(C)]
    struct SystemPowerStatus {
        ac_line_status: u8, battery_flag: u8, battery_life_percent: u8,
        system_status_flag: u8, battery_life_time: u32, battery_full_life_time: u32,
    }
    #[link(name = "kernel32")]
    extern "system" { fn GetSystemPowerStatus(lp: *mut SystemPowerStatus) -> i32; }
    let mut s = SystemPowerStatus { ac_line_status: 0, battery_flag: 0, battery_life_percent: 255, system_status_flag: 0, battery_life_time: 0, battery_full_life_time: 0 };
    unsafe {
        if GetSystemPowerStatus(&mut s) != 0 {
            if s.battery_flag & 128 != 0 || s.battery_life_percent > 100 { return (None, s.ac_line_status == 1); }
            return (Some(s.battery_life_percent), s.ac_line_status == 1 || (s.battery_flag & 8 != 0));
        }
    }
    (None, false)
}
#[cfg(not(windows))]
fn read_battery_status() -> (Option<u8>, bool) { (None, false) }

#[cfg(windows)]
pub fn detect_os_compatibility() -> OsCompatibility {
    use winreg::enums::HKEY_LOCAL_MACHINE;
    use winreg::RegKey;
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let build: u32 = hklm.open_subkey("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion")
        .and_then(|k| k.get_value::<String, _>("CurrentBuildNumber"))
        .ok().and_then(|s| s.parse().ok()).unwrap_or(19045);
    let is_win11 = build >= 22000;
    OsCompatibility {
        is_windows_11: is_win11, build_number: build,
        os_label: if is_win11 { format!("Windows 11 (Build {})", build) } else { format!("Windows 10 (Build {})", build) },
        supports_alignment: is_win11, supports_position: !is_win11, supports_icon_size: !is_win11,
    }
}
#[cfg(not(windows))]
pub fn detect_os_compatibility() -> OsCompatibility {
    OsCompatibility { is_windows_11: true, build_number: 22631, os_label: "Windows 11".into(), supports_alignment: true, supports_position: false, supports_icon_size: false }
}