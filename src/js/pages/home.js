import { api } from "../api.js";

export function renderHome(root, { settings, navigate }) {
  root.innerHTML = `
    <div class="page-header">
      <div class="page-kicker">WINDOWS VISUAL PLATFORM • v0.2</div>
      <h1 class="page-title">Панель управления HØRN</h1>
      <p class="page-subtitle">Все ключевые студии активны и работают напрямую с системными механизмами Windows.</p>
    </div>

    <div class="grid-2">
      <div class="card interactive" id="c-island">
        <div class="card-title">Dynamic Island</div>
        <p class="card-desc">Плавающий остров с живым мониторингом CPU, RAM, GPU, температур, батареи, сети и фокус-таймером.</p>
        <div class="roadmap-tag">${settings.island.enabled ? "Активен" : "Отключён"}</div>
      </div>
      <div class="card interactive" id="c-icons">
        <div class="card-title">Icon Studio</div>
        <p class="card-desc">Эффекты стекла и металла для иконок, реальная замена ярлыков Windows и безопасный откат.</p>
        <div class="roadmap-tag">Активно</div>
      </div>
      <div class="card interactive" id="c-taskbar">
        <div class="card-title">Taskbar Studio</div>
        <p class="card-desc">Прозрачность, Blur/Acrylic, выравнивание и системные элементы панели задач с бэкапом.</p>
        <div class="roadmap-tag">Активно</div>
      </div>
      <div class="card interactive" id="c-wallpapers">
        <div class="card-title">Wallpaper Studio</div>
        <p class="card-desc">Коллекции обоев, режимы подгонки под монитор, избранное и автоматическая смена по плейлисту.</p>
        <div class="roadmap-tag">Активно</div>
      </div>
    </div>

    <div class="card" style="margin-top: 15px;">
      <div class="card-title">Быстрый тест Dynamic Island</div>
      <div class="btn-row">
        <button class="btn btn-primary" id="q-notif">Уведомление</button>
        <button class="btn" id="q-act">Фокус-таймер</button>
        <button class="btn" id="q-exp">Раскрыть телеметрию</button>
      </div>
    </div>
  `;
  root.querySelector("#c-island").onclick = () => navigate("island");
  root.querySelector("#c-icons").onclick = () => navigate("icons");
  root.querySelector("#c-taskbar").onclick = () => navigate("taskbar");
  root.querySelector("#c-wallpapers").onclick = () => navigate("wallpapers");
  root.querySelector("#q-notif").onclick = () => api.triggerIslandEvent("notification", "HØRN v0.2", "Все модули синхронизированы");
  root.querySelector("#q-act").onclick = () => api.triggerIslandEvent("activity", "Фокус-сессия", "");
  root.querySelector("#q-exp").onclick = () => api.triggerIslandEvent("expanded", "", "");
}