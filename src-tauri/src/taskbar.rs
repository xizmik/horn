use crate::config::{horn_data_dir, TaskbarSettings};
use crate::system_info::detect_os_compatibility;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TaskbarBackup {
    taskbar_al: Option<u32>,
    taskbar_small_icons: Option<u32>,
    searchbox_mode: Option<u32>,
    show_task_view: Option<u32>,
    taskbar_da: Option<u32>,
}

fn backup_path() -> PathBuf {
    let dir = horn_data_dir().join("backups");
    let _ = fs::create_dir_all(&dir);
    dir.join("taskbar_backup.json")
}

#[cfg(windows)]
fn ensure_backup_exists() {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    let path = backup_path();
    if path.exists() {
        return;
    }

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let adv = hkcu.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced");
    let search = hkcu.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Search");

    let backup = TaskbarBackup {
        taskbar_al: adv.as_ref().ok().and_then(|k| k.get_value("TaskbarAl").ok()),
        taskbar_small_icons: adv.as_ref().ok().and_then(|k| k.get_value("TaskbarSmallIcons").ok()),
        show_task_view: adv.as_ref().ok().and_then(|k| k.get_value("ShowTaskViewButton").ok()),
        taskbar_da: adv.as_ref().ok().and_then(|k| k.get_value("TaskbarDa").ok()),
        searchbox_mode: search.as_ref().ok().and_then(|k| k.get_value("SearchboxTaskbarMode").ok()),
    };

    if let Ok(json) = serde_json::to_string_pretty(&backup) {
        let _ = fs::write(path, json);
    }
}

#[cfg(windows)]
fn parse_abgr(hex: &str, alpha: u8) -> u32 {
    let clean = hex.trim_start_matches('#');
    if clean.len() == 6 {
        let r = u8::from_str_radix(&clean[0..2], 16).unwrap_or(13) as u32;
        let g = u8::from_str_radix(&clean[2..4], 16).unwrap_or(15) as u32;
        let b = u8::from_str_radix(&clean[4..6], 16).unwrap_or(20) as u32;
        ((alpha as u32) << 24) | (b << 16) | (g << 8) | r
    } else {
        ((alpha as u32) << 24) | 0x00140f0d
    }
}

#[cfg(windows)]
fn apply_dwm_composition(effect: &str, color_hex: &str, opacity: u8) -> Result<(), String> {
    use std::ffi::c_void;

    #[repr(C)]
    struct AccentPolicy {
        accent_state: u32,
        accent_flags: u32,
        gradient_color: u32,
        animation_id: u32,
    }

    #[repr(C)]
    struct WindowCompositionAttribData {
        attrib: u32,
        pv_data: *mut c_void,
        cb_data: usize,
    }

    type SetWcaFn = unsafe extern "system" fn(*mut c_void, *mut WindowCompositionAttribData) -> i32;

    #[link(name = "user32")]
    extern "system" {
        fn FindWindowW(class_name: *const u16, window_name: *const u16) -> *mut c_void;
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn GetModuleHandleA(module_name: *const u8) -> *mut c_void;
        fn GetProcAddress(module: *mut c_void, proc_name: *const u8) -> *mut c_void;
    }

    let class_name: Vec<u16> = "Shell_TrayWnd\0".encode_utf16().collect();
    unsafe {
        let hwnd = FindWindowW(class_name.as_ptr(), std::ptr::null());
        if hwnd.is_null() {
            return Err("Shell_TrayWnd not found".into());
        }

        let user32 = GetModuleHandleA(b"user32.dll\0".as_ptr());
        let proc = GetProcAddress(user32, b"SetWindowCompositionAttribute\0".as_ptr());
        if proc.is_null() {
            return Err("SetWindowCompositionAttribute unavailable".into());
        }

        let set_wca: SetWcaFn = std::mem::transmute(proc);
        let (state, color) = match effect {
            "transparent" => (2u32, parse_abgr(color_hex, opacity.min(40))),
            "blur" => (3u32, parse_abgr(color_hex, opacity)),
            "acrylic" => (4u32, parse_abgr(color_hex, opacity.max(20))),
            _ => (0u32, 0u32),
        };

        let mut policy = AccentPolicy {
            accent_state: state,
            accent_flags: if state == 0 { 0 } else { 2 },
            gradient_color: color,
            animation_id: 0,
        };

        let mut data = WindowCompositionAttribData {
            attrib: 19,
            pv_data: (&mut policy as *mut AccentPolicy) as *mut c_void,
            cb_data: std::mem::size_of::<AccentPolicy>(),
        };

        set_wca(hwnd, &mut data);
    }
    Ok(())
}

#[cfg(windows)]
pub fn apply_taskbar(settings: &TaskbarSettings) -> Result<String, String> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    ensure_backup_exists();
    let compat = detect_os_compatibility();

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok((adv, _)) = hkcu.create_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced") {
        if compat.supports_alignment {
            let align_val: u32 = if settings.alignment == "left" { 0 } else { 1 };
            let _ = adv.set_value("TaskbarAl", &align_val);
        }
        if compat.supports_icon_size {
            let small_val: u32 = if settings.icon_size == "small" { 1 } else { 0 };
            let _ = adv.set_value("TaskbarSmallIcons", &small_val);
        }
        let tv_val: u32 = if settings.show_task_view { 1 } else { 0 };
        let _ = adv.set_value("ShowTaskViewButton", &tv_val);

        let widgets_val: u32 = if settings.show_widgets { 1 } else { 0 };
        let _ = adv.set_value("TaskbarDa", &widgets_val);
    }

    if let Ok((search, _)) = hkcu.create_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Search") {
        let s_val: u32 = if settings.show_search { 1 } else { 0 };
        let _ = search.set_value("SearchboxTaskbarMode", &s_val);
    }

    apply_dwm_composition(&settings.effect, &settings.color_hex, settings.opacity)?;
    Ok("Taskbar updated".into())
}

#[cfg(windows)]
pub fn restore_taskbar() -> Result<String, String> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    let _ = apply_dwm_composition("normal", "#000000", 0);

    let path = backup_path();
    if let Ok(raw) = fs::read_to_string(&path) {
        if let Ok(backup) = serde_json::from_str::<TaskbarBackup>(&raw) {
            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            if let Ok((adv, _)) = hkcu.create_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced") {
                if let Some(v) = backup.taskbar_al { let _ = adv.set_value("TaskbarAl", &v); }
                if let Some(v) = backup.taskbar_small_icons { let _ = adv.set_value("TaskbarSmallIcons", &v); }
                if let Some(v) = backup.show_task_view { let _ = adv.set_value("ShowTaskViewButton", &v); }
                if let Some(v) = backup.taskbar_da { let _ = adv.set_value("TaskbarDa", &v); }
            }
            if let Ok((search, _)) = hkcu.create_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Search") {
                if let Some(v) = backup.searchbox_mode { let _ = search.set_value("SearchboxTaskbarMode", &v); }
            }
        }
    }
    Ok("Taskbar restored".into())
}

#[cfg(not(windows))]
pub fn apply_taskbar(_settings: &TaskbarSettings) -> Result<String, String> { Ok("OK".into()) }

#[cfg(not(windows))]
pub fn restore_taskbar() -> Result<String, String> { Ok("OK".into()) }