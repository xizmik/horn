import { api } from "./api.js";
import { renderHome } from "./pages/home.js";
import { renderIslandSettings } from "./pages/island-settings.js";
import { renderAtmosphere } from "./pages/atmosphere.js";
import { renderWallpapers } from "./pages/wallpapers.js";
import { renderTaskbar } from "./pages/taskbar.js";
import { renderIcons } from "./pages/icons.js";
import { renderSettings } from "./pages/settings.js";

const NAV_ITEMS = [
  { id: "home", label: "Home", badge: null, render: renderHome },
  { id: "island", label: "Dynamic Island", badge: "LIVE", render: renderIslandSettings },
  { id: "atmosphere", label: "Atmosphere", badge: "Soon", render: renderAtmosphere },
  { id: "wallpapers", label: "Wallpapers", badge: "Soon", render: renderWallpapers },
  { id: "taskbar", label: "Taskbar", badge: "Soon", render: renderTaskbar },
  { id: "icons", label: "Icons", badge: "Soon", render: renderIcons },
  { id: "settings", label: "Settings", badge: null, render: renderSettings },
];

const state = { activePage: "home", settings: null };

function updateSidebarStatus() {
  const dot = document.getElementById("island-status-dot");
  const text = document.getElementById("island-status-text");
  const enabled = state.settings?.island?.enabled;
  dot.style.opacity = enabled ? "1" : "0.25";
  text.textContent = enabled ? "Dynamic Island активен" : "Dynamic Island отключён";
}

function renderNav() {
  const nav = document.getElementById("sidebar-nav");
  nav.innerHTML = NAV_ITEMS.map(
    (item) => `
      <button class="nav-item ${item.id === state.activePage ? "active" : ""}" data-page="${item.id}">
        <span class="nav-item-left"><span>${item.label}</span></span>
        ${item.badge ? `<span class="nav-pill ${item.badge === "LIVE" ? "live" : ""}">${item.badge}</span>` : ""}
      </button>
    `
  ).join("");

  nav.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.page));
  });
}

async function updateSettings(updater) {
  const next = structuredClone(state.settings);
  updater(next);
  state.settings = next;
  updateSidebarStatus();
  try {
    await api.saveSettings(next);
  } catch (err) {
    console.error("Save error:", err);
  }
}

function navigate(pageId) {
  state.activePage = pageId;
  renderNav();
  const container = document.getElementById("page-container");
  const page = NAV_ITEMS.find((p) => p.id === pageId) || NAV_ITEMS[0];
  container.innerHTML = `<div class="page-view" id="page-root"></div>`;
  page.render(document.getElementById("page-root"), {
    settings: state.settings,
    updateSettings,
    navigate,
  });
}

function bindWindowControls() {
  const win = api.currentWindow();
  document.getElementById("btn-min").addEventListener("click", () => win.minimize());
  document.getElementById("btn-max").addEventListener("click", () => win.toggleMaximize());
  document.getElementById("btn-close").addEventListener("click", () => {
    if (state.settings?.island?.enabled) {
      api.hideMainWindow();
    } else {
      api.quitApp();
    }
  });
}

async function bootstrap() {
  bindWindowControls();
  state.settings = await api.getSettings();
  updateSidebarStatus();
  navigate("home");

  await api.onSettingsUpdated((fresh) => {
    state.settings = fresh;
    updateSidebarStatus();
  });
}

bootstrap();