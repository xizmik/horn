const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const { getCurrentWindow } = window.__TAURI__.window;

export const api = {
  getSettings: () => invoke("get_settings"),
  saveSettings: (settings) => invoke("save_settings", { settings }),
  updateIslandHitbox: (rect) =>
    invoke("update_island_hitbox", {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    }),
  triggerIslandEvent: (eventType, title, subtitle) =>
    invoke("trigger_island_event", { eventType, title, subtitle }),
  getSystemStats: () => invoke("get_system_stats"),
  getConfigFilePath: () => invoke("get_config_file_path"),
  showMainWindow: () => invoke("show_main_window"),
  hideMainWindow: () => invoke("hide_main_window"),
  quitApp: () => invoke("quit_app"),
  onSettingsUpdated: (cb) => listen("settings-updated", (e) => cb(e.payload)),
  onIslandEvent: (cb) => listen("island-event", (e) => cb(e.payload)),
  currentWindow: () => getCurrentWindow(),
};