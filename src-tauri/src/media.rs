use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaInfo {
    pub has_session: bool,
    pub title: String,
    pub artist: String,
    pub status: String, // "Playing" | "Paused" | "Stopped"
}

#[cfg(windows)]
pub fn send_media_key(action: &str) -> Result<(), String> {
    #[link(name = "user32")]
    extern "system" {
        fn keybd_event(b_vk: u8, b_scan: u8, dw_flags: u32, dw_extra_info: usize);
    }

    let vk: u8 = match action {
        "play_pause" => 0xB3, // VK_MEDIA_PLAY_PAUSE
        "next" => 0xB0,       // VK_MEDIA_NEXT_TRACK
        "prev" => 0xB1,       // VK_MEDIA_PREV_TRACK
        _ => return Err("Unknown media action".into()),
    };

    unsafe {
        keybd_event(vk, 0, 0, 0);
        keybd_event(vk, 0, 0x0002, 0); // KEYEVENTF_KEYUP
    }
    Ok(())
}

#[cfg(not(windows))]
pub fn send_media_key(_action: &str) -> Result<(), String> { Ok(()) }

#[cfg(windows)]
pub fn query_media_session() -> MediaInfo {
    use std::os::windows::process::CommandExt;
    use std::process::Command;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let script = r#"
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
  Function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
  }
  [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null
  $mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  $session = $mgr.GetCurrentSession()
  if ($null -eq $session) { Write-Output "NONE"; exit }
  $props = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  $info = $session.GetPlaybackInfo()
  $st = $info.PlaybackStatus.ToString()
  Write-Output "$($props.Title)|$($props.Artist)|$st"
} catch { Write-Output "NONE" }
"#;

    let out = Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    if let Ok(o) = out {
        if o.status.success() {
            let line = String::from_utf8_lossy(&o.stdout).trim().to_string();
            if !line.is_empty() && line != "NONE" {
                let parts: Vec<&str> = line.split('|').collect();
                if parts.len() >= 3 {
                    return MediaInfo {
                        has_session: true,
                        title: if parts[0].is_empty() { "Без названия".into() } else { parts[0].to_string() },
                        artist: if parts[1].is_empty() { "Windows Media".into() } else { parts[1].to_string() },
                        status: parts[2].to_string(),
                    };
                }
            }
        }
    }

    MediaInfo {
        has_session: false,
        title: "Нет активного трека".into(),
        artist: "Запустите плеер или браузер".into(),
        status: "Stopped".into(),
    }
}

#[cfg(not(windows))]
pub fn query_media_session() -> MediaInfo {
    MediaInfo { has_session: false, title: "No media".into(), artist: "".into(), status: "Stopped".into() }
}