const EFFECTS = [
  { key: "snow", name: "Снег", desc: "Мягкое падение частиц с низкой нагрузкой на GPU" },
  { key: "rain", name: "Дождь", desc: "Тонкие диагональные капли с регулируемым углом" },
  { key: "fog", name: "Туман", desc: "Едва заметная атмосферная дымка по краям экрана" },
  { key: "particles", name: "Плавающие частицы", desc: "Минималистичная микропыль в монохромной палитре" },
  { key: "stars", name: "Звёзды", desc: "Спокойное мерцание на тёмных обоях" },
  { key: "ambientLight", name: "Световые эффекты", desc: "Деликатные стальные переливы по периметру" },
];

export function renderAtmosphere(root, { settings, updateSettings }) {
  root.innerHTML = `
    <div class="page-header">
      <div class="page-kicker">PREVIEW ARCHITECTURE</div>
      <h1 class="page-title">Atmosphere</h1>
      <p class="page-subtitle">Конфигурация атмосферных слоёв рабочего стола. Переключатели уже сохраняются в профиле.</p>
    </div>

    <div class="grid-2">
      ${EFFECTS.map(
        (ef) => `
          <div class="card">
            <div class="setting-row" style="padding: 0;">
              <div>
                <div class="card-title">${ef.name}</div>
                <div class="card-desc">${ef.desc}</div>
              </div>
              <label class="toggle">
                <input type="checkbox" data-key="${ef.key}" ${settings.atmosphere[ef.key] ? "checked" : ""}/>
                <span class="toggle-track"></span>
              </label>
            </div>
          </div>
        `
      ).join("")}
    </div>
  `;

  root.querySelectorAll("input[data-key]").forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.dataset.key;
      updateSettings((s) => (s.atmosphere[key] = input.checked));
    });
  });
}