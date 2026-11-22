import { api, showToast } from "../api.js";

export function renderTaskbar(root, { settings, osCompat, updateSettings }) {
  const tb = settings.taskbar;

  root.innerHTML = `
    <div class="page-header">
      <div class="page-kicker">TASKBAR STUDIO вЂў DWM ENGINE</div>
      <h1 class="page-title">Taskbar Studio</h1>
      <p class="page-subtitle">РќР°СЃС‚РѕСЏС‰РµРµ СѓРїСЂР°РІР»РµРЅРёРµ РїСЂРѕР·СЂР°С‡РЅРѕСЃС‚СЊСЋ, СЂР°Р·РјС‹С‚РёРµРј Рё СЌР»РµРјРµРЅС‚Р°РјРё СЃРёСЃС‚РµРјРЅРѕР№ РїР°РЅРµР»Рё Р·Р°РґР°С‡ Windows.</p>
    </div>

    <div class="info-banner">
      РћРїСЂРµРґРµР»РµРЅР° СЃРёСЃС‚РµРјР°: <strong>${osCompat.osLabel}</strong>.
      ${osCompat.isWindows11
        ? "РџРѕРґРґРµСЂР¶РёРІР°СЋС‚СЃСЏ РїСЂРѕР·СЂР°С‡РЅРѕСЃС‚СЊ/Blur/Acrylic, РІС‹СЂР°РІРЅРёРІР°РЅРёРµ Рё СЌР»РµРјРµРЅС‚С‹ РїР°РЅРµР»Рё. РР·РјРµРЅРµРЅРёРµ РїРѕР»РѕР¶РµРЅРёСЏ Рё СЂР°Р·РјРµСЂР° РёРєРѕРЅРѕРє РѕРіСЂР°РЅРёС‡РµРЅРѕ СЃР°РјРѕР№ Windows 11."
        : "РџРѕРґРґРµСЂР¶РёРІР°СЋС‚СЃСЏ РїСЂРѕР·СЂР°С‡РЅРѕСЃС‚СЊ/Blur/Acrylic, СЂР°Р·РјРµСЂ РёРєРѕРЅРѕРє Рё СЃРёСЃС‚РµРјРЅС‹Рµ СЌР»РµРјРµРЅС‚С‹."}
    </div>

    <div class="section-stack">
      <div class="card">
        <div class="card-title" style="margin-bottom:10px;">РџСЂРµРґРїСЂРѕСЃРјРѕС‚СЂ РїР°РЅРµР»Рё Р·Р°РґР°С‡</div>
        <div class="taskbar-preview" id="tb-preview">
          <div class="tb-icon"></div><div class="tb-icon"></div><div class="tb-icon"></div><div class="tb-icon"></div>
        </div>
      </div>

      <div class="card">
        <div class="setting-row">
          <div><div class="setting-label">Р­С„С„РµРєС‚ РїРѕРІРµСЂС…РЅРѕСЃС‚Рё</div><div class="setting-hint">SetWindowCompositionAttribute (DWM)</div></div>
          <div class="segmented" id="tb-effect">
            ${[["normal","РЎС‚Р°РЅРґР°СЂС‚"],["transparent","РџСЂРѕР·СЂР°С‡РЅС‹Р№"],["blur","Blur"],["acrylic","Acrylic"]].map(([v,l]) =>
              `<button class="seg-btn ${tb.effect === v ? "active" : ""}" data-val="${v}">${l}</button>`
            ).join("")}
          </div>
        </div>
        <div class="setting-row">
          <div><div class="setting-label">Р¦РІРµС‚ С‚РѕРЅРёСЂРѕРІР°РЅРёСЏ Рё РїСЂРѕР·СЂР°С‡РЅРѕСЃС‚СЊ</div></div>
          <div style="display:flex;align-items:center;gap:12px;">
            <input type="color" id="tb-color" value="${tb.colorHex}"/>
            <input type="range" id="tb-op" min="0" max="255" value="${tb.opacity}"/>
            <span class="range-val" id="v-tb-op">${Math.round((tb.opacity/255)*100)}%</span>
          </div>
        </div>
        ${osCompat.supportsAlignment ? `
        <div class="setting-row">
          <div><div class="setting-label">Р’С‹СЂР°РІРЅРёРІР°РЅРёРµ РёРєРѕРЅРѕРє (Windows 11)</div></div>
          <div class="segmented" id="tb-align">
            <button class="seg-btn ${tb.alignment === "left" ? "active" : ""}" data-val="left">РЎР»РµРІР°</button>
            <button class="seg-btn ${tb.alignment === "center" ? "active" : ""}" data-val="center">РџРѕ С†РµРЅС‚СЂСѓ</button>
          </div>
        </div>` : ""}
        <div class="setting-row">
          <div><div class="setting-label">РљРЅРѕРїРєР° РїРѕРёСЃРєР°</div></div>
          <label class="toggle"><input type="checkbox" id="tb-search" ${tb.showSearch ? "checked" : ""}/><span class="toggle-track"></span></label>
        </div>
        <div class="setting-row">
          <div><div class="setting-label">РџСЂРµРґСЃС‚Р°РІР»РµРЅРёРµ Р·Р°РґР°С‡ (Task View)</div></div>
          <label class="toggle"><input type="checkbox" id="tb-tv" ${tb.showTaskView ? "checked" : ""}/><span class="toggle-track"></span></label>
        </div>
        <div class="setting-row">
          <div><div class="setting-label">Р’РёРґР¶РµС‚С‹</div></div>
          <label class="toggle"><input type="checkbox" id="tb-wid" ${tb.showWidgets ? "checked" : ""}/><span class="toggle-track"></span></label>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="btn-tb-apply">РџСЂРёРјРµРЅРёС‚СЊ Рє Windows</button>
          <button class="btn" id="btn-tb-restore">Р’РѕСЃСЃС‚Р°РЅРѕРІРёС‚СЊ РёСЃС…РѕРґРЅРѕРµ СЃРѕСЃС‚РѕСЏРЅРёРµ</button>
        </div>
      </div>
    </div>
  `;

  function updatePreview() {
    const prev = root.querySelector("#tb-preview");
    const alpha = (tb.opacity / 255).toFixed(2);
    prev.style.justifyContent = tb.alignment === "left" ? "flex-start" : "center";
    prev.style.background = tb.effect === "transparent" ? "rgba(255,255,255,0.03)" : tb.colorHex;
    prev.style.opacity = tb.effect === "normal" ? "1" : Math.max(0.3, alpha);
  }
  updatePreview();

  root.querySelectorAll("#tb-effect .seg-btn").forEach(b => b.onclick = () => {
    root.querySelectorAll("#tb-effect .seg-btn").forEach(x => x.classList.remove("active"));
    b.classList.add("active"); tb.effect = b.dataset.val;
    updateSettings(s => s.taskbar.effect = tb.effect); updatePreview();
  });
  root.querySelector("#tb-color").oninput = (e) => { tb.colorHex = e.target.value; updateSettings(s => s.taskbar.colorHex = tb.colorHex); updatePreview(); };
  root.querySelector("#tb-op").oninput = (e) => {
    tb.opacity = +e.target.value; root.querySelector("#v-tb-op").textContent = `${Math.round((tb.opacity/255)*100)}%`;
    updateSettings(s => s.taskbar.opacity = tb.opacity); updatePreview();
  };
  root.querySelectorAll("#tb-align .seg-btn").forEach(b => b.onclick = () => {
    root.querySelectorAll("#tb-align .seg-btn").forEach(x => x.classList.remove("active"));
    b.classList.add("active"); tb.alignment = b.dataset.val;
    updateSettings(s => s.taskbar.alignment = tb.alignment); updatePreview();
  });
  root.querySelector("#tb-search").onchange = (e) => updateSettings(s => s.taskbar.showSearch = e.target.checked);
  root.querySelector("#tb-tv").onchange = (e) => updateSettings(s => s.taskbar.showTaskView = e.target.checked);
  root.querySelector("#tb-wid").onchange = (e) => updateSettings(s => s.taskbar.showWidgets = e.target.checked);

  root.querySelector("#btn-tb-apply").onclick = async () => {
    try { showToast(await api.applyTaskbarSettings(settings.taskbar)); }
    catch (err) { showToast("РћС€РёР±РєР°: " + err); }
  };
  root.querySelector("#btn-tb-restore").onclick = async () => {
    try { showToast(await api.restoreTaskbarDefaults()); }
    catch (err) { showToast("РћС€РёР±РєР°: " + err); }
  };
}