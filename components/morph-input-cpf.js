(function () {
  const style = document.createElement("style");
  style.textContent = `
    .morph-cpf-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; gap: 8px; opacity: 0; pointer-events: none; transform: scale(0.95); transition: all 0.25s; z-index: 10; }
    .morph-cpf-overlay.active { opacity: 1; pointer-events: auto; transform: scale(1); }
    .morph-cpf-input-box { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; background: #0d1728; border: 2px solid #ffc400; border-radius: 15px; padding: 0 16px; box-shadow: 0 0 15px rgba(255,196,0,0.15); }
    .morph-cpf-input-box svg { width: 20px; height: 20px; color: #ffc400; flex-shrink: 0; }
    .morph-cpf-input-box input { flex: 1; width: 100%; min-width: 0; background: transparent; border: 0; outline: 0; color: #f4f7fc; font-size: 16px; font-weight: 600; }
    .morph-cpf-btn-confirm { width: 68px; height: 68px; flex-shrink: 0; border-radius: 15px; background: #4ade80; color: #000; border: 0; cursor: pointer; display: grid; place-items: center; transition: transform 0.1s; }
    .morph-cpf-btn-confirm:active { transform: scale(0.95); }
    .morph-cpf-btn-confirm svg { width: 26px; height: 26px; }
  `;
  document.head.appendChild(style);

  const iconCpf = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>`;
  const iconCheck = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;

  const maskCPF = (v) =>
    v
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

  window.MorphInputCPF = {
    init: function (containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;

      let value = "";
      let isOpen = false;

      container.innerHTML = `
      <div id="cpf-grid" style="height: 100%; transition: opacity 0.2s;">
        <button class="btn-base primary" type="button" id="btn-open-cpf" style="width: 100%; height: 100%;">
          ${iconCpf} <span id="cpf-label">CPF</span>
        </button>
      </div>
      <div class="morph-cpf-overlay" id="cpf-overlay">
        <div class="morph-cpf-input-box">
          ${iconCpf}
          <input type="text" id="cpf-input" inputmode="numeric" autocomplete="off" placeholder="000.000.000-00" maxlength="14">
        </div>
        <button class="morph-cpf-btn-confirm" type="button" id="btn-confirm-cpf">
          ${iconCheck}
        </button>
      </div>
    `;

      const btn = document.getElementById("btn-open-cpf");
      const overlay = document.getElementById("cpf-overlay");
      const input = document.getElementById("cpf-input");
      const grid = document.getElementById("cpf-grid");
      const label = document.getElementById("cpf-label");

      btn.addEventListener("click", () => {
        isOpen = true;
        grid.style.opacity = "0";
        grid.style.pointerEvents = "none";
        overlay.classList.add("active");
        input.value = value;
        setTimeout(() => {
          if (isOpen) input.focus();
        }, 100);
      });

      input.addEventListener("input", (e) => {
        e.target.value = maskCPF(e.target.value);
      });

      const save = () => {
        if (!isOpen) return;
        isOpen = false;

        value = input.value;
        label.textContent = value || "CPF";
        btn.classList.toggle("filled", !!value);
        grid.style.opacity = "1";
        grid.style.pointerEvents = "auto";
        overlay.classList.remove("active");

        input.blur();

        document.dispatchEvent(
          new CustomEvent("morph-cpf-change", { detail: value }),
        );
      };

      document
        .getElementById("btn-confirm-cpf")
        .addEventListener("click", save);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") save();
      });
      input.addEventListener("blur", save);
    },
  };
})();
