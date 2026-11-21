#[cfg(windows)]
pub fn set_autostart(enabled: bool) -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (key, _) = hkcu
        .create_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")
        .map_err(|e| format!("Registry error: {}", e))?;

    if enabled {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let exe_path = format!("\"{}\"", exe.to_string_lossy());
        key.set_value("HORN", &exe_path)
            .map_err(|e| format!("Failed to enable autostart: {}", e))?;
    } else {
        let _ = key.delete_value("HORN");
    }
    Ok(())
}

#[cfg(not(windows))]
pub fn set_autostart(_enabled: bool) -> Result<(), String> {
    Ok(())
}