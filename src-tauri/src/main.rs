#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod autostart;
mod commands;
mod config;
mod island;

use commands::AppState;
use config::load_settings;
use island::{apply_island_window_layout, start_cursor_hit_tracker, IslandRuntime};
use std::sync::Mutex;
use sysinfo::System;

fn main() {
    let initial_settings = load_settings();
    let island_runtime = IslandRuntime::new();
    let hitbox_arc = island_runtime.hitbox.clone();

    tauri::Builder::default()
        .manage(AppState {
            settings: Mutex::new(initial_settings.clone()),
            system: Mutex::new(System::new_all()),
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
            commands::get_system_stats,
            commands::get_config_file_path,
            commands::show_main_window,
            commands::hide_main_window,
            commands::quit_app
        ])
        .run(tauri::generate_context!())
        .expect("Failed to run HØRN application");
}