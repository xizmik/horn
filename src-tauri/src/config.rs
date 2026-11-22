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
            cpu: true, ram: true, gpu: true, temperature: true, battery: true,
            network: true, clock_calendar: true, focus_timer: true, notifications: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomWidget {
    pub id: String,
    pub widget_type: String, // "cpu"|"ram"|"gpu"|"temp"|"battery"|"network"|"weather"|"clock"|"music"|"storage"|"focus"|"notifications"
    pub span: u8,            // 1 | 2 | 3
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomPreset {
    pub id: String,
    pub name: String,
    pub widgets: Vec<CustomWidget>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub time: String,
    pub date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WeatherConfig {
    pub city: String,
    pub lat: f64,
    pub lon: f64,
    pub refresh_minutes: u32,
}

impl Default for WeatherConfig {
    fn default() -> Self {
        Self {
            city: "Kyiv".into(),
            lat: 50.4501,
            lon: 30.5234,
            refresh_minutes: 15,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IslandSettings {
    pub enabled: bool,
    pub scale: f64,
    #[serde(default = "default_mode")]
    pub active_mode: String, // "system"|"notifications"|"weather"|"calendar"|"network"|"music"|"storage"|"focus"|"custom"
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
    #[serde(default = "default_focus_min")]
    pub focus_minutes: u32,
    #[serde(default)]
    pub weather: WeatherConfig,
    #[serde(default)]
    pub calendar_events: Vec<CalendarEvent>,
    #[serde(default = "default_custom_widgets")]
    pub custom_widgets: Vec<CustomWidget>,
    #[serde(default)]
    pub custom_presets: Vec<CustomPreset>,
}

fn default_mode() -> String { "system".into() }
fn default_compact_w() -> u32 { 236 }
fn default_compact_h() -> u32 { 38 }
fn default_expanded_w() -> u32 { 460 }
fn default_expanded_h() -> u32 { 276 }
fn default_radius() -> u32 { 26 }
fn default_focus_min() -> u32 { 25 }
fn default_custom_widgets() -> Vec<CustomWidget> {
    vec![
        CustomWidget { id: "w1".into(), widget_type: "cpu".into(), span: 1 },
        CustomWidget { id: "w2".into(), widget_type: "ram".into(), span: 1 },
        CustomWidget { id: "w3".into(), widget_type: "weather".into(), span: 1 },
        CustomWidget { id: "w4".into(), widget_type: "music".into(), span: 3 },
    ]
}

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
            preset: "default".into(), effect: "normal".into(), color_hex: "#0d0f14".into(),
            opacity: 190, alignment: "center".into(), icon_size: "medium".into(),
            position: "bottom".into(), show_search: true, show_task_view: true, show_widgets: false,
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
            fit_mode: "fill".into(), active_path: None, slideshow_enabled: false,
            slideshow_interval_sec: 300, slideshow_playlist: Vec::new(), items: Vec::new(),
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
                enabled: true, scale: 1.0, active_mode: default_mode(),
                compact_width: default_compact_w(), compact_height: default_compact_h(),
                expanded_width: default_expanded_w(), expanded_height: default_expanded_h(),
                border_radius: default_radius(), offset_x: 0, offset_y: 12,
                animations_enabled: true, animation_speed: "normal".into(),
                opacity: 0.96, theme: "obsidian".into(), modules: IslandModules::default(),
                focus_minutes: default_focus_min(), weather: WeatherConfig::default(),
                calendar_events: Vec::new(), custom_widgets: default_custom_widgets(),
                custom_presets: Vec::new(),
            },
            taskbar: TaskbarSettings::default(),
            wallpaper: WallpaperSettings::default(),
            atmosphere: AtmosphereSettings {
                snow: false, rain: false, fog: false, particles: false, stars: false, ambient_light: false,
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