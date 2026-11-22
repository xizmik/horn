import { api, showToast } from "../api.js";
import { searchCity } from "../weather.js";

const MODES = [
  ["system", "System Monitor", "CPU, RAM, GPU, Temp, Battery"],
  ["notifications", "Notifications", "Уведомления и счётчик"],
  ["weather", "Weather", "Температура и прогноз"],
  ["calendar", "Time & Calendar", "Часы, дата и события"],
  ["network", "Network Monitor", "Download / Upload трафик"],
  ["music", "Music", "Текущий трек и управление"],
  ["storage", "Storage", "Свободное место на дисках"],
  ["focus", "Focus Timer", "Таймер концентрации"],
  ["custom", "Custom Builder", "Своя сетка виджетов"],
];

const WIDGET_TYPES = [
  ["cpu", "CPU"], ["ram", "RAM"], ["gpu", "GPU"], ["temp", "Температура"],
  ["battery", "Батарея"], ["network", "Сеть"], ["weather", "Погода"],
  ["clock", "Часы"], ["music", "Музыка"], ["storage", "Диски"],
  ["focus", "Фокус"], ["notifications", "Уведомления"],
];

export function renderIslandSettings(root, { settings, updateSettings }) {
  const isl = settings.island;
  let dragIdx = null;

  function render() {
    root.innerHTML = `
      <div class="page-header">
        <div class="page-kicker">ISLAND STUDIO • v0.2</div>
        <h1 class="page-title">Dynamic Island Studio</h1>
        <p class="page-subtitle">Переключай готовые режимы, настраивай погоду и календарь или собери свой Custom-остров.</p>
      </div>

      <div class="section-stack">
        <div class="card">
          <div class="card-title" style="margin-bottom:10px;">Режим отображения острова</div>
          <div class="mode-grid">
            ${MODES.map(([id, name, desc]) => `
              <button class="mode-card ${isl.activeMode === id ? "active" : ""}" data-mode="${id}">
                <div class="mode-card-title">${name}</div>
                <div class="mode-card-sub">${desc}</div>
              </button>
            `).join("")}
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="btn-test-exp">Раскрыть остров</button>
            <button class="btn" id="btn-test-notif">Тест уведомления</button>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Конструктор Custom (перетаскивание, ширина и пресеты)</div>
          <p class="card-desc">Перетаскивай блоки мышкой для изменения порядка, меняй ширину (1–3 колонки) и сохраняй конфигурации.</p>
          <div class="btn-row">
            <select id="sel-add-w">${WIDGET_TYPES.map(([id, n]) => `<option value="${id}">${n}</option>`).join("")}</select>
            <button class="btn" id="btn-add-w">+ Добавить виджет</button>
            <input type="text" id="inp-preset-name" placeholder="Имя конфигурации..." style="width:170px;" />
            <button class="btn btn-primary" id="btn-save-preset">Сохранить пресет</button>
          </div>

          <div class="builder-grid" id="builder-grid">
            ${(isl.customWidgets || []).map((w, idx) => `
              <div class="builder-item span-${w.span}" draggable="true" data-idx="${idx}">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <strong style="font-size:12.5px;">${WIDGET_TYPES.find(([id]) => id === w.widgetType)?.[1] || w.widgetType}</strong>
                  <button class="btn" data-del-w="${idx}" style="padding:2px 7px;font-size:11px;">✕</button>
                </div>
                <div style="display:flex;gap:4px;">
                  ${[1, 2, 3].map((sp) => `<button class="seg-btn ${w.span === sp ? "active" : ""}" data-span="${idx}:${sp}">${sp}x</button>`).join("")}
                </div>
              </div>
            `).join("")}
          </div>

          ${(isl.customPresets || []).length ? `
            <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border-subtle);">
              <div class="setting-label" style="margin-bottom:8px;">Сохранённые конфигурации</div>
              <div class="btn-row" style="margin-top:0;">
                ${isl.customPresets.map((p) => `
                  <div style="display:flex;gap:4px;">
                    <button class="btn" data-load-p="${p.id}">${p.name}</button>
                    <button class="btn" data-del-p="${p.id}" style="padding:6px 8px;">✕</button>
                  </div>
                `).join("")}
              </div>
            </div>` : ""}
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-title">Погода (Open-Meteo)</div>
            <p class="card-desc">Текущий город: <strong>${isl.weather?.city || "Kyiv"}</strong></p>
            <div class="btn-row">
              <input type="text" id="inp-city" placeholder="Введите город..." value="${isl.weather?.city || "Kyiv"}" style="flex:1;" />
              <button class="btn btn-primary" id="btn-find-city">Найти</button>
            </div>
            <div id="city-results" class="btn-row"></div>
          </div>

          <div class="card">
            <div class="card-title">Календарь и Focus Timer</div>
            <div class="setting-row">
              <div class="setting-label">Длительность Focus (мин)</div>
              <input type="number" id="inp-focus-min" min="1" max="180" value="${isl.focusMinutes || 25}" style="width:76px;" />
            </div>
            <div class="btn-row">
              <input type="text" id="ev-title" placeholder="Событие..." style="flex:1;" />
              <input type="text" id="ev-time" placeholder="14:00" style="width:68px;" />
              <button class="btn" id="btn-add-ev">+ Добавить</button>
            </div>
            <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">
              ${(isl.calendarEvents || []).map((ev) => `
                <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);">
                  <span>${ev.date} ${ev.time} — ${ev.title}</span>
                  <button class="btn" data-del-ev="${ev.id}" style="padding:2px 6px;font-size:10px;">✕</button>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title" style="margin-bottom:8px;">Внешний вид и геометрия</div>
          <div class="setting-row">
            <div><div class="setting-label">Включить Dynamic Island</div></div>
            <label class="toggle"><input type="checkbox" id="i-en" ${isl.enabled ? "checked" : ""}/><span class="toggle-track"></span></label>
          </div>
          <div class="setting-row">
            <div><div class="setting-label">Оформление</div></div>
            <div class="segmented" id="i-theme">
              ${["obsidian", "graphite", "steel"].map((t) => `<button class="seg-btn ${isl.theme === t ? "active" : ""}" data-val="${t}">${t}</button>`).join("")}
            </div>
          </div>
          <div class="setting-row"><div class="setting-label">Скругление</div><div class="range-wrap"><input type="range" id="r-rad" min="12" max="34" step="2" value="${isl.borderRadius || 26}"/><span class="range-val">${isl.borderRadius || 26}px</span></div></div>
          <div class="setting-row"><div class="setting-label">Прозрачность</div><div class="range-wrap"><input type="range" id="r-op" min="0.55" max="1" step="0.02" value="${isl.opacity}"/><span class="range-val">${Math.round(isl.opacity * 100)}%</span></div></div>
        </div>
      </div>
    `;

    root.querySelectorAll(".mode-card").forEach((b) => {
      b.onclick = async () => {
        isl.activeMode = b.dataset.mode;
        await updateSettings((s) => (s.island.activeMode = b.dataset.mode));
        render();
      };
    });

    root.querySelector("#btn-test-exp").onclick = () => api.triggerIslandEvent("expanded", "", "");
    root.querySelector("#btn-test-notif").onclick = () =>
      api.triggerIslandEvent("notification", "Новое сообщение", "Island вернётся в выбранный режим через 4 сек", "Windows");

    root.querySelector("#btn-add-w").onclick = async () => {
      const wt = root.querySelector("#sel-add-w").value;
      const item = { id: "w_" + Date.now(), widgetType: wt, span: 1 };
      isl.customWidgets.push(item);
      await updateSettings((s) => s.island.customWidgets.push(item));
      render();
    };

    root.querySelectorAll("[data-del-w]").forEach((b) => {
      b.onclick = async () => {
        const idx = +b.dataset.delW;
        isl.customWidgets.splice(idx, 1);
        await updateSettings((s) => s.island.customWidgets.splice(idx, 1));
        render();
      };
    });

    root.querySelectorAll("[data-span]").forEach((b) => {
      b.onclick = async () => {
        const [idx, sp] = b.dataset.span.split(":").map(Number);
        isl.customWidgets[idx].span = sp;
        await updateSettings((s) => (s.island.customWidgets[idx].span = sp));
        render();
      };
    });

    root.querySelectorAll(".builder-item").forEach((el) => {
      el.ondragstart = () => { dragIdx = +el.dataset.idx; el.classList.add("dragging"); };
      el.ondragend = () => el.classList.remove("dragging");
      el.ondragover = (e) => e.preventDefault();
      el.ondrop = async () => {
        const targetIdx = +el.dataset.idx;
        if (dragIdx === null || dragIdx === targetIdx) return;
        const [moved] = isl.customWidgets.splice(dragIdx, 1);
        isl.customWidgets.splice(targetIdx, 0, moved);
        await updateSettings((s) => {
          const [m] = s.island.customWidgets.splice(dragIdx, 1);
          s.island.customWidgets.splice(targetIdx, 0, m);
        });
        dragIdx = null;
        render();
      };
    });

    root.querySelector("#btn-save-preset").onclick = async () => {
      const name = root.querySelector("#inp-preset-name").value.trim();
      if (!name) return showToast("Введите название конфигурации");
      const preset = { id: "p_" + Date.now(), name, widgets: structuredClone(isl.customWidgets) };
      isl.customPresets.push(preset);
      await updateSettings((s) => s.island.customPresets.push(preset));
      showToast("Конфигурация сохранена");
      render();
    };

    root.querySelectorAll("[data-load-p]").forEach((b) => {
      b.onclick = async () => {
        const p = isl.customPresets.find((x) => x.id === b.dataset.loadP);
        if (!p) return;
        isl.customWidgets = structuredClone(p.widgets);
        isl.activeMode = "custom";
        await updateSettings((s) => { s.island.customWidgets = structuredClone(p.widgets); s.island.activeMode = "custom"; });
        showToast("Загружена конфигурация: " + p.name);
        render();
      };
    });

    root.querySelectorAll("[data-del-p]").forEach((b) => {
      b.onclick = async () => {
        isl.customPresets = isl.customPresets.filter((x) => x.id !== b.dataset.delP);
        await updateSettings((s) => (s.island.customPresets = s.island.customPresets.filter((x) => x.id !== b.dataset.delP)));
        render();
      };
    });

    root.querySelector("#btn-find-city").onclick = async () => {
      const q = root.querySelector("#inp-city").value.trim();
      if (!q) return;
      try {
        const list = await searchCity(q);
        const box = root.querySelector("#city-results");
        if (!list.length) return showToast("Город не найден");
        box.innerHTML = list.map((c, i) => `<button class="btn" data-city="${i}">${c.name} (${c.country})</button>`).join("");
        box.querySelectorAll("[data-city]").forEach((btn) => {
          btn.onclick = async () => {
            const c = list[+btn.dataset.city];
            isl.weather = { city: c.name, lat: c.lat, lon: c.lon, refreshMinutes: 15 };
            await updateSettings((s) => (s.island.weather = structuredClone(isl.weather)));
            showToast("Город обновлён: " + c.name);
            render();
          };
        });
      } catch (err) { showToast("Ошибка поиска города"); }
    };

    root.querySelector("#inp-focus-min").onchange = (e) => {
      const v = Math.max(1, +e.target.value || 25);
      isl.focusMinutes = v;
      updateSettings((s) => (s.island.focusMinutes = v));
    };

    root.querySelector("#btn-add-ev").onclick = async () => {
      const title = root.querySelector("#ev-title").value.trim();
      const time = root.querySelector("#ev-time").value.trim() || "12:00";
      if (!title) return;
      const ev = { id: "e_" + Date.now(), title, time, date: new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) };
      isl.calendarEvents.push(ev);
      await updateSettings((s) => s.island.calendarEvents.push(ev));
      render();
    };

    root.querySelectorAll("[data-del-ev]").forEach((b) => {
      b.onclick = async () => {
        isl.calendarEvents = isl.calendarEvents.filter((x) => x.id !== b.dataset.delEv);
        await updateSettings((s) => (s.island.calendarEvents = s.island.calendarEvents.filter((x) => x.id !== b.dataset.delEv)));
        render();
      };
    });

    root.querySelector("#i-en").onchange = (e) => updateSettings((s) => (s.island.enabled = e.target.checked));
    root.querySelectorAll("#i-theme .seg-btn").forEach((b) => {
      b.onclick = () => {
        isl.theme = b.dataset.val;
        updateSettings((s) => (s.island.theme = b.dataset.val));
        render();
      };
    });
    root.querySelector("#r-rad").oninput = (e) => { isl.borderRadius = +e.target.value; updateSettings((s) => (s.island.borderRadius = +e.target.value)); };
    root.querySelector("#r-op").oninput = (e) => { isl.opacity = +e.target.value; updateSettings((s) => (s.island.opacity = +e.target.value)); };
  }

  render();
}