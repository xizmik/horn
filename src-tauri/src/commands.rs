use crate::autostart::set_autostart;
use crate::config::{config_path, persist_settings, HornSettings, TaskbarSettings};
use crate::icons::{
    apply_icon_to_target, list_categorized_targets, pick_shortcut_file, restore_all_icons,
    restore_target_icon, IconTarget,
};
use crate::island::{apply_island_window_layout, Hitbox, IslandRuntime};
use crate::media::{query_media_session, send_media_key, MediaInfo};
use crate::system_info::{detect_os_compatibility, OsCompatibility, SystemTelemetry, TelemetryCollector};
use crate::taskbar::{apply_taskbar, restore_taskbar};
use crate::wallpaper::{pick_image_files, read_file_as_data_url, set_desktop_wallpaper};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Serialize;
use std::fs;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};

pub struct AppState {
    pub settings: Arc<Mutex<HornSettings>>,
    pub telemetry: Mutex<TelemetryCollector>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IslandEventPayload {
    pub event_type: String,
    pub app_name: String,
    pub title: String,
    pub subtitle: String,
}

#[tauri::command]
pub fn get_brand_logo(app: AppHandle) -> Option<String> {
    let mut candidates = Vec::new();
    if let Ok(res_dir) = app.path().resource_dir() {
        candidates.push(res_dir.join("icons").join("app-icon.png"));
        candidates.push(res_dir.join("app-icon.png"));
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join("icons").join("app-icon.png"));
            candidates.push(dir.join("app-icon.png"));
        }
    }
    candidates.push(std::path::PathBuf::from("src/assets/app-icon.png"));
    candidates.push(std::path::PathBuf::from("../src/assets/app-icon.png"));
    candidates.push(std::path::PathBuf::from("app-icon.png"));
    candidates.push(std::path::PathBuf::from("../app-icon.png"));

    for p in candidates {
        if let Ok(bytes) = fs::read(&p) {
            return Some(format!("data:image/png;base64,{}", STANDARD.encode(bytes)));
        }
    }
    None
}

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> HornSettings {
    state.settings.lock().map(|s| s.clone()).unwrap_or_default()
}

#[tauri::command]
pub fn save_settings(app: AppHandle, state: State<AppState>, settings: HornSettings) -> Result<(), String> {
    set_autostart(settings.autostart)?;
    persist_settings(&settings)?;
    if let Ok(mut guard) = state.settings.lock() {
        *guard = settings.clone();
    }
    apply_island_window_layout(&app, &settings.island);
    let _ = app.emit("settings-updated", &settings);
    Ok(())
}

#[tauri::command]
pub fn update_island_hitbox(runtime: State<IslandRuntime>, x: f64, y: f64, width: f64, height: f64) {
    if let Ok(mut hb) = runtime.hitbox.lock() {
        *hb = Hitbox { x, y, width, height };
    }
}

#[tauri::command]
pub fn trigger_island_event(
    app: AppHandle,
    event_type: String,
    app_name: Option<String>,
    title: String,
    subtitle: String,
) -> Result<(), String> {
    app.emit_to(
        "island",
        "island-event",
        IslandEventPayload {
            event_type,
            app_name: app_name.unwrap_or_else(|| "HØRN".into()),
            title,
            subtitle,
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_system_telemetry(state: State<AppState>) -> SystemTelemetry {
    match state.telemetry.lock() {
        Ok(mut collector) => collector.collect(),
        Err(_) => SystemTelemetry {
            cpu_percent: 0.0, ram_used_gb: 0.0, ram_total_gb: 0.0, ram_percent: 0.0,
            gpu_percent: None, gpu_name: None, temperature_c: None,
            battery_percent: None, battery_charging: false, net_down_kbps: 0.0, net_up_kbps: 0.0,
            disks: Vec::new(),
        },
    }
}

#[tauri::command]
pub fn get_media_info() -> MediaInfo { query_media_session() }

#[tauri::command]
pub fn media_control(action: String) -> Result<(), String> { send_media_key(&action) }

#[tauri::command]
pub fn get_os_compatibility() -> OsCompatibility { detect_os_compatibility() }

#[tauri::command]
pub fn apply_taskbar_settings(settings: TaskbarSettings) -> Result<String, String> { apply_taskbar(&settings) }

#[tauri::command]
pub fn restore_taskbar_defaults() -> Result<String, String> { restore_taskbar() }

#[tauri::command]
pub fn pick_wallpapers() -> Vec<String> { pick_image_files() }

#[tauri::command]
pub fn read_image_data_url(path: String) -> Result<String, String> { read_file_as_data_url(&path) }

#[tauri::command]
pub fn apply_wallpaper_now(path: String, fit_mode: String) -> Result<(), String> { set_desktop_wallpaper(&path, &fit_mode) }

#[tauri::command]
pub fn get_icon_targets() -> Vec<IconTarget> { list_categorized_targets() }

#[tauri::command]
pub fn browse_shortcut_file() -> Option<String> { pick_shortcut_file() }

#[tauri::command]
pub fn apply_icon_to_target_cmd(target_path: String, target_kind: String, png_base64: String) -> Result<String, String> {
    apply_icon_to_target(&target_path, &target_kind, &png_base64)
}

#[tauri::command]
pub fn restore_target_icon_cmd(target_path: String, target_kind: String) -> Result<String, String> {
    restore_target_icon(&target_path, &target_kind)
}

#[tauri::command]
pub fn restore_all_shortcut_icons() -> Result<String, String> { restore_all_icons() }

#[tauri::command]
pub fn get_config_file_path() -> String { config_path().to_string_lossy().to_string() }

#[tauri::command]
pub fn show_main_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

#[tauri::command]
pub fn hide_main_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") { let _ = win.hide(); }
}

#[tauri::command]
pub fn quit_app(app: AppHandle) { app.exit(0); }