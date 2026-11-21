use crate::autostart::set_autostart;
use crate::config::{config_path, persist_settings, HornSettings};
use crate::island::{apply_island_window_layout, Hitbox, IslandRuntime};
use serde::Serialize;
use std::sync::Mutex;
use sysinfo::System;
use tauri::{AppHandle, Emitter, Manager, State};

pub struct AppState {
    pub settings: Mutex<HornSettings>,
    pub system: Mutex<System>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemStats {
    pub cpu_percent: f32,
    pub ram_used_gb: f64,
    pub ram_total_gb: f64,
    pub ram_percent: f32,
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
pub fn save_settings(
    app: AppHandle,
    state: State<AppState>,
    settings: HornSettings,
) -> Result<(), String> {
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
pub fn update_island_hitbox(
    runtime: State<IslandRuntime>,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) {
    if let Ok(mut hb) = runtime.hitbox.lock() {
        *hb = Hitbox { x, y, width, height };
    }
}

#[tauri::command]
pub fn trigger_island_event(
    app: AppHandle,
    event_type: String,
    title: String,
    subtitle: String,
) -> Result<(), String> {
    let payload = IslandEventPayload {
        event_type,
        title,
        subtitle,
    };
    app.emit_to("island", "island-event", payload)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_system_stats(state: State<AppState>) -> SystemStats {
    let Ok(mut sys) = state.system.lock() else {
        return SystemStats {
            cpu_percent: 0.0,
            ram_used_gb: 0.0,
            ram_total_gb: 0.0,
            ram_percent: 0.0,
        };
    };

    sys.refresh_cpu_usage();
    sys.refresh_memory();

    let cpu = sys.global_cpu_usage();
    let total = sys.total_memory() as f64 / 1_073_741_824.0;
    let used = sys.used_memory() as f64 / 1_073_741_824.0;
    let pct = if total > 0.0 {
        ((used / total) * 100.0) as f32
    } else {
        0.0
    };

    SystemStats {
        cpu_percent: (cpu * 10.0).round() / 10.0,
        ram_used_gb: (used * 10.0).round() / 10.0,
        ram_total_gb: (total * 10.0).round() / 10.0,
        ram_percent: (pct * 10.0).round() / 10.0,
    }
}

#[tauri::command]
pub fn get_config_file_path() -> String {
    config_path().to_string_lossy().to_string()
}

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
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}