use crate::config::horn_data_dir;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopShortcut {
    pub name: String,
    pub path: String,
    pub original_icon: String,
    pub has_backup: bool,
}

fn icons_dir() -> PathBuf {
    let dir = horn_data_dir().join("icons");
    let _ = fs::create_dir_all(&dir);
    dir
}

fn backup_file() -> PathBuf {
    let dir = horn_data_dir().join("backups");
    let _ = fs::create_dir_all(&dir);
    dir.join("icons_backup.json")
}

fn load_backups() -> HashMap<String, String> {
    fs::read_to_string(backup_file())
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_backups(map: &HashMap<String, String>) -> Result<(), String> {
    let json = serde_json::to_string_pretty(map).map_err(|e| e.to_string())?;
    fs::write(backup_file(), json).map_err(|e| e.to_string())
}

pub fn wrap_png_as_ico(png_bytes: &[u8]) -> Vec<u8> {
    let size = png_bytes.len() as u32;
    let mut ico = Vec::with_capacity(22 + png_bytes.len());
    ico.extend_from_slice(&[0, 0, 1, 0, 1, 0]);
    ico.extend_from_slice(&[0, 0, 0, 0]);
    ico.extend_from_slice(&1u16.to_le_bytes());
    ico.extend_from_slice(&32u16.to_le_bytes());
    ico.extend_from_slice(&size.to_le_bytes());
    ico.extend_from_slice(&22u32.to_le_bytes());
    ico.extend_from_slice(png_bytes);
    ico
}

pub fn list_desktop_shortcuts() -> Vec<DesktopShortcut> {
    let backups = load_backups();
    let mut result = Vec::new();
    if let Some(desktop) = dirs::desktop_dir() {
        if let Ok(entries) = fs::read_dir(desktop) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()).map(|s| s.eq_ignore_ascii_case("lnk")).unwrap_or(false) {
                    let path_str = path.to_string_lossy().to_string();
                    let name = path.file_stem().and_then(|s| s.to_str()).unwrap_or("Shortcut").to_string();
                    let has_backup = backups.contains_key(&path_str);
                    let orig = backups.get(&path_str).cloned().unwrap_or_default();
                    result.push(DesktopShortcut { name, path: path_str, original_icon: orig, has_backup });
                }
            }
        }
    }
    result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    result
}

pub fn pick_shortcut_file() -> Option<String> {
    rfd::FileDialog::new()
        .set_title("Select Windows Shortcut (.lnk)")
        .add_filter("Shortcut", &["lnk"])
        .pick_file()
        .map(|p| p.to_string_lossy().to_string())
}

#[cfg(windows)]
fn notify_shell_icons_changed() {
    use std::ffi::c_void;
    #[link(name = "shell32")]
    extern "system" {
        fn SHChangeNotify(w_event_id: i32, u_flags: u32, dw_item1: *const c_void, dw_item2: *const c_void);
    }
    unsafe { SHChangeNotify(0x0800_0000, 0x0000, std::ptr::null(), std::ptr::null()); }
}

#[cfg(windows)]
fn run_ps(script: &str) -> Result<String, String> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let out = Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

#[cfg(windows)]
pub fn apply_png_icon_to_shortcut(shortcut_path: &str, png_base64: &str) -> Result<String, String> {
    if !Path::new(shortcut_path).exists() {
        return Err("Shortcut not found".into());
    }

    let clean_b64 = png_base64.split(',').last().unwrap_or(png_base64);
    let png_bytes = STANDARD.decode(clean_b64).map_err(|e| e.to_string())?;
    let ico_bytes = wrap_png_as_ico(&png_bytes);

    let stem = Path::new(shortcut_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("icon")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
        .collect::<String>();

    let ico_path = icons_dir().join(format!("horn_{}.ico", stem));
    fs::write(&ico_path, ico_bytes).map_err(|e| e.to_string())?;

    let mut backups = load_backups();
    if !backups.contains_key(shortcut_path) {
        let escaped = shortcut_path.replace('\'', "''");
        let read_cmd = format!(
            "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('{}'); Write-Output $s.IconLocation",
            escaped
        );
        if let Ok(orig) = run_ps(&read_cmd) {
            backups.insert(shortcut_path.to_string(), orig);
            let _ = save_backups(&backups);
        }
    }

    let escaped_lnk = shortcut_path.replace('\'', "''");
    let escaped_ico = ico_path.to_string_lossy().replace('\'', "''");
    let apply_cmd = format!(
        "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('{}'); $s.IconLocation = '{},0'; $s.Save()",
        escaped_lnk, escaped_ico
    );
    run_ps(&apply_cmd)?;
    notify_shell_icons_changed();
    Ok(format!("Applied to {}", stem))
}

#[cfg(windows)]
pub fn restore_shortcut_icon(shortcut_path: &str) -> Result<String, String> {
    let mut backups = load_backups();
    let orig = backups.remove(shortcut_path).ok_or_else(|| "No backup for this shortcut".to_string())?;

    let escaped_lnk = shortcut_path.replace('\'', "''");
    let escaped_orig = orig.replace('\'', "''");
    let cmd = format!(
        "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('{}'); $s.IconLocation = '{}'; $s.Save()",
        escaped_lnk, escaped_orig
    );
    run_ps(&cmd)?;
    let _ = save_backups(&backups);
    notify_shell_icons_changed();
    Ok("Restored".into())
}

#[cfg(windows)]
pub fn restore_all_icons() -> Result<String, String> {
    let backups = load_backups();
    if backups.is_empty() { return Ok("Nothing to restore".into()); }
    let mut count = 0usize;
    for (lnk, _) in backups {
        if restore_shortcut_icon(&lnk).is_ok() { count += 1; }
    }
    Ok(format!("Restored: {}", count))
}

#[cfg(not(windows))]
pub fn apply_png_icon_to_shortcut(_s: &str, _p: &str) -> Result<String, String> { Ok("OK".into()) }
#[cfg(not(windows))]
pub fn restore_shortcut_icon(_s: &str) -> Result<String, String> { Ok("OK".into()) }
#[cfg(not(windows))]
pub fn restore_all_icons() -> Result<String, String> { Ok("OK".into()) }