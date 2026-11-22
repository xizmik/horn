import { api, showToast } from "../api.js";

const PACKS = [
  { id: "obsidian", name: "Obsidian Mono", bg1: "#1c1f26", bg2: "#0a0b0e", stroke: "#d1d5db" },
  { id: "steel", name: "Brushed Steel", bg1: "#4b5563", bg2: "#1f242d", stroke: "#f3f4f6" },
  { id: "glass", name: "Frosted Glass", bg1: "rgba(255,255,255,0.22)", bg2: "rgba(255,255,255,0.06)", stroke: "#ffffff" },
];

export async function renderIcons(root) {
  let targets = await api.getIconTargets();
  let enabledCats = { desktop: true, apps: false, folders: true };
  let excluded = new Set();
  let customImg = null;
  let activePack = PACKS[0];
  let fx = { radius: 48, shadow: 18, glow: 0, glass: true, metallic: false };

  root.innerHTML = `
    <div class="page-header">
      <div class="page-kicker">ICON STUDIO • BATCH WIN32 SHELL</div>
      <h1 class="page-title">Icon Studio</h1>
      <p class="page-subtitle">Стилизация и массовое применение иконок для ярлыков, папок и пользовательских приложений с бэкапом.</p>
    </div>

    <div class="info-banner">
      HØRN безопасно обновляет ярлыки Рабочего стола (.lnk), папки (через <code>desktop.ini</code>) и ярлыки пользовательских приложений. Защищённые системные значки Windows (например, системные DLL Проводника) не затрагиваются во избежание поломки ОС.
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">Предпросмотр и эффекты (Icon Effects)</div>
        <div style="display:flex;justify-content:center;padding:16px 0;">
          <canvas id="icon-canvas" width="256" height="256" style="width:124px;height:124px;border-radius:16px;background:rgba(255,255,255,0.03);"></canvas>
        </div>
        <div class="setting-row"><div class="setting-label">Скругление</div><div class="range-wrap"><input type="range" id="fx-rad" min="0" max="110" value="48"/><span class="range-val" id="v-rad">48</span></div></div>
        <div class="setting-row"><div class="setting-label">Тень</div><div class="range-wrap"><input type="range" id="fx-sh" min="0" max="40" value="18"/><span class="range-val" id="v-sh">18</span></div></div>
        <div class="setting-row"><div class="setting-label">Свечение</div><div class="range-wrap"><input type="range" id="fx-gl" min="0" max="35" value="0"/><span class="range-val" id="v-gl">0</span></div></div>
        <div class="setting-row"><div class="setting-label">Матовое стекло</div><label class="toggle"><input type="checkbox" id="fx-glass" checked/><span class="toggle-track"></span></label></div>
        <div class="setting-row"><div class="setting-label">Металлический блеск</div><label class="toggle"><input type="checkbox" id="fx-metal"/><span class="toggle-track"></span></label></div>

        <div class="btn-row">
          ${PACKS.map((p) => `<button class="btn pack-btn" data-pack="${p.id}">${p.name}</button>`).join("")}
        </div>
        <div class="btn-row">
          <button class="btn" id="btn-upload-img">Загрузить свою картинку (PNG/JPG)</button>
          <input type="file" id="file-icon-img" accept="image/*" style="display:none;" />
        </div>
      </div>

      <div class="card">
        <div class="card-title">Apply to All Icons — Массовое применение</div>
        <div class="btn-row" style="margin-bottom:8px;">
          <label style="font-size:12px;display:flex;align-items:center;gap:6px;"><input type="checkbox" id="cat-desktop" checked/> Рабочий стол (.lnk)</label>
          <label style="font-size:12px;display:flex;align-items:center;gap:6px;"><input type="checkbox" id="cat-folders" checked/> Папки</label>
          <label style="font-size:12px;display:flex;align-items:center;gap:6px;"><input type="checkbox" id="cat-apps"/> Приложения (Пуск)</label>
        </div>

        <div style="font-size:12px;color:var(--text-secondary);" id="batch-count"></div>
        <div class="target-list" id="target-list"></div>

        <div class="progress-track" id="prog-wrap" style="display:none;"><div class="progress-fill" id="prog-fill"></div></div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px;" id="prog-status"></div>

        <div class="btn-row">
          <button class="btn btn-primary" id="btn-apply-all">Применить ко всем иконкам</button>
          <button class="btn" id="btn-restore-all">Восстановить все оригинальные иконки</button>
        </div>
      </div>
    </div>
  `;

  const canvas = root.querySelector("#icon-canvas");
  const ctx = canvas.getContext("2d");

  function drawPreview() {
    ctx.clearRect(0, 0, 256, 256);
    const pad = 28, size = 200, r = Math.min(fx.radius, size / 2);
    ctx.save();
    if (fx.shadow > 0) { ctx.shadowColor = "rgba(0,0,0,0.75)"; ctx.shadowBlur = fx.shadow; ctx.shadowOffsetY = fx.shadow * 0.35; }
    if (fx.glow > 0) { ctx.shadowColor = "rgba(220,230,245,0.65)"; ctx.shadowBlur = fx.glow; ctx.shadowOffsetY = 0; }
    ctx.beginPath(); ctx.roundRect(pad, pad, size, size, r);
    const grad = ctx.createLinearGradient(pad, pad, pad + size, pad + size);
    grad.addColorStop(0, activePack.bg1); grad.addColorStop(1, activePack.bg2);
    ctx.fillStyle = grad; ctx.fill(); ctx.restore();

    ctx.save(); ctx.beginPath(); ctx.roundRect(pad, pad, size, size, r); ctx.clip();
    if (customImg) ctx.drawImage(customImg, pad, pad, size, size);
    else {
      ctx.strokeStyle = activePack.stroke; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(128, 128, 44, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(92, 164); ctx.lineTo(164, 92); ctx.stroke();
    }
    if (fx.glass) {
      const g = ctx.createLinearGradient(pad, pad, pad, pad + size * 0.55);
      g.addColorStop(0, "rgba(255,255,255,0.22)"); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g; ctx.fillRect(pad, pad, size, size * 0.55);
    }
    if (fx.metallic) {
      const m = ctx.createLinearGradient(pad, pad, pad + size, pad + size);
      m.addColorStop(0, "rgba(255,255,255,0)"); m.addColorStop(0.5, "rgba(255,255,255,0.28)"); m.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = m; ctx.fillRect(pad, pad, size, size);
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(pad, pad, size, size, r); ctx.stroke();
  }

  function getSelectedTargets() {
    return targets.filter((t) => enabledCats[t.category] && !excluded.has(t.path));
  }

  function renderTargets() {
    const visible = targets.filter((t) => enabledCats[t.category]);
    const selected = getSelectedTargets();
    root.querySelector("#batch-count").innerHTML =
      `Будет изменено иконок: <strong>${selected.length}</strong> из ${visible.length}`;

    const listEl = root.querySelector("#target-list");
    listEl.innerHTML = visible.map((t) => `
      <div class="target-row">
        <label style="display:flex;align-items:center;gap:8px;min-width:0;cursor:pointer;">
          <input type="checkbox" data-inc="${t.path}" ${!excluded.has(t.path) ? "checked" : ""}/>
          <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.name}</span>
        </label>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <span class="nav-pill">${t.category}</span>
          ${t.hasBackup ? `<button class="btn" data-res-one="${t.path}|${t.targetKind}" style="padding:3px 7px;font-size:10.5px;">Откат</button>` : ""}
        </div>
      </div>
    `).join("") || `<div class="card-desc">В выбранных категориях элементы не найдены.</div>`;

    listEl.querySelectorAll("[data-inc]").forEach((cb) => {
      cb.onchange = () => {
        if (cb.checked) excluded.delete(cb.dataset.inc);
        else excluded.add(cb.dataset.inc);
        renderTargets();
      };
    });

    listEl.querySelectorAll("[data-res-one]").forEach((btn) => {
      btn.onclick = async () => {
        const [p, k] = btn.dataset.resOne.split("|");
        try {
          await api.restoreTargetIcon(p, k);
          targets = await api.getIconTargets();
          renderTargets();
          showToast("Оригинальная иконка восстановлена");
        } catch (err) { showToast("Ошибка: " + err); }
      };
    });
  }

  drawPreview();
  renderTargets();

  root.querySelector("#fx-rad").oninput = (e) => { fx.radius = +e.target.value; root.querySelector("#v-rad").textContent = fx.radius; drawPreview(); };
  root.querySelector("#fx-sh").oninput = (e) => { fx.shadow = +e.target.value; root.querySelector("#v-sh").textContent = fx.shadow; drawPreview(); };
  root.querySelector("#fx-gl").oninput = (e) => { fx.glow = +e.target.value; root.querySelector("#v-gl").textContent = fx.glow; drawPreview(); };
  root.querySelector("#fx-glass").onchange = (e) => { fx.glass = e.target.checked; drawPreview(); };
  root.querySelector("#fx-metal").onchange = (e) => { fx.metallic = e.target.checked; drawPreview(); };

  root.querySelectorAll(".pack-btn").forEach((b) => (b.onclick = () => {
    activePack = PACKS.find((p) => p.id === b.dataset.pack) || PACKS[0];
    customImg = null; drawPreview();
  }));
  root.querySelector("#btn-upload-img").onclick = () => root.querySelector("#file-icon-img").click();
  root.querySelector("#file-icon-img").onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => { customImg = img; drawPreview(); }; img.src = r.result; };
    r.readAsDataURL(f);
  };

  root.querySelector("#cat-desktop").onchange = (e) => { enabledCats.desktop = e.target.checked; renderTargets(); };
  root.querySelector("#cat-folders").onchange = (e) => { enabledCats.folders = e.target.checked; renderTargets(); };
  root.querySelector("#cat-apps").onchange = (e) => { enabledCats.apps = e.target.checked; renderTargets(); };

  root.querySelector("#btn-apply-all").onclick = async () => {
    const batch = getSelectedTargets();
    if (!batch.length) return showToast("Не выбрано ни одной иконки");
    const png = canvas.toDataURL("image/png");
    const wrap = root.querySelector("#prog-wrap");
    const fill = root.querySelector("#prog-fill");
    const status = root.querySelector("#prog-status");
    wrap.style.display = "block";

    let ok = 0, fail = 0;
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      status.textContent = `Применение (${i + 1}/${batch.length}): ${item.name}`;
      fill.style.width = `${Math.round(((i + 1) / batch.length) * 100)}%`;
      try {
        await api.applyIconToTarget(item.path, item.targetKind, png);
        ok++;
      } catch (e) { fail++; }
    }
    status.textContent = `Готово: обновлено ${ok}, ошибок ${fail}`;
    showToast(`Обновлено иконок: ${ok}${fail ? `, ошибок: ${fail}` : ""}`);
    targets = await api.getIconTargets();
    renderTargets();
  };

  root.querySelector("#btn-restore-all").onclick = async () => {
    try {
      const msg = await api.restoreAllShortcutIcons();
      targets = await api.getIconTargets();
      renderTargets();
      showToast(msg);
    } catch (err) { showToast("Ошибка: " + err); }
  };
}