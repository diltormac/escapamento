(function () {
  const headerScriptUrl = document.currentScript
    ? document.currentScript.src
    : null;
  const defaultLogoUrl = headerScriptUrl
    ? new URL("../assent/logo.png", headerScriptUrl).href
    : "./assent/logo.png";

  const style = document.createElement("style");
  style.textContent = `
    .app-header {
      min-height: 112px;
      margin: 0 -20px 24px -20px;
      padding: 16px 22px;
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 12px;
      border-bottom: 4px solid var(--yellow, #ffc400);
      background: rgba(5, 11, 21, .58);
      box-sizing: border-box;
    }

    .app-logo {
      justify-self: start;
      height: 58px;
      width: auto;
      max-width: 115px;
      object-fit: contain;
      display: block;
    }

    .app-brand-text {
      text-align: center;
      min-width: 0;
    }

    .app-brand-title {
      font-size: clamp(22px, 6.5vw, 34px);
      line-height: .95;
      font-weight: 900;
      letter-spacing: -1.5px;
      white-space: nowrap;
      color: #f4f7fc;
    }
    .app-brand-title span { color: var(--yellow, #ffc400); }
    .app-brand-sub {
      margin-top: 6px;
      font-size: 10px;
      letter-spacing: 3px;
      color: #c4cee0;
      font-weight: 700;
    }

    .app-device-badge {
      margin-top: 6px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      border-radius: 999px;
      border: 1px solid rgba(255, 196, 0, 0.35);
      background: rgba(17, 27, 45, 0.85);
      color: #dbe4f3;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.4px;
      max-width: 100%;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
    }
    .app-device-badge:hover {
      border-color: var(--yellow, #ffc400);
      color: var(--yellow, #ffc400);
    }
    .app-device-badge span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-transform: uppercase;
    }

    .app-painel-btn {
      justify-self: end;
      border: 1.5px solid #ffe066;
      background: linear-gradient(135deg, #ffd21a 0%, #ffae00 100%);
      color: #0b1424;
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      box-shadow: 0 4px 14px rgba(255, 196, 0, 0.35);
      transition: transform 0.12s ease, box-shadow 0.15s ease, filter 0.15s ease;
    }
    .app-painel-btn svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
    .app-painel-btn:hover {
      filter: brightness(1.06);
      box-shadow: 0 6px 18px rgba(255, 196, 0, 0.45);
    }
    .app-painel-btn:active {
      transform: scale(0.95);
    }
  `;
  document.head.appendChild(style);

  window.AppHeader = {
    init: function (containerId, options = {}) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const logoSrc = options.logoSrc || defaultLogoUrl;
      const painelUrl = options.painelUrl || "./os_painel/index.html";
      const deviceDisplayId = options.deviceDisplayId || "header-device-name";
      const deviceTriggerId = options.deviceTriggerId || "header-device-btn";

      const salvo = localStorage.getItem("@osfacil_aparelho");
      const nomeInicial =
        salvo && salvo !== "undefined" && salvo !== "null"
          ? salvo.trim()
          : "Definir aparelho";

      container.innerHTML = `
        <header class="app-header">
          <img src="${logoSrc}" alt="Clínica da Roda" class="app-logo">

          <div class="app-brand-text">
            <div class="app-brand-title">OS <span>FÁCIL</span></div>
            <div class="app-brand-sub">AUTO CENTER</div>
            <button type="button" class="app-device-badge" id="${deviceTriggerId}" title="Alterar nome do aparelho">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" aria-hidden="true">
                <rect x="6" y="2" width="12" height="20" rx="2"/>
                <path d="M11 18h2"/>
              </svg>
              <span id="${deviceDisplayId}">${nomeInicial}</span>
            </button>
          </div>

          <button class="app-painel-btn" type="button" title="Abrir Painel de OS" onclick="window.location.replace('${painelUrl}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5"/>
            </svg>
            <span>Painel</span>
          </button>
        </header>
      `;

      if (window.DeviceId && typeof window.DeviceId.init === "function") {
        window.DeviceId.init({
          displayId: deviceDisplayId,
          triggerId: deviceTriggerId,
        });
      }
    },
  };
})();
