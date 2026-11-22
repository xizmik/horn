#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod autostart;
mod commands;
mod config;
mod icons;
mod island;
mod system_info;
mod taskbar;
mod wallpaper;

use commands::AppState;
use config::load_settings;
use island::{apply_island_window_layout, start_cursor_hit_tracker, IslandRuntime};
use std::sync::{Arc, Mutex};
use system_info::TelemetryCollector;
use wallpaper::start_slideshow_worker;

fn main() {
    let initial_settings = load_settings();
    let settings_arc = Arc::new(Mutex::new(initial_settings.clone()));
    let island_runtime = IslandRuntime::new();
    let hitbox_arc = island_runtime.hitbox.clone();

    start_slideshow_worker(settings_arc.clone());

    tauri::Builder::default()
        .manage(AppState {
            settings: settings_arc,
            telemetry: Mutex::new(TelemetryCollector::new()),
        })
        .manage(island_runtime)
        .setup(move |app| {
            let handle = app.handle().clone();
            apply_island_window_layout(&handle, &initial_settings.island);
            start_cursor_hit_tracker(handle, hitbox_arc);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::save_settings,
            commands::update_island_hitbox,
            commands::trigger_island_event,
            commands::get_system_telemetry,
            commands::get_os_compatibility,
            commands::apply_taskbar_settings,
            commands::restore_taskbar_defaults,
            commands::pick_wallpapers,
            commands::read_image_data_url,
            commands::apply_wallpaper_now,
            commands::get_desktop_shortcuts,
            commands::browse_shortcut_file,
            commands::apply_icon_to_shortcut,
            commands::restore_icon_for_shortcut,
            commands::restore_all_shortcut_icons,
            commands::get_config_file_path,
            commands::show_main_window,
            commands::hide_main_window,
            commands::quit_app
        ])
        .run(tauri::generate_context!())
        .expect("Failed to run HORN v0.2");
}