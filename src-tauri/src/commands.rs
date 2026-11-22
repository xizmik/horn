use crate::autostart::set_autostart;
use crate::config::{config_path, persist_settings, HornSettings, TaskbarSettings};
use crate::icons::{
    apply_png_icon_to_shortcut, list_desktop_shortcuts, pick_shortcut_file, restore_all_icons,
    restore_shortcut_icon, DesktopShortcut,
};
use crate::island::{apply_island_window_layout, Hitbox, IslandRuntime};
use crate::system_info::{detect_os_compatibility, OsCompatibility, SystemTelemetry, TelemetryCollector};
use crate::taskbar::{apply_taskbar, restore_taskbar};
use crate::wallpaper::{pick_image_files, read_file_as_data_url, set_desktop_wallpaper};
use serde::Serialize;
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
    pub title: String,
    pub subtitle: String,
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
pub fn trigger_island_event(app: AppHandle, event_type: String, title: String, subtitle: String) -> Result<(), String> {
    app.emit_to("island", "island-event", IslandEventPayload { event_type, title, subtitle })
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
        },
    }
}

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
pub fn get_desktop_shortcuts() -> Vec<DesktopShortcut> { list_desktop_shortcuts() }

#[tauri::command]
pub fn browse_shortcut_file() -> Option<String> { pick_shortcut_file() }

#[tauri::command]
pub fn apply_icon_to_shortcut(shortcut_path: String, png_base64: String) -> Result<String, String> {
    apply_png_icon_to_shortcut(&shortcut_path, &png_base64)
}

#[tauri::command]
pub fn restore_icon_for_shortcut(shortcut_path: String) -> Result<String, String> {
    restore_shortcut_icon(&shortcut_path)
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
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }
}

#[tauri::command]
pub fn quit_app(app: AppHandle) { app.exit(0); }