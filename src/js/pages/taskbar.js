export function renderTaskbar(root) {
  root.innerHTML = `
    <div class="page-header">
      <div class="page-kicker">ROADMAP MODULE • WIN32</div>
      <h1 class="page-title">Taskbar</h1>
      <p class="page-subtitle">Прямое управление композитором Windows (DWM / SetWindowCompositionAttribute).</p>
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-title">Прозрачность и Acrylic/Mica</div><p class="card-desc">Настоящее размытие и регулировка прозрачности системной панели задач Windows 10/11.</p><span class="roadmap-tag">В разработке</span></div>
      <div class="card"><div class="card-title">Стиль и акценты</div><p class="card-desc">Тонирование, плавающий режим панели и синхронизация с темой Dynamic Island.</p><span class="roadmap-tag">В разработке</span></div>
    </div>
  `;
}