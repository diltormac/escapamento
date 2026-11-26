(function () {
  const style = document.createElement("style");
  style.textContent = `
    .ci-field {
      display: flex; align-items: center; gap: 15px;
      min-height: 70px; padding: 0 20px; margin-bottom: 16px;
      border: 1.5px solid #34435f; border-radius: 17px;
      background: linear-gradient(120deg, rgba(23,34,54,.96), rgba(14,24,41,.96));
      transition: border-color .18s ease;
    }
    .ci-field:focus-within { border-color: rgba(255,196,0,.72); }
    .ci-field .ci-icon { width: 27px; display: grid; place-items: center; color: #c8d3e4; }
    .ci-field .ci-icon svg { width: 22px; height: 22px; }
    
    .ci-field input {
      width: 100%; border: 0; outline: 0; color: #f4f7fc;
      background: transparent; font-size: 18px;
    }
    .ci-field input::placeholder { color: #8797b3; opacity: 1; }

    /* NOVO: Estilo para indicar que o campo é opcional no placeholder */
    .ci-field input::placeholder { color: #8797b3; opacity: 0.8; }

    /* VISUAL DO BOTÃO COM BANDEIRA */
    .ci-country-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      font-size: 24px; 
      border-radius: 10px;
      padding: 4px 8px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
      outline: none;
      user-select: none;
      line-height: 1;
    }
    .ci-country-btn:active { transform: scale(0.92); }
    .ci-country-btn.py { background: rgba(217, 43, 43, 0.15); border-color: rgba(217, 43, 43, 0.5); }
    .ci-country-btn.br { background: rgba(255, 196, 0, 0.15); border-color: rgba(255, 196, 0, 0.5); }

    /* CÓDIGO DO PAÍS (+55 / +595) */
    .ci-ddi {
      font-size: 16px;
      font-weight: 700;
      color: #ffc400; 
      margin-left: 4px;
      margin-right: -8px;
      user-select: none;
    }
  `;
  document.head.appendChild(style);

  const iconUser = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const iconPhone = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;

  window.CustomerInfo = {
    init: function (containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;

      let currentCountry = "BR";

      container.innerHTML = `
        <label class="ci-field">
          <span class="ci-icon">${iconUser}</span>
          <!-- Trocado o placeholder para indicar opcional -->
          <input type="text" id="ci-nome" placeholder="Nome do Cliente" autocomplete="name">
        </label>

        <label class="ci-field">
          <span class="ci-icon" style="width: auto; margin-right: 2px;">${iconPhone}</span>
          
          <button type="button" class="ci-country-btn br" id="ci-country-btn" title="Trocar País">🇧🇷</button>
          
          <span class="ci-ddi" id="ci-ddi">+55</span>

          <!-- Removido o "required" daqui -->
          <input type="tel" id="ci-telefone" placeholder="Telefone (Opcional)" autocomplete="tel" inputmode="numeric">
        </label>
      `;

      const inputNome = document.getElementById("ci-nome");
      const inputTelefone = document.getElementById("ci-telefone");
      const btnCountry = document.getElementById("ci-country-btn");
      const spanDdi = document.getElementById("ci-ddi");

      // ==========================================
      // MÁSCARAS
      // ==========================================
      const maskBR = (v) => {
        const d = v.replace(/\D/g, "").slice(0, 11);
        if (d.length > 2)
          return `(${d.slice(0, 2)}) ${d.slice(2)}`.replace(
            /(\(\d{2}\)) (\d{5})(\d{1,4})/,
            "$1 $2-$3",
          );
        return d;
      };

      const maskPY = (v) => {
        const d = v.replace(/\D/g, "").slice(0, 9);
        if (d.length > 3) {
          return `(${d.slice(0, 3)}) ${d.slice(3)}`.replace(
            /\((\d{3})\) (\d{3})(\d{1,3})/,
            "($1) $2-$3",
          );
        }
        return d;
      };

      const formatTelefone = (valor) => {
        return currentCountry === "BR" ? maskBR(valor) : maskPY(valor);
      };

      // ==========================================
      // UI E ALTERNÂNCIA
      // ==========================================
      const updateCountryUI = () => {
        if (currentCountry === "BR") {
          btnCountry.textContent = "🇧🇷";
          btnCountry.classList.remove("py");
          btnCountry.classList.add("br");
          spanDdi.textContent = "+55";
          inputTelefone.placeholder = "(00) 00000-0000";
        } else {
          btnCountry.textContent = "🇵🇾";
          btnCountry.classList.remove("br");
          btnCountry.classList.add("py");
          spanDdi.textContent = "+595";
          inputTelefone.placeholder = "(000) 000-000";
        }

        inputTelefone.value = formatTelefone(inputTelefone.value);
        notifyChange();
      };

      btnCountry.addEventListener("click", () => {
        currentCountry = currentCountry === "BR" ? "PY" : "BR";
        updateCountryUI();
        inputTelefone.focus();
      });

      // ==========================================
      // DIGITAÇÃO (COM INTELIGÊNCIA)
      // ==========================================
      inputTelefone.addEventListener("input", (e) => {
        let rawValue = e.target.value.replace(/\D/g, "");

        if (
          rawValue.length > 0 &&
          rawValue.length <= 9 &&
          (rawValue.startsWith("9") || rawValue.startsWith("0"))
        ) {
          if (currentCountry !== "PY" && rawValue.length === 9) {
            currentCountry = "PY";
            updateCountryUI();
          }
        } else if (rawValue.length > 9) {
          if (currentCountry !== "BR") {
            currentCountry = "BR";
            updateCountryUI();
          }
        }

        e.target.value = formatTelefone(rawValue);
        notifyChange();
      });

      // ==========================================
      // FORÇAR CAIXA ALTA NO NOME
      // ==========================================
      inputNome.addEventListener("input", (e) => {
        // Transforma em maiúsculo e joga de volta pro input
        e.target.value = e.target.value.toUpperCase();
        notifyChange();
      });

      // ==========================================
      // NOTIFICAÇÃO
      // ==========================================
      const notifyChange = () => {
        // Pega o nome digitado. Se estiver vazio, usa CONSUMIDOR
        const nomeDigitado = inputNome.value.trim();
        const nomeFinal = nomeDigitado === "" ? "CONSUMIDOR" : nomeDigitado;

        const rawTelefone = inputTelefone.value.replace(/\D/g, "");
        const codigoPais = currentCountry === "BR" ? "55" : "595";
        const telefoneWhatsApp = rawTelefone
          ? `${codigoPais}${rawTelefone}`
          : "";

        document.dispatchEvent(
          new CustomEvent("customer-info-change", {
            detail: {
              nome: nomeFinal, // Já vai como CONSUMIDOR se estiver vazio
              telefone: telefoneWhatsApp,
              telefoneFormatado: inputTelefone.value.trim(),
              pais: currentCountry,
            },
          }),
        );
      };

      inputTelefone.addEventListener("input", notifyChange);

      // Dispara a notificação inicial para o sistema já começar com o nome "CONSUMIDOR"
      notifyChange();
      updateCountryUI();
    },
  };
})();
