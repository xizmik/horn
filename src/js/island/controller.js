import { api } from "../api.js";

const capsule = document.getElementById("island-capsule");
const views = {
  compact: document.getElementById("view-compact"),
  activity: document.getElementById("view-activity"),
  notification: document.getElementById("view-notification"),
  expanded: document.getElementById("view-expanded"),
};

let currentState = "compact";
let notifTimer = null;
let focusRunning = false;
let focusSeconds = 0;
let activeModules = {};

function syncHitbox() {
  const rect = capsule.getBoundingClientRect();
  api.updateIslandHitbox(rect);
}

function setState(nextState) {
  currentState = nextState;
  capsule.classList.remove("state-compact", "state-activity", "state-notification", "state-expanded");
  capsule.classList.add(`state-${nextState}`);
  Object.entries(views).forEach(([name, el]) => el.classList.toggle("visible", name === nextState));
  syncHitbox();
  setTimeout(syncHitbox, 180);
  setTimeout(syncHitbox, 420);
}

function applySettings(settings) {
  const isl = settings.island;
  activeModules = isl.modules || {};
  const speedMap = { slow: "500ms", normal: "340ms", fast: "180ms" };
  const root = document.documentElement.style;
  root.setProperty("--island-scale", String(isl.scale));
  root.setProperty("--island-opacity", String(isl.opacity));
  root.setProperty("--island-speed", speedMap[isl.animationSpeed] || "340ms");
  root.setProperty("--compact-w", `${isl.compactWidth || 224}px`);
  root.setProperty("--compact-h", `${isl.compactHeight || 38}px`);
  root.setProperty("--expanded-w", `${isl.expandedWidth || 440}px`);
  root.setProperty("--expanded-h", `${isl.expandedHeight || 256}px`);
  root.setProperty("--island-radius", `${isl.borderRadius || 26}px`);

  capsule.classList.toggle("no-anim", !isl.animationsEnabled);
  capsule.classList.remove("theme-obsidian", "theme-graphite", "theme-steel");
  capsule.classList.add(`theme-${isl.theme}`);

  document.getElementById("box-cpu").classList.toggle("hidden", activeModules.cpu === false);
  document.getElementById("box-ram").classList.toggle("hidden", activeModules.ram === false);
  document.getElementById("box-gpu").classList.toggle("hidden", activeModules.gpu === false);
  document.getElementById("box-temp").classList.toggle("hidden", activeModules.temperature === false);
  document.getElementById("box-bat").classList.toggle("hidden", activeModules.battery === false);
  document.getElementById("box-net").classList.toggle("hidden", activeModules.network === false);
  document.getElementById("btn-toggle-focus").style.display = activeModules.focusTimer === false ? "none" : "";

  setTimeout(syncHitbox, 120);
}

function updateClocks() {
  const now = new Date();
  const showClock = activeModules.clockCalendar !== false;
  document.getElementById("compact-clock").textContent = showClock
    ? now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : "";
  document.getElementById("expanded-clock").textContent = showClock
    ? now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "";
  document.getElementById("expanded-date").textContent = showClock
    ? now.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" })
    : "";

  if (focusRunning) {
    focusSeconds += 1;
    const m = String(Math.floor(focusSeconds / 60)).padStart(2, "0");
    const s = String(focusSeconds % 60).padStart(2, "0");
    document.getElementById("activity-value").textContent = `${m}:${s}`;
  }
}

async function pollTelemetry() {
  if (currentState !== "expanded") return;
  try {
    const t = await api.getSystemTelemetry();
    document.getElementById("metric-cpu").textContent = `${t.cpuPercent}%`;
    document.getElementById("bar-cpu").style.width = `${Math.min(100, t.cpuPercent)}%`;
    document.getElementById("metric-ram").textContent = `${t.ramUsedGb}/${t.ramTotalGb}G`;
    document.getElementById("bar-ram").style.width = `${Math.min(100, t.ramPercent)}%`;
    document.getElementById("metric-gpu").textContent = t.gpuPercent != null ? `${t.gpuPercent}%` : "N/A";
    document.getElementById("metric-temp").textContent = t.temperatureC != null ? `${t.temperatureC}В°C` : "N/A";
    document.getElementById("metric-bat").textContent =
      t.batteryPercent != null ? `${t.batteryPercent}%${t.batteryCharging ? " вљЎ" : ""}` : "AC";
    document.getElementById("metric-net").textContent = `в†“${t.netDownKbps} в†‘${t.netUpKbps}`;
  } catch (e) {}
}

capsule.addEventListener("click", (e) => {
  if (e.target.closest("button")) return;
  if (currentState === "expanded") setState(focusRunning ? "activity" : "compact");
  else { setState("expanded"); pollTelemetry(); }
});

document.getElementById("btn-toggle-focus").onclick = () => {
  focusRunning = !focusRunning;
  if (focusRunning) {
    focusSeconds = 0;
    document.getElementById("activity-label").textContent = "Р¤РѕРєСѓСЃ-С‚Р°Р№РјРµСЂ";
    document.getElementById("activity-value").textContent = "00:00";
    setState("activity");
  } else setState("compact");
};

document.getElementById("btn-open-horn").onclick = () => api.showMainWindow();
document.getElementById("btn-collapse").onclick = () => setState(focusRunning ? "activity" : "compact");

async function initIsland() {
  const settings = await api.getSettings();
  applySettings(settings);
  updateClocks();
  syncHitbox();

  setInterval(updateClocks, 1000);
  setInterval(pollTelemetry, 1500);

  await api.onSettingsUpdated(applySettings);
  await api.onIslandEvent((evt) => {
    if (notifTimer) clearTimeout(notifTimer);
    if (evt.eventType === "notification") {
      if (activeModules.notifications === false) return;
      document.getElementById("notif-title").textContent = evt.title || "HГRN";
      document.getElementById("notif-sub").textContent = evt.subtitle || "";
      setState("notification");
      notifTimer = setTimeout(() => setState(focusRunning ? "activity" : "compact"), 3800);
    } else if (evt.eventType === "activity") {
      focusRunning = true; focusSeconds = 0;
      document.getElementById("activity-label").textContent = evt.title || "Р¤РѕРєСѓСЃ-С‚Р°Р№РјРµСЂ";
      setState("activity");
    } else if (evt.eventType === "expanded") {
      setState("expanded"); pollTelemetry();
    } else {
      focusRunning = false; setState("compact");
    }
  });
}

initIsland();