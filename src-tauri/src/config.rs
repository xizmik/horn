use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IslandSettings {
    pub enabled: bool,
    pub scale: f64,
    pub offset_x: i32,
    pub offset_y: i32,
    pub animations_enabled: bool,
    pub animation_speed: String,
    pub opacity: f64,
    pub theme: String,
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
    pub atmosphere: AtmosphereSettings,
}

impl Default for HornSettings {
    fn default() -> Self {
        Self {
            autostart: false,
            island: IslandSettings {
                enabled: true,
                scale: 1.0,
                offset_x: 0,
                offset_y: 12,
                animations_enabled: true,
                animation_speed: "normal".to_string(),
                opacity: 0.96,
                theme: "obsidian".to_string(),
            },
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

pub fn config_path() -> PathBuf {
    let mut base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    base.push("HORN");
    let _ = fs::create_dir_all(&base);
    base.push("settings.json");
    base
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