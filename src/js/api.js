const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const { getCurrentWindow } = window.__TAURI__.window;

export const api = {
  getSettings: () => invoke("get_settings"),
  saveSettings: (settings) => invoke("save_settings", { settings }),
  updateIslandHitbox: (rect) => invoke("update_island_hitbox", { x: rect.x, y: rect.y, width: rect.width, height: rect.height }),
  triggerIslandEvent: (eventType, title, subtitle) => invoke("trigger_island_event", { eventType, title, subtitle }),
  getSystemTelemetry: () => invoke("get_system_telemetry"),
  getOsCompatibility: () => invoke("get_os_compatibility"),
  applyTaskbarSettings: (settings) => invoke("apply_taskbar_settings", { settings }),
  restoreTaskbarDefaults: () => invoke("restore_taskbar_defaults"),
  pickWallpapers: () => invoke("pick_wallpapers"),
  readImageDataUrl: (path) => invoke("read_image_data_url", { path }),
  applyWallpaperNow: (path, fitMode) => invoke("apply_wallpaper_now", { path, fitMode }),
  getDesktopShortcuts: () => invoke("get_desktop_shortcuts"),
  browseShortcutFile: () => invoke("browse_shortcut_file"),
  applyIconToShortcut: (shortcutPath, pngBase64) => invoke("apply_icon_to_shortcut", { shortcutPath, pngBase64 }),
  restoreIconForShortcut: (shortcutPath) => invoke("restore_icon_for_shortcut", { shortcutPath }),
  restoreAllShortcutIcons: () => invoke("restore_all_shortcut_icons"),
  getConfigFilePath: () => invoke("get_config_file_path"),
  showMainWindow: () => invoke("show_main_window"),
  hideMainWindow: () => invoke("hide_main_window"),
  quitApp: () => invoke("quit_app"),
  onSettingsUpdated: (cb) => listen("settings-updated", (e) => cb(e.payload)),
  onIslandEvent: (cb) => listen("island-event", (e) => cb(e.payload)),
  currentWindow: () => getCurrentWindow(),
};

export function showToast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}