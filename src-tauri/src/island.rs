use crate::config::IslandSettings;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager, PhysicalPosition};

#[derive(Debug, Clone, Copy)]
pub struct Hitbox {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

impl Default for Hitbox {
    fn default() -> Self {
        Self {
            x: 130.0,
            y: 6.0,
            width: 220.0,
            height: 44.0,
        }
    }
}

pub struct IslandRuntime {
    pub hitbox: Arc<Mutex<Hitbox>>,
}

impl IslandRuntime {
    pub fn new() -> Self {
        Self {
            hitbox: Arc::new(Mutex::new(Hitbox::default())),
        }
    }
}

pub fn apply_island_window_layout(app: &AppHandle, settings: &IslandSettings) {
    let Some(window) = app.get_webview_window("island") else {
        return;
    };

    if settings.enabled {
        let _ = window.show();
    } else {
        let _ = window.hide();
        return;
    }

    if let Ok(Some(monitor)) = window.current_monitor() {
        let mon_size = monitor.size();
        let mon_pos = monitor.position();
        let scale = monitor.scale_factor();

        let win_width_phys = (480.0 * scale) as i32;
        let center_x = mon_pos.x + (mon_size.width as i32 - win_width_phys) / 2
            + (settings.offset_x as f64 * scale) as i32;
        let top_y = mon_pos.y + (settings.offset_y as f64 * scale) as i32;

        let _ = window.set_position(PhysicalPosition::new(center_x, top_y));
    }
}

pub fn start_cursor_hit_tracker(app: AppHandle, hitbox_ref: Arc<Mutex<Hitbox>>) {
    thread::spawn(move || {
        let mut ignoring = false;
        loop {
            thread::sleep(Duration::from_millis(25));

            let Some(window) = app.get_webview_window("island") else {
                continue;
            };
            if !window.is_visible().unwrap_or(false) {
                continue;
            }

            let Ok(cursor) = window.cursor_position() else { continue };
            let Ok(win_pos) = window.outer_position() else { continue };
            let Ok(scale) = window.scale_factor() else { continue };

            let local_x = (cursor.x - win_pos.x as f64) / scale;
            let local_y = (cursor.y - win_pos.y as f64) / scale;

            let pad = 8.0;
            let inside = if let Ok(hb) = hitbox_ref.lock() {
                local_x >= (hb.x - pad)
                    && local_x <= (hb.x + hb.width + pad)
                    && local_y >= (hb.y - pad)
                    && local_y <= (hb.y + hb.height + pad)
            } else {
                false
            };

            let should_ignore = !inside;
            if should_ignore != ignoring {
                if window.set_ignore_cursor_events(should_ignore).is_ok() {
                    ignoring = should_ignore;
                }
            }
        }
    });
}