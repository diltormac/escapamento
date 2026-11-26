import { criarControladorPlaca } from "./placa-teclado.js";

(function () {
  const style = document.createElement("style");
  style.textContent = `
    .morph-placa-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; gap: 8px; opacity: 0; pointer-events: none; transform: scale(0.95); transition: all 0.25s; z-index: 10; }
    .morph-placa-overlay.active { opacity: 1; pointer-events: auto; transform: scale(1); }
    .morph-placa-input-box { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; background: #0d1728; border: 2px solid #ffc400; border-radius: 15px; padding: 0 12px 0 16px; box-shadow: 0 0 15px rgba(255,196,0,0.15); }
    .morph-placa-input-box svg { width: 20px; height: 20px; color: #ffc400; flex-shrink: 0; }
    .morph-placa-input-box input { flex: 1; width: 100%; min-width: 0; background: transparent; border: 0; outline: 0; color: #f4f7fc; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .morph-placa-btn-confirm { width: 68px; height: 68px; flex-shrink: 0; border-radius: 15px; background: #4ade80; color: #000; border: 0; cursor: pointer; display: grid; place-items: center; transition: transform 0.1s; }
    .morph-placa-btn-confirm:active { transform: scale(0.95); }
    .morph-placa-btn-confirm svg { width: 26px; height: 26px; }
    .morph-placa-toggle {
      font-size: 11px; font-weight: 800; padding: 5px 8px; border-radius: 8px;
      border: 1px solid rgba(255, 196, 0, 0.45); background: rgba(255, 196, 0, 0.14);
      color: #ffc400; cursor: pointer; flex-shrink: 0; text-transform: uppercase;
    }
    .morph-placa-toggle.livre {
      border-color: rgba(148, 163, 184, 0.5); background: rgba(148, 163, 184, 0.16);
      color: #e2e8f0;
    }
  `;
  document.head.appendChild(style);

  const iconPlaca = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="7" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="17" cy="12" r="1"/></svg>`;
  const iconCheck = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;

  window.MorphInputPlaca = {
    init: function (containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;

      let value = "";
      let isOpen = false;
      let closingByToggle = false;

      container.innerHTML = `
        <div id="placa-grid" style="height: 100%; transition: opacity 0.2s;">
          <button class="btn-base primary" type="button" id="btn-open-placa" style="width: 100%; height: 100%;">
            ${iconPlaca} <span id="placa-label">Placa</span>
          </button>
        </div>
        <div class="morph-placa-overlay" id="placa-overlay">
          <div class="morph-placa-input-box">
            ${iconPlaca}
            <input type="text" id="placa-input" placeholder="ABC1D23" maxlength="7" autocomplete="off" autocapitalize="characters" spellcheck="false">
            <button type="button" class="morph-placa-toggle" id="btn-toggle-placa" title="Alternar padrão Mercosul / Livre">MERCOSUL</button>
          </div>
          <button class="morph-placa-btn-confirm" type="button" id="btn-confirm-placa">
            ${iconCheck}
          </button>
        </div>
      `;

      const btn = document.getElementById("btn-open-placa");
      const overlay = document.getElementById("placa-overlay");
      const input = document.getElementById("placa-input");
      const toggleBtn = document.getElementById("btn-toggle-placa");
      const grid = document.getElementById("placa-grid");
      const label = document.getElementById("placa-label");

      const atualizarVisualModo = (modo) => {
        const ehLivre = modo === "livre";
        toggleBtn.textContent = ehLivre ? "LIVRE" : "MERCOSUL";
        toggleBtn.classList.toggle("livre", ehLivre);
        input.placeholder = ehLivre ? "ABC1234 / LIVRE" : "ABC1D23";
      };

      const controlador = criarControladorPlaca(input, {
        modo: "mercosul",
        maxLen: 7,
        onChange: (_val, _dica, modo) => {
          atualizarVisualModo(modo);
        },
      });

      toggleBtn.addEventListener("pointerdown", () => {
        closingByToggle = true;
      });

      toggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const estado = controlador?.alternarModo();
        if (estado) atualizarVisualModo(estado.modo);
        input.focus();
        setTimeout(() => {
          closingByToggle = false;
        }, 50);
      });

      btn.addEventListener("click", () => {
        isOpen = true;
        grid.style.opacity = "0";
        grid.style.pointerEvents = "none";
        overlay.classList.add("active");
        controlador?.setModo("mercosul");
        input.value = value;
        const estado = controlador?.aplicar();
        if (estado) atualizarVisualModo(estado.modo);
        setTimeout(() => {
          if (isOpen) input.focus();
        }, 100);
      });

      const save = () => {
        if (!isOpen) return;
        isOpen = false;

        const estado = controlador?.aplicar();
        value = estado ? estado.valor : input.value;
        label.textContent = value || "Placa";
        btn.classList.toggle("filled", !!value);
        grid.style.opacity = "1";
        grid.style.pointerEvents = "auto";
        overlay.classList.remove("active");

        input.blur();

        document.dispatchEvent(
          new CustomEvent("morph-placa-change", { detail: value }),
        );
      };

      document
        .getElementById("btn-confirm-placa")
        .addEventListener("click", save);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") save();
      });
      input.addEventListener("blur", () => {
        if (closingByToggle) return;
        save();
      });
    },
  };
})();
