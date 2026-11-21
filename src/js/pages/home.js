import { api } from "../api.js";

export function renderHome(root, { settings, navigate }) {
  root.innerHTML = `
    <div class="page-header">
      <div class="page-kicker">WINDOWS VISUAL PLATFORM</div>
      <h1 class="page-title">Добро пожаловать в HØRN</h1>
      <p class="page-subtitle">Модульная среда для визуальной трансформации Windows 10 и Windows 11.</p>
    </div>

    <div class="grid-2">
      <div class="card interactive" id="card-island">
        <div class="card-title">Dynamic Island</div>
        <p class="card-desc">Независимая плавающая капсула поверх рабочего стола с живым мониторингом системы и уведомлениями.</p>
        <div class="roadmap-tag">${settings.island.enabled ? "Активен" : "Отключён"}</div>
      </div>

      <div class="card interactive" id="card-atmosphere">
        <div class="card-title">Atmosphere</div>
        <p class="card-desc">Деликатные атмосферные слои рабочего стола: снег, дождь, туман, частицы и мягкий свет.</p>
        <div class="roadmap-tag">Архитектура готова</div>
      </div>

      <div class="card interactive" id="card-wallpapers">
        <div class="card-title">Wallpapers</div>
        <p class="card-desc">Управление статическими и живыми обоями с поддержкой мультимониторных конфигураций.</p>
        <div class="roadmap-tag">В разработке</div>
      </div>

      <div class="card interactive" id="card-taskbar">
        <div class="card-title">Taskbar & Icons</div>
        <p class="card-desc">Нативная кастомизация панели задач Windows и пакетная замена системных иконок с откатом.</p>
        <div class="roadmap-tag">В разработке</div>
      </div>
    </div>

    <div class="card" style="margin-top: 16px;">
      <div class="card-title">Быстрая проверка Dynamic Island</div>
      <p class="card-desc">Протестируйте переходы между состояниями плавающего острова прямо сейчас.</p>
      <div class="btn-row">
        <button class="btn btn-primary" id="quick-notif">Тест уведомления</button>
        <button class="btn" id="quick-activity">Включить активность</button>
        <button class="btn" id="quick-expand">Раскрыть остров</button>
      </div>
    </div>
  `;

  root.querySelector("#card-island").onclick = () => navigate("island");
  root.querySelector("#card-atmosphere").onclick = () => navigate("atmosphere");
  root.querySelector("#card-wallpapers").onclick = () => navigate("wallpapers");
  root.querySelector("#card-taskbar").onclick = () => navigate("taskbar");

  root.querySelector("#quick-notif").onclick = () =>
    api.triggerIslandEvent("notification", "HØRN Engine", "Остров синхронизирован с рабочим столом");
  root.querySelector("#quick-activity").onclick = () =>
    api.triggerIslandEvent("activity", "Фокус-сессия", "");
  root.querySelector("#quick-expand").onclick = () =>
    api.triggerIslandEvent("expanded", "", "");
}