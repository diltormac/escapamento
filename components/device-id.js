(function () {
  const STORAGE_KEY = "@osfacil_aparelho";

  const style = document.createElement("style");
  style.textContent = `
    .device-modal-overlay {
      position: fixed; inset: 0;
      background: rgba(5, 11, 20, 0.92);
      backdrop-filter: blur(6px);
      z-index: 99999;
      display: none; align-items: center; justify-content: center;
      padding: 20px; box-sizing: border-box;
    }
    .device-modal-overlay.open { display: flex; }

    .device-modal-box {
      width: 100%; max-width: 400px;
      background: #111b2d;
      border: 2px solid #ffc400;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75);
      color: #f4f7fc;
    }

    .device-modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid #26354d;
      display: flex; align-items: center; justify-content: space-between;
      font-weight: 800; font-size: 15px;
      color: #ffc400;
    }

    .device-modal-close {
      background: transparent; border: 0; color: #9aa9c2;
      font-size: 22px; line-height: 1; cursor: pointer; padding: 0;
    }

    .device-modal-body { padding: 20px; }
    .device-modal-desc {
      margin: 0 0 14px 0;
      font-size: 13px; color: #c4cee0; text-align: center; line-height: 1.4;
    }

    .device-modal-input {
      width: 100%; height: 48px;
      border-radius: 12px;
      border: 1.5px solid #34435f;
      background: #0d1728;
      color: #f4f7fc;
      padding: 0 14px;
      font-size: 15px; font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      outline: none;
      box-sizing: border-box;
    }
    .device-modal-input:focus { border-color: #ffc400; }

    .device-modal-erro {
      margin-top: 8px;
      font-size: 12px; color: #f87171;
      text-align: center; display: none; font-weight: 600;
    }

    .device-modal-footer {
      padding: 14px 20px;
      border-top: 1px solid #26354d;
      background: #0d1728;
    }

    .device-modal-btn {
      width: 100%; height: 46px;
      border: 0; border-radius: 12px;
      background: linear-gradient(100deg, #ffd21a, #ffbd00);
      color: #101827;
      font-weight: 900; font-size: 14px;
      cursor: pointer;
    }
    .device-modal-btn:active { transform: scale(0.98); }
  `;
  document.head.appendChild(style);

  function lerNomeSalvo() {
    const val = localStorage.getItem(STORAGE_KEY);
    if (!val || val === "undefined" || val === "null") return "";
    return val.trim().toUpperCase();
  }

  let abrirFn = null;

  window.DeviceId = {
    hasName: function () {
      return lerNomeSalvo().length >= 2;
    },

    get: function () {
      return lerNomeSalvo();
    },

    require: function () {
      const atual = lerNomeSalvo();
      if (atual.length >= 2) return atual;
      if (typeof abrirFn === "function") abrirFn(false);
      return "";
    },

    init: function ({ displayId, triggerId } = {}) {
      let overlay = document.getElementById("device-id-overlay");

      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "device-id-overlay";
        overlay.className = "device-modal-overlay";
        overlay.innerHTML = `
          <div class="device-modal-box">
            <div class="device-modal-header">
              <span>Identificação Obrigatória do Aparelho</span>
              <button type="button" class="device-modal-close" id="device-id-close" aria-label="Fechar">×</button>
            </div>
            <div class="device-modal-body">
              <p class="device-modal-desc">
                Para registrar ordens de serviço, informe o nome deste aparelho (Ex: TABLET RECEPÇÃO, CELULAR BALCÃO).
              </p>
              <input
                type="text"
                id="device-id-input"
                class="device-modal-input"
                placeholder="Digite o nome do aparelho"
                maxlength="40"
                autocomplete="off"
              />
              <div class="device-modal-erro" id="device-id-erro">
                Digite um nome com pelo menos 2 caracteres.
              </div>
            </div>
            <div class="device-modal-footer">
              <button type="button" class="device-modal-btn" id="device-id-save">
                Confirmar e Continuar
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);
      }

      const input = document.getElementById("device-id-input");
      const erro = document.getElementById("device-id-erro");
      const btnSave = document.getElementById("device-id-save");
      const btnClose = document.getElementById("device-id-close");
      const displayEl = displayId ? document.getElementById(displayId) : null;
      const triggerEl = triggerId ? document.getElementById(triggerId) : null;

      const atualizarDisplay = (nome) => {
        if (displayEl) displayEl.textContent = nome || "Definir aparelho";
      };

      const abrir = (permiteFechar = false) => {
        erro.style.display = "none";
        input.value = lerNomeSalvo();
        btnClose.style.display = permiteFechar ? "block" : "none";
        overlay.classList.add("open");
        setTimeout(() => input.focus(), 100);
      };

      abrirFn = abrir;

      const fechar = () => {
        // Só permite fechar se já existir um nome salvo
        if (!lerNomeSalvo()) {
          erro.style.display = "block";
          input.focus();
          return;
        }
        overlay.classList.remove("open");
      };

      const salvar = () => {
        const valor = input.value.trim().toUpperCase();
        if (valor.length < 2) {
          erro.style.display = "block";
          input.focus();
          return;
        }
        localStorage.setItem(STORAGE_KEY, valor);
        atualizarDisplay(valor);
        overlay.classList.remove("open");
        document.dispatchEvent(
          new CustomEvent("device-id-change", { detail: valor }),
        );
      };

      btnSave.onclick = salvar;
      btnClose.onclick = fechar;
      input.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          salvar();
        }
      };

      if (triggerEl) {
        triggerEl.style.cursor = "pointer";
        triggerEl.onclick = () => abrir(true);
      }

      const atual = lerNomeSalvo();
      if (!atual || atual.length < 2) {
        atualizarDisplay("");
        abrir(false);
      } else {
        atualizarDisplay(atual);
      }
    },
  };
})();
