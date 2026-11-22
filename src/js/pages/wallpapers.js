import { api, showToast } from "../api.js";

export function renderWallpapers(root, { settings, updateSettings }) {
  let filter = "all";
  const wp = settings.wallpaper;

  async function renderList() {
    const grid = root.querySelector("#wall-grid");
    const items = wp.items.filter(it => filter === "all" || (filter === "fav" && it.favorite));
    if (!items.length) {
      grid.innerHTML = `<div class="card-desc">Коллекция пуста. Нажмите «Добавить изображения», чтобы выбрать обои с компьютера.</div>`;
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
            <button class="btn btn-primary" data-set="${it.path}" style="padding:5px 9px;font-size:11px;">Установить</button>
            <button class="btn" data-fav="${it.id}" style="padding:5px 8px;font-size:11px;">${it.favorite ? "★" : "☆"}</button>
            <button class="btn" data-pl="${it.path}" style="padding:5px 8px;font-size:11px;">${inPl ? "В плейлисте" : "+ Плейлист"}</button>
            <button class="btn" data-del="${it.id}" style="padding:5px 8px;font-size:11px;">✕</button>
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
        showToast("Обои установлены на рабочий стол");
      } catch (err) { showToast("Ошибка: " + err); }
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
      <div class="page-kicker">WALLPAPER STUDIO • DESKTOP ENGINE</div>
      <h1 class="page-title">Wallpaper Studio</h1>
      <p class="page-subtitle">Управление коллекциями обоев, подгонкой под экран и автоматической сменой по плейлисту.</p>
    </div>

    <div class="section-stack">
      <div class="card">
        <div class="setting-row">
          <div><div class="setting-label">Режим подгонки под экран</div></div>
          <div class="segmented" id="wp-fit">
            ${[["fill","Заполнение"],["fit","Вписать"],["stretch","Растянуть"],["center","По центру"]].map(([v,l]) =>
              `<button class="seg-btn ${wp.fitMode === v ? "active" : ""}" data-val="${v}">${l}</button>`
            ).join("")}
          </div>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">Автоматическая смена обоев</div>
            <div class="setting-hint">В плейлисте изображений: ${wp.slideshowPlaylist.length}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <input type="number" id="wp-int" min="10" value="${wp.slideshowIntervalSec}" style="width:80px;" title="Интервал (сек)"/>
            <span style="font-size:12px;color:var(--text-muted);">сек</span>
            <label class="toggle"><input type="checkbox" id="wp-slide" ${wp.slideshowEnabled ? "checked" : ""}/><span class="toggle-track"></span></label>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="btn-add-wp">Добавить изображения с ПК</button>
          <button class="btn" id="btn-f-all">Все (${wp.items.length})</button>
          <button class="btn" id="btn-f-fav">Избранное</button>
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