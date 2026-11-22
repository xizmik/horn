use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IslandModules {
    pub cpu: bool,
    pub ram: bool,
    pub gpu: bool,
    pub temperature: bool,
    pub battery: bool,
    pub network: bool,
    pub clock_calendar: bool,
    pub focus_timer: bool,
    pub notifications: bool,
}

impl Default for IslandModules {
    fn default() -> Self {
        Self {
            cpu: true,
            ram: true,
            gpu: true,
            temperature: true,
            battery: true,
            network: true,
            clock_calendar: true,
            focus_timer: true,
            notifications: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IslandSettings {
    pub enabled: bool,
    pub scale: f64,
    #[serde(default = "default_compact_w")]
    pub compact_width: u32,
    #[serde(default = "default_compact_h")]
    pub compact_height: u32,
    #[serde(default = "default_expanded_w")]
    pub expanded_width: u32,
    #[serde(default = "default_expanded_h")]
    pub expanded_height: u32,
    #[serde(default = "default_radius")]
    pub border_radius: u32,
    pub offset_x: i32,
    pub offset_y: i32,
    pub animations_enabled: bool,
    pub animation_speed: String,
    pub opacity: f64,
    pub theme: String,
    #[serde(default)]
    pub modules: IslandModules,
}

fn default_compact_w() -> u32 { 224 }
fn default_compact_h() -> u32 { 38 }
fn default_expanded_w() -> u32 { 440 }
fn default_expanded_h() -> u32 { 256 }
fn default_radius() -> u32 { 26 }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskbarSettings {
    pub preset: String,
    pub effect: String,
    pub color_hex: String,
    pub opacity: u8,
    pub alignment: String,
    pub icon_size: String,
    pub position: String,
    pub show_search: bool,
    pub show_task_view: bool,
    pub show_widgets: bool,
}

impl Default for TaskbarSettings {
    fn default() -> Self {
        Self {
            preset: "default".into(),
            effect: "normal".into(),
            color_hex: "#0d0f14".into(),
            opacity: 190,
            alignment: "center".into(),
            icon_size: "medium".into(),
            position: "bottom".into(),
            show_search: true,
            show_task_view: true,
            show_widgets: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WallpaperItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub collection: String,
    pub favorite: bool,
    pub kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WallpaperSettings {
    pub fit_mode: String,
    pub active_path: Option<String>,
    pub slideshow_enabled: bool,
    pub slideshow_interval_sec: u64,
    pub slideshow_playlist: Vec<String>,
    pub items: Vec<WallpaperItem>,
}

impl Default for WallpaperSettings {
    fn default() -> Self {
        Self {
            fit_mode: "fill".into(),
            active_path: None,
            slideshow_enabled: false,
            slideshow_interval_sec: 300,
            slideshow_playlist: Vec::new(),
            items: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AtmosphereSettings {
    pub snow: bool,
    pub rain: bool,
    pub fog: bool,
    pub particles: bool,
    pub stars: bool,
    pub ambient_light: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HornSettings {
    pub autostart: bool,
    pub island: IslandSettings,
    #[serde(default)]
    pub taskbar: TaskbarSettings,
    #[serde(default)]
    pub wallpaper: WallpaperSettings,
    pub atmosphere: AtmosphereSettings,
}

impl Default for HornSettings {
    fn default() -> Self {
        Self {
            autostart: false,
            island: IslandSettings {
                enabled: true,
                scale: 1.0,
                compact_width: 224,
                compact_height: 38,
                expanded_width: 440,
                expanded_height: 256,
                border_radius: 26,
                offset_x: 0,
                offset_y: 12,
                animations_enabled: true,
                animation_speed: "normal".into(),
                opacity: 0.96,
                theme: "obsidian".into(),
                modules: IslandModules::default(),
            },
            taskbar: TaskbarSettings::default(),
            wallpaper: WallpaperSettings::default(),
            atmosphere: AtmosphereSettings {
                snow: false,
                rain: false,
                fog: false,
                particles: false,
                stars: false,
                ambient_light: false,
            },
        }
    }
}

pub fn horn_data_dir() -> PathBuf {
    let mut base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    base.push("HORN");
    let _ = fs::create_dir_all(&base);
    base
}

pub fn config_path() -> PathBuf {
    horn_data_dir().join("settings.json")
}

pub fn load_settings() -> HornSettings {
    let path = config_path();
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => {
            let defaults = HornSettings::default();
            let _ = persist_settings(&defaults);
            defaults
        }
    }
}

pub fn persist_settings(settings: &HornSettings) -> Result<(), String> {
    let path = config_path();
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}