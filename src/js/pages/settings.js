import { api } from "../api.js";

export async function renderSettings(root) {
  const cfgPath = await api.getConfigFilePath();

  root.innerHTML = `
    <div class="page-header">
      <div class="page-kicker">SYSTEM</div>
      <h1 class="page-title">Settings</h1>
      <p class="page-subtitle">Параметры приложения HØRN и управление жизненным циклом процесса.</p>
    </div>

    <div class="card">
      <div class="setting-row">
        <div>
          <div class="setting-label">Файл конфигурации</div>
          <div class="setting-hint">${cfgPath}</div>
        </div>
      </div>

      <div class="setting-row">
        <div>
          <div class="setting-label">Полностью завершить HØRN</div>
          <div class="setting-hint">Закроет и главное окно, и плавающий Dynamic Island</div>
        </div>
        <button class="btn" id="btn-quit-all">Завершить работу</button>
      </div>
    </div>
  `;

  root.querySelector("#btn-quit-all").addEventListener("click", () => api.quitApp());
}