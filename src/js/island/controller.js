import { api } from "../api.js";
import { hydrateBrandLogos } from "../logo.js";
import { fetchWeather } from "../weather.js";

const MODES = [
  ["system", "Sys"], ["notifications", "Notif"], ["weather", "Погода"],
  ["calendar", "Время"], ["network", "Сеть"], ["music", "Музыка"],
  ["storage", "Диски"], ["focus", "Фокус"], ["custom", "Custom"],
];

const capsule = document.getElementById("island-capsule");
const views = {
  compact: document.getElementById("view-compact"),
  activity: document.getElementById("view-activity"),
  notification: document.getElementById("view-notification"),
  expanded: document.getElementById("view-expanded"),
};

let settings = null;
let currentState = "compact";
let activeMode = "system";
let notifTimer = null;
let telemetry = { cpuPercent: 0, ramUsedGb: 0, ramTotalGb: 0, ramPercent: 0, gpuPercent: null, temperatureC: null, batteryPercent: null, batteryCharging: false, netDownKbps: 0, netUpKbps: 0, disks: [] };
let media = { hasSession: false, title: "Нет трека", artist: "Windows Media", status: "Stopped" };
let weatherData = null;
let lastWeatherKey = "";
let notifications = [];
let unreadCount = 0;

let focusRunning = false;
let focusRemaining = 25 * 60;

function syncHitbox() {
  api.updateIslandHitbox(capsule.getBoundingClientRect());
}

function setState(nextState) {
  currentState = nextState;
  capsule.classList.remove("state-compact", "state-activity", "state-notification", "state-expanded");
  capsule.classList.add(`state-${nextState}`);
  Object.entries(views).forEach(([name, el]) => el.classList.toggle("visible", name === nextState));
  if (nextState === "expanded") renderExpandedBody();
  syncHitbox();
  setTimeout(syncHitbox, 180);
  setTimeout(syncHitbox, 400);
}

function formatSec(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function updateCompactSummary() {
  const now = new Date();
  document.getElementById("compact-clock").textContent = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const sum = document.getElementById("compact-summary");
  if (activeMode === "weather" && weatherData) sum.textContent = `${weatherData.icon} ${weatherData.temp}°C`;
  else if (activeMode === "music" && media.hasSession) sum.textContent = `♫ ${media.title}`;
  else if (activeMode === "network") sum.textContent = `↓${telemetry.netDownKbps} KB/s`;
  else if (activeMode === "notifications" && unreadCount > 0) sum.textContent = `Уведомления (${unreadCount})`;
  else sum.textContent = `CPU ${telemetry.cpuPercent}%`;
}

function renderWidgetTile(type, span = 1) {
  const sp = span > 1 ? `span-${span}` : "";
  switch (type) {
    case "cpu":
      return `<div class="metric-box ${sp}"><div class="metric-label">CPU</div><div class="metric-value">${telemetry.cpuPercent}%</div><div class="metric-bar"><div class="metric-fill" style="width:${Math.min(100, telemetry.cpuPercent)}%"></div></div></div>`;
    case "ram":
      return `<div class="metric-box ${sp}"><div class="metric-label">RAM</div><div class="metric-value">${telemetry.ramUsedGb}/${telemetry.ramTotalGb}G</div><div class="metric-bar"><div class="metric-fill" style="width:${Math.min(100, telemetry.ramPercent)}%"></div></div></div>`;
    case "gpu":
      return `<div class="metric-box ${sp}"><div class="metric-label">GPU</div><div class="metric-value">${telemetry.gpuPercent != null ? telemetry.gpuPercent + "%" : "N/A"}</div></div>`;
    case "temp":
      return `<div class="metric-box ${sp}"><div class="metric-label">TEMP</div><div class="metric-value">${telemetry.temperatureC != null ? telemetry.temperatureC + "°C" : "N/A"}</div></div>`;
    case "battery":
      return `<div class="metric-box ${sp}"><div class="metric-label">BATTERY</div><div class="metric-value">${telemetry.batteryPercent != null ? telemetry.batteryPercent + "%" + (telemetry.batteryCharging ? " ⚡" : "") : "AC"}</div></div>`;
    case "network":
      return `<div class="metric-box ${sp}"><div class="metric-label">NETWORK</div><div class="metric-value" style="font-size:12px;">↓${telemetry.netDownKbps} ↑${telemetry.netUpKbps}</div><div class="metric-sub">KB/s</div></div>`;
    case "weather":
      return `<div class="metric-box ${sp}"><div class="metric-label">${settings?.island?.weather?.city || "Погода"}</div><div class="metric-value">${weatherData ? `${weatherData.icon} ${weatherData.temp}°C` : "..."}</div><div class="metric-sub">${weatherData ? weatherData.label : "Загрузка"}</div></div>`;
    case "clock": {
      const now = new Date();
      return `<div class="metric-box ${sp}"><div class="metric-label">${now.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" })}</div><div class="metric-value">${now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div></div>`;
    }
    case "music":
      return `<div class="metric-box ${sp}"><div class="metric-label">MUSIC • ${media.status}</div><div class="metric-value" style="font-size:12.5px;">${media.title}</div><div class="metric-sub">${media.artist}</div><div class="media-controls"><button class="exp-btn" data-m="prev">⏮</button><button class="exp-btn" data-m="play_pause">⏯</button><button class="exp-btn" data-m="next">⏭</button></div></div>`;
    case "storage": {
      const d = telemetry.disks?.[0];
      return `<div class="metric-box ${sp}"><div class="metric-label">DISK ${d ? d.mountPoint : ""}</div><div class="metric-value">${d ? `${d.freeGb} GB своб.` : "N/A"}</div>${d ? `<div class="metric-bar"><div class="metric-fill" style="width:${d.usedPercent}%"></div></div>` : ""}</div>`;
    }
    case "focus":
      return `<div class="metric-box ${sp}"><div class="metric-label">FOCUS TIMER</div><div class="metric-value">${formatSec(focusRemaining)}</div><div class="metric-sub">${focusRunning ? "Идёт сессия" : "Пауза"}</div></div>`;
    case "notifications":
      return `<div class="metric-box ${sp}"><div class="metric-label">УВЕДОМЛЕНИЯ (${unreadCount})</div><div class="metric-sub">${notifications[0] ? `${notifications[0].appName}: ${notifications[0].title}` : "Нет новых"}</div></div>`;
    default:
      return "";
  }
}

function renderExpandedBody() {
  const body = document.getElementById("exp-body");
  const titleEl = document.getElementById("exp-mode-title");
  const switcher = document.getElementById("island-mode-switcher");
  switcher.innerHTML = MODES.map(([id, label]) =>
    `<button class="m-pill ${activeMode === id ? "active" : ""}" data-mode="${id}">${label}</button>`
  ).join("");
  switcher.querySelectorAll("[data-mode]").forEach((b) => {
    b.onclick = () => {
      activeMode = b.dataset.mode;
      if (activeMode === "notifications") unreadCount = 0;
      renderExpandedBody();
      updateCompactSummary();
    };
  });

  const labelPair = MODES.find(([id]) => id === activeMode);
  titleEl.textContent = (labelPair ? labelPair[1] : activeMode).toUpperCase();

  if (activeMode === "system") {
    body.innerHTML = `<div class="exp-grid">
      ${renderWidgetTile("cpu")}${renderWidgetTile("ram")}${renderWidgetTile("gpu")}
      ${renderWidgetTile("temp")}${renderWidgetTile("battery")}${renderWidgetTile("network")}
    </div>`;
  } else if (activeMode === "notifications") {
    unreadCount = 0;
    body.innerHTML = notifications.length
      ? `<div style="display:flex;flex-direction:column;gap:6px;">
          ${notifications.slice(0, 4).map((n) => `
            <div class="metric-box">
              <div style="display:flex;justify-content:space-between;"><span class="metric-label">${n.appName}</span><span class="metric-label">${n.time}</span></div>
              <div class="metric-value" style="font-size:12.5px;">${n.title}</div>
              <div class="metric-sub">${n.subtitle}</div>
            </div>`).join("")}
          <button class="exp-btn" id="btn-clear-notif">Очистить уведомления</button>
        </div>`
      : `<div class="metric-box"><div class="metric-label">УВЕДОМЛЕНИЯ WINDOWS</div><div class="metric-sub">Нет непрочитанных уведомлений.</div></div>`;
    const clr = body.querySelector("#btn-clear-notif");
    if (clr) clr.onclick = () => { notifications = []; renderExpandedBody(); };
  } else if (activeMode === "weather") {
    const city = settings?.island?.weather?.city || "Kyiv";
    body.innerHTML = weatherData
      ? `<div class="exp-grid">
          <div class="metric-box span-3" style="display:flex;justify-content:space-between;align-items:center;">
            <div><div class="metric-label">${city} • ${weatherData.updatedAt}</div><div class="metric-value" style="font-size:20px;">${weatherData.icon} ${weatherData.temp}°C</div><div class="metric-sub">${weatherData.label}</div></div>
            <button class="exp-btn" id="btn-ref-w" style="flex:0;">Обновить</button>
          </div>
          ${weatherData.forecast.map((f) => `<div class="metric-box"><div class="metric-label">${f.date}</div><div class="metric-value" style="font-size:13px;">${f.icon} ${f.max}°/${f.min}°</div></div>`).join("")}
        </div>`
      : `<div class="metric-box"><div class="metric-label">${city}</div><div class="metric-sub">Загрузка данных погоды...</div></div>`;
    const rw = body.querySelector("#btn-ref-w");
    if (rw) rw.onclick = () => refreshWeather(true);
  } else if (activeMode === "calendar") {
    const now = new Date();
    const events = settings?.island?.calendarEvents || [];
    body.innerHTML = `<div class="exp-grid">
      <div class="metric-box span-3">
        <div class="metric-label">${now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</div>
        <div class="metric-value" style="font-size:22px;">${now.toLocaleTimeString("ru-RU")}</div>
      </div>
      <div class="metric-box span-3">
        <div class="metric-label">БЛИЖАЙШИЕ СОБЫТИЯ (${events.length})</div>
        ${events.length ? events.slice(0, 3).map((e) => `<div class="metric-sub">• ${e.date} ${e.time} — ${e.title}</div>`).join("") : `<div class="metric-sub">Добавьте события в Island Studio</div>`}
      </div>
    </div>`;
  } else if (activeMode === "network") {
    body.innerHTML = `<div class="exp-grid">
      <div class="metric-box span-2"><div class="metric-label">DOWNLOAD</div><div class="metric-value">↓ ${telemetry.netDownKbps} KB/s</div></div>
      <div class="metric-box"><div class="metric-label">UPLOAD</div><div class="metric-value">↑ ${telemetry.netUpKbps} KB/s</div></div>
      <div class="metric-box span-3"><div class="metric-label">АКТИВНОСТЬ СЕТИ</div><div class="metric-sub">${telemetry.netDownKbps + telemetry.netUpKbps > 5 ? "Активный обмен трафиком" : "Низкая сетевая активность (Ожидание)"}</div></div>
    </div>`;
  } else if (activeMode === "music") {
    body.innerHTML = `<div class="exp-grid">${renderWidgetTile("music", 3)}</div>`;
  } else if (activeMode === "storage") {
    body.innerHTML = `<div style="display:flex;flex-direction:column;gap:6px;">
      ${(telemetry.disks || []).slice(0, 3).map((d) => `
        <div class="metric-box">
          <div style="display:flex;justify-content:space-between;"><span class="metric-label">${d.mountPoint} (${d.kind})</span><span class="metric-label">${d.freeGb} GB своб. / ${d.totalGb} GB</span></div>
          <div class="metric-bar"><div class="metric-fill" style="width:${d.usedPercent}%"></div></div>
        </div>`).join("") || `<div class="metric-box"><div class="metric-sub">Накопители не обнаружены</div></div>`}
    </div>`;
  } else if (activeMode === "focus") {
    body.innerHTML = `<div class="metric-box" style="text-align:center;padding:14px;">
      <div class="metric-label">FOCUS TIMER</div>
      <div class="metric-value" style="font-size:28px;margin:6px 0;">${formatSec(focusRemaining)}</div>
      <div class="media-controls">
        <button class="exp-btn" id="btn-f-start">${focusRunning ? "Пауза" : "Старт"}</button>
        <button class="exp-btn" id="btn-f-reset">Сброс</button>
      </div>
    </div>`;
    body.querySelector("#btn-f-start").onclick = toggleFocus;
    body.querySelector("#btn-f-reset").onclick = () => {
      focusRunning = false;
      focusRemaining = (settings?.island?.focusMinutes || 25) * 60;
      renderExpandedBody();
    };
  } else if (activeMode === "custom") {
    const widgets = settings?.island?.customWidgets || [];
    body.innerHTML = `<div class="exp-grid">
      ${widgets.map((w) => renderWidgetTile(w.widgetType, w.span)).join("") || `<div class="metric-box span-3"><div class="metric-sub">Добавьте виджеты в Island Studio → Custom</div></div>`}
    </div>`;
  }

  body.querySelectorAll("[data-m]").forEach((btn) => {
    btn.onclick = async () => {
      await api.mediaControl(btn.dataset.m);
      setTimeout(pollMedia, 350);
    };
  });
}

function toggleFocus() {
  focusRunning = !focusRunning;
  if (focusRunning && focusRemaining <= 0) focusRemaining = (settings?.island?.focusMinutes || 25) * 60;
  if (focusRunning) {
    document.getElementById("activity-label").textContent = "Фокус-таймер";
    document.getElementById("activity-value").textContent = formatSec(focusRemaining);
    setState("activity");
  } else {
    setState(currentState === "expanded" ? "expanded" : "compact");
  }
}

async function refreshWeather(force = false) {
  const w = settings?.island?.weather;
  if (!w) return;
  const key = `${w.lat},${w.lon}`;
  if (!force && weatherData && lastWeatherKey === key) return;
  try {
    weatherData = await fetchWeather(w.lat, w.lon);
    lastWeatherKey = key;
    if (currentState === "expanded" && (activeMode === "weather" || activeMode === "custom")) renderExpandedBody();
    updateCompactSummary();
  } catch (e) {}
}

async function pollTelemetry() {
  try {
    telemetry = await api.getSystemTelemetry();
    updateCompactSummary();
    if (currentState === "expanded" && ["system", "network", "storage", "custom"].includes(activeMode)) renderExpandedBody();
  } catch (e) {}
}

async function pollMedia() {
  try {
    media = await api.getMediaInfo();
    updateCompactSummary();
    if (currentState === "expanded" && (activeMode === "music" || activeMode === "custom")) renderExpandedBody();
  } catch (e) {}
}

function applySettings(next) {
  settings = next;
  const isl = next.island;
  activeMode = isl.activeMode || "system";
  if (!focusRunning) focusRemaining = (isl.focusMinutes || 25) * 60;

  const speedMap = { slow: "500ms", normal: "340ms", fast: "180ms" };
  const root = document.documentElement.style;
  root.setProperty("--island-scale", String(isl.scale));
  root.setProperty("--island-opacity", String(isl.opacity));
  root.setProperty("--island-speed", speedMap[isl.animationSpeed] || "340ms");
  root.setProperty("--compact-w", `${isl.compactWidth || 236}px`);
  root.setProperty("--compact-h", `${isl.compactHeight || 38}px`);
  root.setProperty("--expanded-w", `${isl.expandedWidth || 460}px`);
  root.setProperty("--expanded-h", `${isl.expandedHeight || 276}px`);
  root.setProperty("--island-radius", `${isl.borderRadius || 26}px`);

  capsule.classList.toggle("no-anim", !isl.animationsEnabled);
  capsule.classList.remove("theme-obsidian", "theme-graphite", "theme-steel");
  capsule.classList.add(`theme-${isl.theme}`);

  refreshWeather(false);
  if (currentState === "expanded") renderExpandedBody();
  updateCompactSummary();
  setTimeout(syncHitbox, 140);
}

capsule.addEventListener("click", (e) => {
  if (e.target.closest("button")) return;
  if (currentState === "expanded") setState(focusRunning ? "activity" : "compact");
  else { setState("expanded"); pollTelemetry(); pollMedia(); }
});

document.getElementById("btn-toggle-focus").onclick = toggleFocus;
document.getElementById("btn-open-horn").onclick = () => api.showMainWindow();
document.getElementById("btn-collapse").onclick = () => setState(focusRunning ? "activity" : "compact");

async function initIsland() {
  await hydrateBrandLogos();
  applySettings(await api.getSettings());
  pollTelemetry();
  pollMedia();
  refreshWeather(true);
  syncHitbox();

  setInterval(() => {
    if (focusRunning) {
      focusRemaining = Math.max(0, focusRemaining - 1);
      document.getElementById("activity-value").textContent = formatSec(focusRemaining);
      if (focusRemaining === 0) {
        focusRunning = false;
        setState("compact");
      }
    }
    updateCompactSummary();
    if (currentState === "expanded" && (activeMode === "calendar" || activeMode === "focus" || activeMode === "custom")) {
      renderExpandedBody();
    }
  }, 1000);

  setInterval(pollTelemetry, 2000);
  setInterval(pollMedia, 4000);
  setInterval(() => refreshWeather(true), 15 * 60 * 1000);

  await api.onSettingsUpdated(applySettings);
  await api.onIslandEvent((evt) => {
    if (notifTimer) clearTimeout(notifTimer);
    if (evt.eventType === "notification") {
      notifications.unshift({
        appName: evt.appName || "HØRN",
        title: evt.title || "Уведомление",
        subtitle: evt.subtitle || "",
        time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      });
      unreadCount += 1;
      document.getElementById("notif-app").textContent = evt.appName || "HØRN";
      document.getElementById("notif-title").textContent = evt.title || "HØRN";
      document.getElementById("notif-sub").textContent = evt.subtitle || "";
      const prevState = currentState;
      setState("notification");
      notifTimer = setTimeout(() => setState(prevState === "expanded" ? "expanded" : (focusRunning ? "activity" : "compact")), 3800);
    } else if (evt.eventType === "activity") {
      focusRunning = true;
      focusRemaining = (settings?.island?.focusMinutes || 25) * 60;
      document.getElementById("activity-label").textContent = evt.title || "Фокус-таймер";
      setState("activity");
    } else if (evt.eventType === "expanded") {
      setState("expanded");
    } else {
      focusRunning = false;
      setState("compact");
    }
  });
}

initIsland();