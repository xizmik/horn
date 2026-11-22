import { api, showToast } from "../api.js";

export function renderWallpapers(root, { settings, updateSettings }) {
  let filter = "all";
  const wp = settings.wallpaper;

  async function renderList() {
    const grid = root.querySelector("#wall-grid");
    const items = wp.items.filter(it => filter === "all" || (filter === "fav" && it.favorite));
    if (!items.length) {
      grid.innerHTML = `<div class="card-desc">РљРѕР»Р»РµРєС†РёСЏ РїСѓСЃС‚Р°. РќР°Р¶РјРёС‚Рµ В«Р”РѕР±Р°РІРёС‚СЊ РёР·РѕР±СЂР°Р¶РµРЅРёСЏВ», С‡С‚РѕР±С‹ РІС‹Р±СЂР°С‚СЊ РѕР±РѕРё СЃ РєРѕРјРїСЊСЋС‚РµСЂР°.</div>`;
      return;
    }
    grid.innerHTML = "";
    for (const it of items) {
      const card = document.createElement("div");
      card.className = "wall-card";
      const inPl = wp.slideshowPlaylist.includes(it.path);
      card.innerHTML = `
        <img class="wall-thumb" id="img-${it.id}" alt="${it.name}"/>
        <div class="wall-meta">
          <div class="wall-name" title="${it.path}">${it.name}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-primary" data-set="${it.path}" style="padding:5px 9px;font-size:11px;">РЈСЃС‚Р°РЅРѕРІРёС‚СЊ</button>
            <button class="btn" data-fav="${it.id}" style="padding:5px 8px;font-size:11px;">${it.favorite ? "в…" : "в†"}</button>
            <button class="btn" data-pl="${it.path}" style="padding:5px 8px;font-size:11px;">${inPl ? "Р’ РїР»РµР№Р»РёСЃС‚Рµ" : "+ РџР»РµР№Р»РёСЃС‚"}</button>
            <button class="btn" data-del="${it.id}" style="padding:5px 8px;font-size:11px;">вњ•</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
      api.readImageDataUrl(it.path).then(url => {
        const img = card.querySelector(`#img-${it.id}`);
        if (img) img.src = url;
      }).catch(() => {});
    }

    grid.querySelectorAll("[data-set]").forEach(b => b.onclick = async () => {
      try {
        await api.applyWallpaperNow(b.dataset.set, wp.fitMode);
        await updateSettings(s => s.wallpaper.activePath = b.dataset.set);
        showToast("РћР±РѕРё СѓСЃС‚Р°РЅРѕРІР»РµРЅС‹ РЅР° СЂР°Р±РѕС‡РёР№ СЃС‚РѕР»");
      } catch (err) { showToast("РћС€РёР±РєР°: " + err); }
    });
    grid.querySelectorAll("[data-fav]").forEach(b => b.onclick = async () => {
      await updateSettings(s => {
        const x = s.wallpaper.items.find(i => i.id === b.dataset.fav);
        if (x) x.favorite = !x.favorite;
      });
      renderList();
    });
    grid.querySelectorAll("[data-pl]").forEach(b => b.onclick = async () => {
      const p = b.dataset.pl;
      await updateSettings(s => {
        const idx = s.wallpaper.slideshowPlaylist.indexOf(p);
        if (idx >= 0) s.wallpaper.slideshowPlaylist.splice(idx, 1);
        else s.wallpaper.slideshowPlaylist.push(p);
      });
      renderList();
    });
    grid.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
      await updateSettings(s => {
        s.wallpaper.items = s.wallpaper.items.filter(i => i.id !== b.dataset.del);
      });
      renderList();
    });
  }

  root.innerHTML = `
    <div class="page-header">
      <div class="page-kicker">WALLPAPER STUDIO вЂў DESKTOP ENGINE</div>
      <h1 class="page-title">Wallpaper Studio</h1>
      <p class="page-subtitle">РЈРїСЂР°РІР»РµРЅРёРµ РєРѕР»Р»РµРєС†РёСЏРјРё РѕР±РѕРµРІ, РїРѕРґРіРѕРЅРєРѕР№ РїРѕРґ СЌРєСЂР°РЅ Рё Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРѕР№ СЃРјРµРЅРѕР№ РїРѕ РїР»РµР№Р»РёСЃС‚Сѓ.</p>
    </div>

    <div class="section-stack">
      <div class="card">
        <div class="setting-row">
          <div><div class="setting-label">Р РµР¶РёРј РїРѕРґРіРѕРЅРєРё РїРѕРґ СЌРєСЂР°РЅ</div></div>
          <div class="segmented" id="wp-fit">
            ${[["fill","Р—Р°РїРѕР»РЅРµРЅРёРµ"],["fit","Р’РїРёСЃР°С‚СЊ"],["stretch","Р Р°СЃС‚СЏРЅСѓС‚СЊ"],["center","РџРѕ С†РµРЅС‚СЂСѓ"]].map(([v,l]) =>
              `<button class="seg-btn ${wp.fitMode === v ? "active" : ""}" data-val="${v}">${l}</button>`
            ).join("")}
          </div>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">РђРІС‚РѕРјР°С‚РёС‡РµСЃРєР°СЏ СЃРјРµРЅР° РѕР±РѕРµРІ</div>
            <div class="setting-hint">Р’ РїР»РµР№Р»РёСЃС‚Рµ РёР·РѕР±СЂР°Р¶РµРЅРёР№: ${wp.slideshowPlaylist.length}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <input type="number" id="wp-int" min="10" value="${wp.slideshowIntervalSec}" style="width:80px;" title="РРЅС‚РµСЂРІР°Р» (СЃРµРє)"/>
            <span style="font-size:12px;color:var(--text-muted);">СЃРµРє</span>
            <label class="toggle"><input type="checkbox" id="wp-slide" ${wp.slideshowEnabled ? "checked" : ""}/><span class="toggle-track"></span></label>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="btn-add-wp">Р”РѕР±Р°РІРёС‚СЊ РёР·РѕР±СЂР°Р¶РµРЅРёСЏ СЃ РџРљ</button>
          <button class="btn" id="btn-f-all">Р’СЃРµ (${wp.items.length})</button>
          <button class="btn" id="btn-f-fav">РР·Р±СЂР°РЅРЅРѕРµ</button>
        </div>
      </div>

      <div class="grid-3" id="wall-grid"></div>
    </div>
  `;

  root.querySelector("#btn-add-wp").onclick = async () => {
    const paths = await api.pickWallpapers();
    if (!paths.length) return;
    await updateSettings(s => {
      for (const p of paths) {
        if (!s.wallpaper.items.some(i => i.path === p)) {
          s.wallpaper.items.push({
            id: "w_" + Math.random().toString(36).slice(2, 9),
            name: p.split("\\").pop() || p,
            path: p, collection: "Default", favorite: false, kind: "static"
          });
        }
      }
    });
    renderList();
  };

  root.querySelectorAll("#wp-fit .seg-btn").forEach(b => b.onclick = () => {
    root.querySelectorAll("#wp-fit .seg-btn").forEach(x => x.classList.remove("active"));
    b.classList.add("active"); wp.fitMode = b.dataset.val;
    updateSettings(s => s.wallpaper.fitMode = wp.fitMode);
  });
  root.querySelector("#wp-slide").onchange = (e) => updateSettings(s => s.wallpaper.slideshowEnabled = e.target.checked);
  root.querySelector("#wp-int").onchange = (e) => updateSettings(s => s.wallpaper.slideshowIntervalSec = Math.max(10, Number(e.target.value) || 60));
  root.querySelector("#btn-f-all").onclick = () => { filter = "all"; renderList(); };
  root.querySelector("#btn-f-fav").onclick = () => { filter = "fav"; renderList(); };

  renderList();
}