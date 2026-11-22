use serde::Serialize;
use std::time::Instant;
use sysinfo::{Components, Networks, System};

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
    last_net_poll: Instant,
    last_gpu_poll: Instant,
    cached_gpu: (Option<f32>, Option<f32>, Option<String>),
}

impl TelemetryCollector {
    pub fn new() -> Self {
        Self {
            system: System::new_all(),
            networks: Networks::new_with_refreshed_list(),
            components: Components::new_with_refreshed_list(),
            last_net_poll: Instant::now(),
            last_gpu_poll: Instant::now() - std::time::Duration::from_secs(10),
            cached_gpu: (None, None, None),
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
        } else {
            0.0
        };

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

        let mut max_temp: Option<f32> = None;
        for comp in self.components.iter() {
            let t = comp.temperature();
            if t.is_finite() && t > 1.0 && t < 130.0 {
                max_temp = Some(max_temp.map_or(t, |cur| cur.max(t)));
            }
        }
        let temperature_c = max_temp
            .or(self.cached_gpu.1)
            .map(|t| (t * 10.0).round() / 10.0);

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
        }
    }
}

#[cfg(windows)]
fn query_nvidia_gpu() -> (Option<f32>, Option<f32>, Option<String>) {
    use std::os::windows::process::CommandExt;
    use std::process::Command;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let output = Command::new("nvidia-smi")
        .args([
            "--query-gpu=utilization.gpu,temperature.gpu,name",
            "--format=csv,noheader,nounits",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    if let Ok(out) = output {
        if out.status.success() {
            let text = String::from_utf8_lossy(&out.stdout);
            if let Some(line) = text.lines().next() {
                let parts: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
                if parts.len() >= 3 {
                    let util = parts[0].parse::<f32>().ok();
                    let temp = parts[1].parse::<f32>().ok();
                    let name = Some(parts[2].to_string());
                    return (util, temp, name);
                }
            }
        }
    }
    (None, None, None)
}

#[cfg(not(windows))]
fn query_nvidia_gpu() -> (Option<f32>, Option<f32>, Option<String>) {
    (None, None, None)
}

#[cfg(windows)]
fn read_battery_status() -> (Option<u8>, bool) {
    #[repr(C)]
    struct SystemPowerStatus {
        ac_line_status: u8,
        battery_flag: u8,
        battery_life_percent: u8,
        system_status_flag: u8,
        battery_life_time: u32,
        battery_full_life_time: u32,
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn GetSystemPowerStatus(lp_system_power_status: *mut SystemPowerStatus) -> i32;
    }

    let mut status = SystemPowerStatus {
        ac_line_status: 0,
        battery_flag: 0,
        battery_life_percent: 255,
        system_status_flag: 0,
        battery_life_time: 0,
        battery_full_life_time: 0,
    };

    unsafe {
        if GetSystemPowerStatus(&mut status) != 0 {
            if status.battery_flag & 128 != 0 || status.battery_life_percent > 100 {
                return (None, status.ac_line_status == 1);
            }
            let charging = status.ac_line_status == 1 || (status.battery_flag & 8 != 0);
            return (Some(status.battery_life_percent), charging);
        }
    }
    (None, false)
}

#[cfg(not(windows))]
fn read_battery_status() -> (Option<u8>, bool) {
    (None, false)
}

#[cfg(windows)]
pub fn detect_os_compatibility() -> OsCompatibility {
    use winreg::enums::HKEY_LOCAL_MACHINE;
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let build: u32 = hklm
        .open_subkey("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion")
        .and_then(|k| k.get_value::<String, _>("CurrentBuildNumber"))
        .ok()
        .and_then(|s| s.parse::<u32>().ok())
        .unwrap_or(19045);

    let is_win11 = build >= 22000;
    OsCompatibility {
        is_windows_11: is_win11,
        build_number: build,
        os_label: if is_win11 {
            format!("Windows 11 (Build {})", build)
        } else {
            format!("Windows 10 (Build {})", build)
        },
        supports_alignment: is_win11,
        supports_position: !is_win11,
        supports_icon_size: !is_win11,
    }
}

#[cfg(not(windows))]
pub fn detect_os_compatibility() -> OsCompatibility {
    OsCompatibility {
        is_windows_11: true,
        build_number: 22631,
        os_label: "Windows 11".into(),
        supports_alignment: true,
        supports_position: false,
        supports_icon_size: false,
    }
}