import { api, showToast } from "../api.js";

const PACKS = [
  { id: "obsidian", name: "Obsidian Mono", bg1: "#1c1f26", bg2: "#0a0b0e", stroke: "#d1d5db" },
  { id: "steel", name: "Brushed Steel", bg1: "#4b5563", bg2: "#1f242d", stroke: "#f3f4f6" },
  { id: "glass", name: "Frosted Glass", bg1: "rgba(255,255,255,0.22)", bg2: "rgba(255,255,255,0.06)", stroke: "#ffffff" },
];

export async function renderIcons(root) {
  let shortcuts = await api.getDesktopShortcuts();
  let selectedShortcut = shortcuts[0]?.path || "";
  let customImg = null;
  let activePack = PACKS[0];
  let fx = { radius: 48, shadow: 18, glow: 0, glass: true, metallic: false };

  root.innerHTML = `
    <div class="page-header">
      <div class="page-kicker">ICON STUDIO вЂў WIN32 SHELL</div>
      <h1 class="page-title">Icon Studio</h1>
      <p class="page-subtitle">РЎС‚РёР»РёР·Р°С†РёСЏ Рё СЂРµР°Р»СЊРЅР°СЏ Р·Р°РјРµРЅР° РёРєРѕРЅРѕРє СЏСЂР»С‹РєРѕРІ Windows (.lnk) СЃ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРёРј СЂРµР·РµСЂРІРЅС‹Рј РєРѕРїРёСЂРѕРІР°РЅРёРµРј.</p>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">РџСЂРµРґРїСЂРѕСЃРјРѕС‚СЂ Рё СЌС„С„РµРєС‚С‹ (Icon Effects)</div>
        <div style="display:flex;justify-content:center;padding:18px 0;">
          <canvas id="icon-canvas" width="256" height="256" style="width:128px;height:128px;border-radius:16px;background:rgba(255,255,255,0.03);"></canvas>
        </div>
        <div class="setting-row"><div class="setting-label">РЎРєСЂСѓРіР»РµРЅРёРµ</div><div class="range-wrap"><input type="range" id="fx-rad" min="0" max="110" value="48"/><span class="range-val" id="v-rad">48</span></div></div>
        <div class="setting-row"><div class="setting-label">РўРµРЅСЊ</div><div class="range-wrap"><input type="range" id="fx-sh" min="0" max="40" value="18"/><span class="range-val" id="v-sh">18</span></div></div>
        <div class="setting-row"><div class="setting-label">РЎРІРµС‡РµРЅРёРµ</div><div class="range-wrap"><input type="range" id="fx-gl" min="0" max="35" value="0"/><span class="range-val" id="v-gl">0</span></div></div>
        <div class="setting-row"><div class="setting-label">РњР°С‚РѕРІРѕРµ СЃС‚РµРєР»Рѕ</div><label class="toggle"><input type="checkbox" id="fx-glass" checked/><span class="toggle-track"></span></label></div>
        <div class="setting-row"><div class="setting-label">РњРµС‚Р°Р»Р»РёС‡РµСЃРєРёР№ Р±Р»РµСЃРє</div><label class="toggle"><input type="checkbox" id="fx-metal"/><span class="toggle-track"></span></label></div>
      </div>

      <div class="section-stack">
        <div class="card">
          <div class="card-title">РСЃС‚РѕС‡РЅРёРє РёРєРѕРЅРєРё (Icon Replacement)</div>
          <div class="btn-row" style="margin-bottom:12px;">
            ${PACKS.map(p => `<button class="btn pack-btn" data-pack="${p.id}">${p.name}</button>`).join("")}
          </div>
          <button class="btn" id="btn-upload-img">Р—Р°РіСЂСѓР·РёС‚СЊ СЃРІРѕСЋ РєР°СЂС‚РёРЅРєСѓ (PNG/JPG)</button>
          <input type="file" id="file-icon-img" accept="image/*" style="display:none;" />
        </div>

        <div class="card">
          <div class="card-title">Р’С‹Р±РѕСЂ СЏСЂР»С‹РєР° Windows (.lnk)</div>
          <p class="card-desc" style="margin-bottom:10px;">РќР°Р№РґРµРЅРѕ СЏСЂР»С‹РєРѕРІ РЅР° Р Р°Р±РѕС‡РµРј СЃС‚РѕР»Рµ: ${shortcuts.length}</p>
          <select id="sel-shortcut" style="width:100%;margin-bottom:10px;">
            ${shortcuts.map(s => `<option value="${s.path}">${s.name}${s.hasBackup ? " (РёР·РјРµРЅС‘РЅ)" : ""}</option>`).join("")}
          </select>
          <div class="btn-row">
            <button class="btn" id="btn-browse-lnk">Р’С‹Р±СЂР°С‚СЊ РґСЂСѓРіРѕР№ .lnk</button>
            <button class="btn btn-primary" id="btn-apply-icon">РџСЂРёРјРµРЅРёС‚СЊ Рє СЏСЂР»С‹РєСѓ</button>
          </div>
          <div class="btn-row">
            <button class="btn" id="btn-restore-one">Р’РѕСЃСЃС‚Р°РЅРѕРІРёС‚СЊ РІС‹Р±СЂР°РЅРЅС‹Р№</button>
            <button class="btn" id="btn-restore-all">Р’РѕСЃСЃС‚Р°РЅРѕРІРёС‚СЊ РІСЃРµ</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const canvas = root.querySelector("#icon-canvas");
  const ctx = canvas.getContext("2d");

  function drawPreview() {
    ctx.clearRect(0, 0, 256, 256);
    const pad = 28;
    const size = 256 - pad * 2;
    const r = Math.min(fx.radius, size / 2);

    ctx.save();
    if (fx.shadow > 0) {
      ctx.shadowColor = "rgba(0,0,0,0.75)";
      ctx.shadowBlur = fx.shadow;
      ctx.shadowOffsetY = fx.shadow * 0.35;
    }
    if (fx.glow > 0) {
      ctx.shadowColor = "rgba(220,230,245,0.65)";
      ctx.shadowBlur = fx.glow;
      ctx.shadowOffsetY = 0;
    }

    ctx.beginPath();
    ctx.roundRect(pad, pad, size, size, r);
    const grad = ctx.createLinearGradient(pad, pad, pad + size, pad + size);
    grad.addColorStop(0, activePack.bg1);
    grad.addColorStop(1, activePack.bg2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pad, pad, size, size, r);
    ctx.clip();

    if (customImg) {
      ctx.drawImage(customImg, pad, pad, size, size);
    } else {
      ctx.strokeStyle = activePack.stroke;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(128, 128, 44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(92, 164); ctx.lineTo(164, 92);
      ctx.stroke();
    }

    if (fx.glass) {
      const g = ctx.createLinearGradient(pad, pad, pad, pad + size * 0.55);
      g.addColorStop(0, "rgba(255,255,255,0.22)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(pad, pad, size, size * 0.55);
    }
    if (fx.metallic) {
      const m = ctx.createLinearGradient(pad, pad, pad + size, pad + size);
      m.addColorStop(0, "rgba(255,255,255,0)");
      m.addColorStop(0.5, "rgba(255,255,255,0.28)");
      m.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = m;
      ctx.fillRect(pad, pad, size, size);
    }
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(pad, pad, size, size, r);
    ctx.stroke();
  }

  drawPreview();

  root.querySelector("#fx-rad").oninput = (e) => { fx.radius = +e.target.value; root.querySelector("#v-rad").textContent = fx.radius; drawPreview(); };
  root.querySelector("#fx-sh").oninput = (e) => { fx.shadow = +e.target.value; root.querySelector("#v-sh").textContent = fx.shadow; drawPreview(); };
  root.querySelector("#fx-gl").oninput = (e) => { fx.glow = +e.target.value; root.querySelector("#v-gl").textContent = fx.glow; drawPreview(); };
  root.querySelector("#fx-glass").onchange = (e) => { fx.glass = e.target.checked; drawPreview(); };
  root.querySelector("#fx-metal").onchange = (e) => { fx.metallic = e.target.checked; drawPreview(); };

  root.querySelectorAll(".pack-btn").forEach(b => b.onclick = () => {
    activePack = PACKS.find(p => p.id === b.dataset.pack) || PACKS[0];
    customImg = null; drawPreview();
  });

  root.querySelector("#btn-upload-img").onclick = () => root.querySelector("#file-icon-img").click();
  root.querySelector("#file-icon-img").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => { customImg = img; drawPreview(); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const sel = root.querySelector("#sel-shortcut");
  sel.onchange = () => { selectedShortcut = sel.value; };

  root.querySelector("#btn-browse-lnk").onclick = async () => {
    const p = await api.browseShortcutFile();
    if (p) { selectedShortcut = p; showToast("Р’С‹Р±СЂР°РЅ: " + p.split("\\").pop()); }
  };

  root.querySelector("#btn-apply-icon").onclick = async () => {
    if (!selectedShortcut) return showToast("РЎРЅР°С‡Р°Р»Р° РІС‹Р±РµСЂРёС‚Рµ СЏСЂР»С‹Рє .lnk");
    try {
      const png = canvas.toDataURL("image/png");
      const res = await api.applyIconToShortcut(selectedShortcut, png);
      showToast(res);
    } catch (err) { showToast("РћС€РёР±РєР°: " + err); }
  };

  root.querySelector("#btn-restore-one").onclick = async () => {
    if (!selectedShortcut) return;
    try { showToast(await api.restoreIconForShortcut(selectedShortcut)); }
    catch (err) { showToast("РћС€РёР±РєР°: " + err); }
  };

  root.querySelector("#btn-restore-all").onclick = async () => {
    try { showToast(await api.restoreAllShortcutIcons()); }
    catch (err) { showToast("РћС€РёР±РєР°: " + err); }
  };
}