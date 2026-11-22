use crate::config::HornSettings;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

#[cfg(windows)]
pub fn set_desktop_wallpaper(image_path: &str, fit_mode: &str) -> Result<(), String> {
    use std::ffi::c_void;
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    if !Path::new(image_path).exists() {
        return Err(format!("File not found: {}", image_path));
    }

    let (style, tile) = match fit_mode {
        "fit" => ("6", "0"),
        "stretch" => ("2", "0"),
        "center" => ("0", "0"),
        "span" => ("22", "0"),
        _ => ("10", "0"),
    };

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok((desk, _)) = hkcu.create_subkey("Control Panel\\Desktop") {
        let _ = desk.set_value("WallpaperStyle", &style);
        let _ = desk.set_value("TileWallpaper", &tile);
    }

    #[link(name = "user32")]
    extern "system" {
        fn SystemParametersInfoW(ui_action: u32, ui_param: u32, pv_param: *mut c_void, f_win_ini: u32) -> i32;
    }

    let mut wide: Vec<u16> = image_path.encode_utf16().collect();
    wide.push(0);

    unsafe {
        let ok = SystemParametersInfoW(0x0014, 0, wide.as_mut_ptr() as *mut c_void, 0x01 | 0x02);
        if ok == 0 {
            return Err("Failed to set desktop wallpaper".into());
        }
    }
    Ok(())
}

#[cfg(not(windows))]
pub fn set_desktop_wallpaper(_image_path: &str, _fit_mode: &str) -> Result<(), String> { Ok(()) }

pub fn pick_image_files() -> Vec<String> {
    rfd::FileDialog::new()
        .set_title("Select Images")
        .add_filter("Images", &["png", "jpg", "jpeg", "webp", "bmp"])
        .pick_files()
        .unwrap_or_default()
        .into_iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect()
}

pub fn read_file_as_data_url(path: &str) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    let ext = Path::new(path).extension().and_then(|e| e.to_str()).unwrap_or("png").to_lowercase();
    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        _ => "image/png",
    };
    Ok(format!("data:{};base64,{}", mime, STANDARD.encode(bytes)))
}

pub fn start_slideshow_worker(settings_ref: Arc<Mutex<HornSettings>>) {
    thread::spawn(move || {
        let mut last_switch = Instant::now();
        let mut index: usize = 0;

        loop {
            thread::sleep(Duration::from_secs(2));
            let snapshot = match settings_ref.lock() {
                Ok(s) => s.wallpaper.clone(),
                Err(_) => continue,
            };

            if !snapshot.slideshow_enabled || snapshot.slideshow_playlist.is_empty() {
                continue;
            }

            let interval = snapshot.slideshow_interval_sec.max(10);
            if last_switch.elapsed().as_secs() >= interval {
                index %= snapshot.slideshow_playlist.len();
                let next_path = &snapshot.slideshow_playlist[index];
                if set_desktop_wallpaper(next_path, &snapshot.fit_mode).is_ok() {
                    last_switch = Instant::now();
                    index = (index + 1) % snapshot.slideshow_playlist.len();
                }
            }
        }
    });
}