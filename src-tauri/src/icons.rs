use crate::config::horn_data_dir;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IconTarget {
    pub id: String,
    pub name: String,
    pub path: String,
    pub category: String, // "desktop" | "apps" | "folders" | "shortcuts"
    pub target_kind: String, // "lnk" | "folder"
    pub has_backup: bool,
}

fn icons_dir() -> PathBuf {
    let dir = horn_data_dir().join("icons");
    let _ = fs::create_dir_all(&dir);
    dir
}

fn lnk_backup_file() -> PathBuf {
    let dir = horn_data_dir().join("backups");
    let _ = fs::create_dir_all(&dir);
    dir.join("icons_backup.json")
}

fn folder_backup_file() -> PathBuf {
    let dir = horn_data_dir().join("backups");
    let _ = fs::create_dir_all(&dir);
    dir.join("folders_backup.json")
}

fn load_map(path: PathBuf) -> HashMap<String, String> {
    fs::read_to_string(path).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}

fn save_map(path: PathBuf, map: &HashMap<String, String>) -> Result<(), String> {
    let json = serde_json::to_string_pretty(map).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

pub fn wrap_png_as_ico(png_bytes: &[u8]) -> Vec<u8> {
    let size = png_bytes.len() as u32;
    let mut ico = Vec::with_capacity(22 + png_bytes.len());
    ico.extend_from_slice(&[0, 0, 1, 0, 1, 0, 0, 0, 0, 0]);
    ico.extend_from_slice(&1u16.to_le_bytes());
    ico.extend_from_slice(&32u16.to_le_bytes());
    ico.extend_from_slice(&size.to_le_bytes());
    ico.extend_from_slice(&22u32.to_le_bytes());
    ico.extend_from_slice(png_bytes);
    ico
}

pub fn list_categorized_targets() -> Vec<IconTarget> {
    let lnk_backups = load_map(lnk_backup_file());
    let folder_backups = load_map(folder_backup_file());
    let mut result = Vec::new();
    let mut idx = 0usize;

    // 1. Desktop shortcuts (.lnk) and Desktop folders
    if let Some(desktop) = dirs::desktop_dir() {
        if let Ok(entries) = fs::read_dir(desktop) {
            for entry in entries.flatten() {
                let path = entry.path();
                let path_str = path.to_string_lossy().to_string();
                if path.is_dir() {
                    let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("Folder").to_string();
                    if name.starts_with('.') { continue; }
                    idx += 1;
                    result.push(IconTarget {
                        id: format!("t_{}", idx),
                        name,
                        path: path_str.clone(),
                        category: "folders".into(),
                        target_kind: "folder".into(),
                        has_backup: folder_backups.contains_key(&path_str),
                    });
                } else if path.extension().and_then(|e| e.to_str()).map(|s| s.eq_ignore_ascii_case("lnk")).unwrap_or(false) {
                    let name = path.file_stem().and_then(|s| s.to_str()).unwrap_or("Shortcut").to_string();
                    idx += 1;
                    result.push(IconTarget {
                        id: format!("t_{}", idx),
                        name,
                        path: path_str.clone(),
                        category: "desktop".into(),
                        target_kind: "lnk".into(),
                        has_backup: lnk_backups.contains_key(&path_str),
                    });
                }
            }
        }
    }

    // 2. User Start Menu applications (.lnk)
    if let Some(roaming) = dirs::config_dir() {
        let start_programs = roaming.join("Microsoft\\Windows\\Start Menu\\Programs");
        if let Ok(entries) = fs::read_dir(start_programs) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()).map(|s| s.eq_ignore_ascii_case("lnk")).unwrap_or(false) {
                    let path_str = path.to_string_lossy().to_string();
                    let name = path.file_stem().and_then(|s| s.to_str()).unwrap_or("App").to_string();
                    idx += 1;
                    result.push(IconTarget {
                        id: format!("t_{}", idx),
                        name,
                        path: path_str.clone(),
                        category: "apps".into(),
                        target_kind: "lnk".into(),
                        has_backup: lnk_backups.contains_key(&path_str),
                    });
                }
            }
        }
    }

    result.sort_by(|a, b| a.category.cmp(&b.category).then(a.name.to_lowercase().cmp(&b.name.to_lowercase())));
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
    if out.status.success() { Ok(String::from_utf8_lossy(&out.stdout).trim().to_string()) }
    else { Err(String::from_utf8_lossy(&out.stderr).trim().to_string()) }
}

#[cfg(windows)]
fn save_ico_file(target_path: &str, png_base64: &str) -> Result<PathBuf, String> {
    let clean_b64 = png_base64.split(',').last().unwrap_or(png_base64);
    let png_bytes = STANDARD.decode(clean_b64).map_err(|e| e.to_string())?;
    let ico_bytes = wrap_png_as_ico(&png_bytes);

    let stem = Path::new(target_path)
        .file_stem().and_then(|s| s.to_str()).unwrap_or("icon")
        .chars().filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-').collect::<String>();
    let hash: u32 = target_path.bytes().fold(0u32, |acc, b| acc.wrapping_mul(31).wrapping_add(b as u32));
    let ico_path = icons_dir().join(format!("horn_{}_{}.ico", stem, hash));
    fs::write(&ico_path, ico_bytes).map_err(|e| e.to_string())?;
    Ok(ico_path)
}

#[cfg(windows)]
pub fn apply_icon_to_target(target_path: &str, target_kind: &str, png_base64: &str) -> Result<String, String> {
    if !Path::new(target_path).exists() {
        return Err("Target path not found".into());
    }
    let ico_path = save_ico_file(target_path, png_base64)?;

    if target_kind == "folder" {
        let ini_path = Path::new(target_path).join("desktop.ini");
        let mut backups = load_map(folder_backup_file());
        if !backups.contains_key(target_path) {
            let prev = fs::read_to_string(&ini_path).unwrap_or_else(|_| "__NONE__".into());
            backups.insert(target_path.to_string(), prev);
            let _ = save_map(folder_backup_file(), &backups);
        }
        let ini_content = format!("[.ShellClassInfo]\r\nIconResource={},0\r\n", ico_path.to_string_lossy());
        let _ = run_ps(&format!("attrib -h -s '{}'", ini_path.to_string_lossy().replace('\'', "''")));
        fs::write(&ini_path, ini_content).map_err(|e| e.to_string())?;
        let _ = run_ps(&format!(
            "attrib +h +s '{}'; attrib +r '{}'",
            ini_path.to_string_lossy().replace('\'', "''"),
            target_path.replace('\'', "''")
        ));
        notify_shell_icons_changed();
        return Ok("Folder icon applied".into());
    }

    // Default: .lnk shortcut
    let mut backups = load_map(lnk_backup_file());
    if !backups.contains_key(target_path) {
        let escaped = target_path.replace('\'', "''");
        let read_cmd = format!(
            "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('{}'); Write-Output $s.IconLocation",
            escaped
        );
        if let Ok(orig) = run_ps(&read_cmd) {
            backups.insert(target_path.to_string(), orig);
            let _ = save_map(lnk_backup_file(), &backups);
        }
    }

    let apply_cmd = format!(
        "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('{}'); $s.IconLocation = '{},0'; $s.Save()",
        target_path.replace('\'', "''"),
        ico_path.to_string_lossy().replace('\'', "''")
    );
    run_ps(&apply_cmd)?;
    notify_shell_icons_changed();
    Ok("Shortcut icon applied".into())
}

#[cfg(windows)]
pub fn restore_target_icon(target_path: &str, target_kind: &str) -> Result<String, String> {
    if target_kind == "folder" {
        let mut backups = load_map(folder_backup_file());
        let prev = backups.remove(target_path).ok_or_else(|| "No backup for folder".to_string())?;
        let ini_path = Path::new(target_path).join("desktop.ini");
        let _ = run_ps(&format!("attrib -h -s '{}'", ini_path.to_string_lossy().replace('\'', "''")));
        if prev == "__NONE__" {
            let _ = fs::remove_file(&ini_path);
            let _ = run_ps(&format!("attrib -r '{}'", target_path.replace('\'', "''")));
        } else {
            let _ = fs::write(&ini_path, prev);
            let _ = run_ps(&format!("attrib +h +s '{}'", ini_path.to_string_lossy().replace('\'', "''")));
        }
        let _ = save_map(folder_backup_file(), &backups);
        notify_shell_icons_changed();
        return Ok("Folder icon restored".into());
    }

    let mut backups = load_map(lnk_backup_file());
    let orig = backups.remove(target_path).ok_or_else(|| "No backup for shortcut".to_string())?;
    let cmd = format!(
        "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('{}'); $s.IconLocation = '{}'; $s.Save()",
        target_path.replace('\'', "''"),
        orig.replace('\'', "''")
    );
    run_ps(&cmd)?;
    let _ = save_map(lnk_backup_file(), &backups);
    notify_shell_icons_changed();
    Ok("Shortcut icon restored".into())
}

#[cfg(windows)]
pub fn restore_all_icons() -> Result<String, String> {
    let mut count = 0usize;
    for (lnk, _) in load_map(lnk_backup_file()) {
        if restore_target_icon(&lnk, "lnk").is_ok() { count += 1; }
    }
    for (folder, _) in load_map(folder_backup_file()) {
        if restore_target_icon(&folder, "folder").is_ok() { count += 1; }
    }
    Ok(format!("Восстановлено иконок: {}", count))
}

#[cfg(not(windows))]
pub fn apply_icon_to_target(_p: &str, _k: &str, _b: &str) -> Result<String, String> { Ok("OK".into()) }
#[cfg(not(windows))]
pub fn restore_target_icon(_p: &str, _k: &str) -> Result<String, String> { Ok("OK".into()) }
#[cfg(not(windows))]
pub fn restore_all_icons() -> Result<String, String> { Ok("Restored".into()) }