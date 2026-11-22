import { api } from "../api.js";

export function renderHome(root, { settings, navigate }) {
  root.innerHTML = `
    <div class="page-header">
      <div class="page-kicker">WINDOWS VISUAL PLATFORM вЂў v0.2</div>
      <h1 class="page-title">РџР°РЅРµР»СЊ СѓРїСЂР°РІР»РµРЅРёСЏ HГRN</h1>
      <p class="page-subtitle">Р’СЃРµ РєР»СЋС‡РµРІС‹Рµ СЃС‚СѓРґРёРё Р°РєС‚РёРІРЅС‹ Рё СЂР°Р±РѕС‚Р°СЋС‚ РЅР°РїСЂСЏРјСѓСЋ СЃ СЃРёСЃС‚РµРјРЅС‹РјРё РјРµС…Р°РЅРёР·РјР°РјРё Windows.</p>
    </div>

    <div class="grid-2">
      <div class="card interactive" id="c-island">
        <div class="card-title">Dynamic Island</div>
        <p class="card-desc">РџР»Р°РІР°СЋС‰РёР№ РѕСЃС‚СЂРѕРІ СЃ Р¶РёРІС‹Рј РјРѕРЅРёС‚РѕСЂРёРЅРіРѕРј CPU, RAM, GPU, С‚РµРјРїРµСЂР°С‚СѓСЂ, Р±Р°С‚Р°СЂРµРё, СЃРµС‚Рё Рё С„РѕРєСѓСЃ-С‚Р°Р№РјРµСЂРѕРј.</p>
        <div class="roadmap-tag">${settings.island.enabled ? "РђРєС‚РёРІРµРЅ" : "РћС‚РєР»СЋС‡С‘РЅ"}</div>
      </div>
      <div class="card interactive" id="c-icons">
        <div class="card-title">Icon Studio</div>
        <p class="card-desc">Р­С„С„РµРєС‚С‹ СЃС‚РµРєР»Р° Рё РјРµС‚Р°Р»Р»Р° РґР»СЏ РёРєРѕРЅРѕРє, СЂРµР°Р»СЊРЅР°СЏ Р·Р°РјРµРЅР° СЏСЂР»С‹РєРѕРІ Windows Рё Р±РµР·РѕРїР°СЃРЅС‹Р№ РѕС‚РєР°С‚.</p>
        <div class="roadmap-tag">РђРєС‚РёРІРЅРѕ</div>
      </div>
      <div class="card interactive" id="c-taskbar">
        <div class="card-title">Taskbar Studio</div>
        <p class="card-desc">РџСЂРѕР·СЂР°С‡РЅРѕСЃС‚СЊ, Blur/Acrylic, РІС‹СЂР°РІРЅРёРІР°РЅРёРµ Рё СЃРёСЃС‚РµРјРЅС‹Рµ СЌР»РµРјРµРЅС‚С‹ РїР°РЅРµР»Рё Р·Р°РґР°С‡ СЃ Р±СЌРєР°РїРѕРј.</p>
        <div class="roadmap-tag">РђРєС‚РёРІРЅРѕ</div>
      </div>
      <div class="card interactive" id="c-wallpapers">
        <div class="card-title">Wallpaper Studio</div>
        <p class="card-desc">РљРѕР»Р»РµРєС†РёРё РѕР±РѕРµРІ, СЂРµР¶РёРјС‹ РїРѕРґРіРѕРЅРєРё РїРѕРґ РјРѕРЅРёС‚РѕСЂ, РёР·Р±СЂР°РЅРЅРѕРµ Рё Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєР°СЏ СЃРјРµРЅР° РїРѕ РїР»РµР№Р»РёСЃС‚Сѓ.</p>
        <div class="roadmap-tag">РђРєС‚РёРІРЅРѕ</div>
      </div>
    </div>

    <div class="card" style="margin-top: 15px;">
      <div class="card-title">Р‘С‹СЃС‚СЂС‹Р№ С‚РµСЃС‚ Dynamic Island</div>
      <div class="btn-row">
        <button class="btn btn-primary" id="q-notif">РЈРІРµРґРѕРјР»РµРЅРёРµ</button>
        <button class="btn" id="q-act">Р¤РѕРєСѓСЃ-С‚Р°Р№РјРµСЂ</button>
        <button class="btn" id="q-exp">Р Р°СЃРєСЂС‹С‚СЊ С‚РµР»РµРјРµС‚СЂРёСЋ</button>
      </div>
    </div>
  `;
  root.querySelector("#c-island").onclick = () => navigate("island");
  root.querySelector("#c-icons").onclick = () => navigate("icons");
  root.querySelector("#c-taskbar").onclick = () => navigate("taskbar");
  root.querySelector("#c-wallpapers").onclick = () => navigate("wallpapers");
  root.querySelector("#q-notif").onclick = () => api.triggerIslandEvent("notification", "HГRN v0.2", "Р’СЃРµ РјРѕРґСѓР»Рё СЃРёРЅС…СЂРѕРЅРёР·РёСЂРѕРІР°РЅС‹");
  root.querySelector("#q-act").onclick = () => api.triggerIslandEvent("activity", "Р¤РѕРєСѓСЃ-СЃРµСЃСЃРёСЏ", "");
  root.querySelector("#q-exp").onclick = () => api.triggerIslandEvent("expanded", "", "");
}