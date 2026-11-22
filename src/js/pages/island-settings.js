import { api } from "../api.js";

const MODULES = [
  ["cpu", "CPU Load"], ["ram", "RAM"], ["gpu", "GPU (NVIDIA)"],
  ["temperature", "Температура"], ["battery", "Батарея"], ["network", "Сеть (Down/Up)"],
  ["clockCalendar", "Часы и календарь"], ["focusTimer", "Focus Timer"], ["notifications", "Уведомления"]
];

export function renderIslandSettings(root, { settings, updateSettings }) {
  const isl = settings.island;
  const mods = isl.modules || {};

  root.innerHTML = `
    <div class="page-header">
      <div class="page-kicker">DYNAMIC ISLAND • v0.2</div>
      <h1 class="page-title">Dynamic Island</h1>
      <p class="page-subtitle">Геометрия, анимации, внешний вид и выбор активных блоков телеметрии.</p>
    </div>

    <div class="section-stack">
      <div class="card">
        <div class="setting-row">
          <div><div class="setting-label">Включить Dynamic Island</div><div class="setting-hint">Плавающий остров поверх окон</div></div>
          <label class="toggle"><input type="checkbox" id="i-en" ${isl.enabled ? "checked" : ""}/><span class="toggle-track"></span></label>
        </div>
        <div class="setting-row">
          <div><div class="setting-label">Автозапуск с Windows</div><div class="setting-hint">Запуск HØRN при входе в систему</div></div>
          <label class="toggle"><input type="checkbox" id="i-auto" ${settings.autostart ? "checked" : ""}/><span class="toggle-track"></span></label>
        </div>
        <div class="setting-row">
          <div><div class="setting-label">Оформление</div></div>
          <div class="segmented" id="i-theme">
            ${["obsidian", "graphite", "steel"].map(t => `<button class="seg-btn ${isl.theme === t ? "active" : ""}" data-val="${t}">${t}</button>`).join("")}
          </div>
        </div>
        <div class="setting-row">
          <div><div class="setting-label">Скорость анимаций</div></div>
          <div class="segmented" id="i-speed">
            ${[["slow","Плавная"],["normal","Обычная"],["fast","Быстрая"]].map(([v,l]) => `<button class="seg-btn ${isl.animationSpeed === v ? "active" : ""}" data-val="${v}">${l}</button>`).join("")}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title" style="margin-bottom:10px;">Геометрия и положение</div>
        <div class="setting-row"><div class="setting-label">Ширина (компактная)</div><div class="range-wrap"><input type="range" id="r-cw" min="180" max="320" step="4" value="${isl.compactWidth || 224}"/><span class="range-val" id="v-cw">${isl.compactWidth || 224}px</span></div></div>
        <div class="setting-row"><div class="setting-label">Высота (компактная)</div><div class="range-wrap"><input type="range" id="r-ch" min="32" max="54" step="2" value="${isl.compactHeight || 38}"/><span class="range-val" id="v-ch">${isl.compactHeight || 38}px</span></div></div>
        <div class="setting-row"><div class="setting-label">Ширина (раскрытая)</div><div class="range-wrap"><input type="range" id="r-ew" min="380" max="520" step="10" value="${isl.expandedWidth || 440}"/><span class="range-val" id="v-ew">${isl.expandedWidth || 440}px</span></div></div>
        <div class="setting-row"><div class="setting-label">Скругление углов</div><div class="range-wrap"><input type="range" id="r-rad" min="12" max="34" step="2" value="${isl.borderRadius || 26}"/><span class="range-val" id="v-rad">${isl.borderRadius || 26}px</span></div></div>
        <div class="setting-row"><div class="setting-label">Смещение X / Отступ Y</div>
          <div style="display:flex;gap:10px;">
            <input type="number" id="n-x" value="${isl.offsetX}" style="width:80px;" title="Offset X"/>
            <input type="number" id="n-y" value="${isl.offsetY}" style="width:80px;" title="Offset Y"/>
          </div>
        </div>
        <div class="setting-row"><div class="setting-label">Прозрачность</div><div class="range-wrap"><input type="range" id="r-op" min="0.55" max="1" step="0.02" value="${isl.opacity}"/><span class="range-val" id="v-op">${Math.round(isl.opacity*100)}%</span></div></div>
      </div>

      <div class="card">
        <div class="card-title" style="margin-bottom:10px;">Активные блоки острова</div>
        <div class="grid-3">
          ${MODULES.map(([k, label]) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--border-subtle);">
              <span style="font-size:12px;">${label}</span>
              <label class="toggle"><input type="checkbox" data-mod="${k}" ${mods[k] !== false ? "checked" : ""}/><span class="toggle-track"></span></label>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  root.querySelector("#i-en").onchange = (e) => updateSettings(s => s.island.enabled = e.target.checked);
  root.querySelector("#i-auto").onchange = (e) => updateSettings(s => s.autostart = e.target.checked);

  const bindR = (id, vid, fmt, fn) => {
    const el = root.querySelector(id), out = root.querySelector(vid);
    el.oninput = () => { const v = Number(el.value); out.textContent = fmt(v); updateSettings(s => fn(s, v)); };
  };
  bindR("#r-cw", "#v-cw", v => `${v}px`, (s,v) => s.island.compactWidth = v);
  bindR("#r-ch", "#v-ch", v => `${v}px`, (s,v) => s.island.compactHeight = v);
  bindR("#r-ew", "#v-ew", v => `${v}px`, (s,v) => s.island.expandedWidth = v);
  bindR("#r-rad", "#v-rad", v => `${v}px`, (s,v) => s.island.borderRadius = v);
  bindR("#r-op", "#v-op", v => `${Math.round(v*100)}%`, (s,v) => s.island.opacity = v);

  root.querySelector("#n-x").onchange = (e) => updateSettings(s => s.island.offsetX = Number(e.target.value) || 0);
  root.querySelector("#n-y").onchange = (e) => updateSettings(s => s.island.offsetY = Number(e.target.value) || 0);

  root.querySelectorAll("#i-theme .seg-btn").forEach(b => b.onclick = () => {
    root.querySelectorAll("#i-theme .seg-btn").forEach(x => x.classList.remove("active"));
    b.classList.add("active"); updateSettings(s => s.island.theme = b.dataset.val);
  });
  root.querySelectorAll("#i-speed .seg-btn").forEach(b => b.onclick = () => {
    root.querySelectorAll("#i-speed .seg-btn").forEach(x => x.classList.remove("active"));
    b.classList.add("active"); updateSettings(s => s.island.animationSpeed = b.dataset.val);
  });
  root.querySelectorAll("input[data-mod]").forEach(inp => inp.onchange = () => {
    updateSettings(s => { s.island.modules = s.island.modules || {}; s.island.modules[inp.dataset.mod] = inp.checked; });
  });
}