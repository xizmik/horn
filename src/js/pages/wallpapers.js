export function renderWallpapers(root) {
  root.innerHTML = `
    <div class="page-header">
      <div class="page-kicker">ROADMAP MODULE</div>
      <h1 class="page-title">Wallpapers</h1>
      <p class="page-subtitle">Управление обоями Windows с нативной интеграцией IDesktopWallpaper API.</p>
    </div>
    <div class="grid-3">
      <div class="card"><div class="card-title">Галерея HØRN</div><p class="card-desc">Кураторская коллекция монохромных и графитовых полотен 4K/8K.</p><span class="roadmap-tag">Скоро</span></div>
      <div class="card"><div class="card-title">Собственные обои</div><p class="card-desc">Локальный импорт изображений с адаптацией под разные разрешения мониторов.</p><span class="roadmap-tag">Скоро</span></div>
      <div class="card"><div class="card-title">Живые обои</div><p class="card-desc">Аппаратно-ускоренные сцены с автопаузой при запуске полноэкранных программ.</p><span class="roadmap-tag">v0.3</span></div>
    </div>
  `;
}