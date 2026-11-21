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

function syncHitbox() {
  const rect = capsule.getBoundingClientRect();
  api.updateIslandHitbox(rect);
}

function setState(nextState) {
  currentState = nextState;
  capsule.classList.remove("state-compact", "state-activity", "state-notification", "state-expanded");
  capsule.classList.add(`state-${nextState}`);

  Object.entries(views).forEach(([name, el]) => {
    el.classList.toggle("visible", name === nextState);
  });

  syncHitbox();
  setTimeout(syncHitbox, 180);
  setTimeout(syncHitbox, 420);
}

function applySettings(settings) {
  const isl = settings.island;
  const speedMap = { slow: "520ms", normal: "360ms", fast: "200ms" };

  document.documentElement.style.setProperty("--island-scale", String(isl.scale));
  document.documentElement.style.setProperty("--island-opacity", String(isl.opacity));
  document.documentElement.style.setProperty("--island-speed", speedMap[isl.animationSpeed] || "360ms");

  capsule.classList.toggle("no-anim", !isl.animationsEnabled);
  capsule.classList.remove("theme-obsidian", "theme-graphite", "theme-steel");
  capsule.classList.add(`theme-${isl.theme}`);

  setTimeout(syncHitbox, 100);
}

function updateClocks() {
  const now = new Date();
  const hhmm = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const hhmmss = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  document.getElementById("compact-clock").textContent = hhmm;
  document.getElementById("expanded-clock").textContent = hhmmss;

  if (focusRunning) {
    focusSeconds += 1;
    const m = String(Math.floor(focusSeconds / 60)).padStart(2, "0");
    const s = String(focusSeconds % 60).padStart(2, "0");
    document.getElementById("activity-value").textContent = `${m}:${s}`;
  }
}

async function pollMetrics() {
  if (currentState !== "expanded") return;
  try {
    const stats = await api.getSystemStats();
    document.getElementById("metric-cpu").textContent = `${stats.cpuPercent}%`;
    document.getElementById("bar-cpu").style.width = `${Math.min(100, stats.cpuPercent)}%`;
    document.getElementById("metric-ram").textContent = `${stats.ramUsedGb} / ${stats.ramTotalGb} GB`;
    document.getElementById("bar-ram").style.width = `${Math.min(100, stats.ramPercent)}%`;
  } catch (e) {
    console.error(e);
  }
}

capsule.addEventListener("click", (e) => {
  if (e.target.closest("button")) return;
  if (currentState === "expanded") {
    setState(focusRunning ? "activity" : "compact");
  } else {
    setState("expanded");
    pollMetrics();
  }
});

document.getElementById("btn-toggle-focus").addEventListener("click", () => {
  focusRunning = !focusRunning;
  if (focusRunning) {
    focusSeconds = 0;
    document.getElementById("activity-label").textContent = "Фокус-таймер";
    document.getElementById("activity-value").textContent = "00:00";
    setState("activity");
  } else {
    setState("compact");
  }
});

document.getElementById("btn-open-horn").addEventListener("click", () => api.showMainWindow());
document.getElementById("btn-collapse").addEventListener("click", () => setState(focusRunning ? "activity" : "compact"));

async function initIsland() {
  const settings = await api.getSettings();
  applySettings(settings);
  updateClocks();
  syncHitbox();

  setInterval(updateClocks, 1000);
  setInterval(pollMetrics, 1500);

  await api.onSettingsUpdated(applySettings);
  await api.onIslandEvent((evt) => {
    if (notifTimer) clearTimeout(notifTimer);

    if (evt.eventType === "notification") {
      document.getElementById("notif-title").textContent = evt.title || "HØRN";
      document.getElementById("notif-sub").textContent = evt.subtitle || "";
      setState("notification");
      notifTimer = setTimeout(() => setState(focusRunning ? "activity" : "compact"), 3600);
    } else if (evt.eventType === "activity") {
      focusRunning = true;
      focusSeconds = 0;
      document.getElementById("activity-label").textContent = evt.title || "Активность";
      setState("activity");
    } else if (evt.eventType === "expanded") {
      setState("expanded");
      pollMetrics();
    } else {
      focusRunning = false;
      setState("compact");
    }
  });
}

initIsland();