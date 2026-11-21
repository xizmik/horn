import { api } from "../api.js";

export function renderIslandSettings(root, { settings, updateSettings }) {
  const isl = settings.island;

  root.innerHTML = `
    <div class="page-header">
      <div class="page-kicker">CORE MODULE • ACTIVE</div>
      <h1 class="page-title">Dynamic Island</h1>
      <p class="page-subtitle">Настройка поведения, геометрии и визуального стиля плавающего острова поверх окон Windows.</p>
    </div>

    <div class="section-stack">
      <div class="card">
        <div class="setting-row">
          <div>
            <div class="setting-label">Включить Dynamic Island</div>
            <div class="setting-hint">Отображать независимую капсулу поверх рабочего стола</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="isl-enabled" ${isl.enabled ? "checked" : ""}/>
            <span class="toggle-track"></span>
          </label>
        </div>

        <div class="setting-row">
          <div>
            <div class="setting-label">Автозапуск вместе с Windows</div>
            <div class="setting-hint">Добавляет HØRN в HKCU\\...\\Run для автоматического старта</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="app-autostart" ${settings.autostart ? "checked" : ""}/>
            <span class="toggle-track"></span>
          </label>
        </div>

        <div class="setting-row">
          <div>
            <div class="setting-label">Визуальное оформление</div>
            <div class="setting-hint">Материал поверхности и окантовка капсулы</div>
          </div>
          <div class="segmented" id="isl-theme">
            ${["obsidian", "graphite", "steel"]
              .map((t) => `<button class="seg-btn ${isl.theme === t ? "active" : ""}" data-val="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`)
              .join("")}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="setting-row">
          <div>
            <div class="setting-label">Размер острова</div>
            <div class="setting-hint">Масштаб капсулы относительно стандартного</div>
          </div>
          <div class="range-wrap">
            <input type="range" id="isl-scale" min="0.8" max="1.3" step="0.05" value="${isl.scale}"/>
            <span class="range-val" id="val-scale">${Math.round(isl.scale * 100)}%</span>
          </div>
        </div>

        <div class="setting-row">
          <div>
            <div class="setting-label">Смещение по горизонтали (X)</div>
            <div class="setting-hint">Отклонение от центра верхнего края экрана</div>
          </div>
          <div class="range-wrap">
            <input type="range" id="isl-x" min="-400" max="400" step="10" value="${isl.offsetX}"/>
            <span class="range-val" id="val-x">${isl.offsetX}px</span>
          </div>
        </div>

        <div class="setting-row">
          <div>
            <div class="setting-label">Отступ сверху (Y)</div>
            <div class="setting-hint">Расстояние от верхней границы монитора</div>
          </div>
          <div class="range-wrap">
            <input type="range" id="isl-y" min="0" max="100" step="2" value="${isl.offsetY}"/>
            <span class="range-val" id="val-y">${isl.offsetY}px</span>
          </div>
        </div>

        <div class="setting-row">
          <div>
            <div class="setting-label">Прозрачность</div>
            <div class="setting-hint">Непрозрачность капсулы острова</div>
          </div>
          <div class="range-wrap">
            <input type="range" id="isl-opacity" min="0.55" max="1" step="0.02" value="${isl.opacity}"/>
            <span class="range-val" id="val-opacity">${Math.round(isl.opacity * 100)}%</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="setting-row">
          <div>
            <div class="setting-label">Плавные анимации</div>
            <div class="setting-hint">Физика пружинного раскрытия и сжатия</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="isl-anim" ${isl.animationsEnabled ? "checked" : ""}/>
            <span class="toggle-track"></span>
          </label>
        </div>

        <div class="setting-row">
          <div>
            <div class="setting-label">Скорость анимаций</div>
            <div class="setting-hint">Отклик переходов между состояниями</div>
          </div>
          <div class="segmented" id="isl-speed">
            ${[["slow", "Плавная"], ["normal", "Обычная"], ["fast", "Быстрая"]]
              .map(([v, label]) => `<button class="seg-btn ${isl.animationSpeed === v ? "active" : ""}" data-val="${v}">${label}</button>`)
              .join("")}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Демонстрация состояний</div>
        <p class="card-desc">Мгновенная отправка команд в независимый процесс Dynamic Island.</p>
        <div class="btn-row">
          <button class="btn" id="test-compact">Компактный</button>
          <button class="btn" id="test-expanded">Расширенный</button>
          <button class="btn" id="test-activity">Активность</button>
          <button class="btn btn-primary" id="test-notif">Уведомление</button>
        </div>
      </div>
    </div>
  `;

  root.querySelector("#isl-enabled").addEventListener("change", (e) => updateSettings((s) => (s.island.enabled = e.target.checked)));
  root.querySelector("#app-autostart").addEventListener("change", (e) => updateSettings((s) => (s.autostart = e.target.checked)));
  root.querySelector("#isl-anim").addEventListener("change", (e) => updateSettings((s) => (s.island.animationsEnabled = e.target.checked)));

  const bindRange = (id, valId, fmt, mutator) => {
    const el = root.querySelector(id);
    const out = root.querySelector(valId);
    el.addEventListener("input", () => {
      const v = Number(el.value);
      out.textContent = fmt(v);
      updateSettings((s) => mutator(s, v));
    });
  };

  bindRange("#isl-scale", "#val-scale", (v) => `${Math.round(v * 100)}%`, (s, v) => (s.island.scale = v));
  bindRange("#isl-x", "#val-x", (v) => `${v}px`, (s, v) => (s.island.offsetX = v));
  bindRange("#isl-y", "#val-y", (v) => `${v}px`, (s, v) => (s.island.offsetY = v));
  bindRange("#isl-opacity", "#val-opacity", (v) => `${Math.round(v * 100)}%`, (s, v) => (s.island.opacity = v));

  const bindSegmented = (id, mutator) => {
    const group = root.querySelector(id);
    group.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        group.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        updateSettings((s) => mutator(s, btn.dataset.val));
      });
    });
  };

  bindSegmented("#isl-theme", (s, v) => (s.island.theme = v));
  bindSegmented("#isl-speed", (s, v) => (s.island.animationSpeed = v));

  root.querySelector("#test-compact").onclick = () => api.triggerIslandEvent("compact", "", "");
  root.querySelector("#test-expanded").onclick = () => api.triggerIslandEvent("expanded", "", "");
  root.querySelector("#test-activity").onclick = () => api.triggerIslandEvent("activity", "Фокус-режим", "");
  root.querySelector("#test-notif").onclick = () =>
    api.triggerIslandEvent("notification", "Системное событие", "Изменения применены успешно");
}