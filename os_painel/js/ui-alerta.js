let overlayCache = null;

function garantirModal() {
  if (overlayCache) return overlayCache;

  const existente = document.getElementById("uiModalOverlay");
  if (existente) {
    overlayCache = existente;
    return existente;
  }

  const overlay = document.createElement("div");
  overlay.id = "uiModalOverlay";
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 120;
    background: rgba(4, 6, 10, 0.8);
    backdrop-filter: blur(8px);
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  overlay.innerHTML = `
    <div id="uiModalCard" style="
      width: 100%;
      max-width: 410px;
      background: linear-gradient(180deg, #131822 0%, #0d1118 100%);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 18px;
      padding: 22px 24px;
      box-shadow: 0 28px 70px rgba(0, 0, 0, 0.72);
      color: #f1f5f9;
      font-family: inherit;
    ">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
        <span id="uiModalIcone" style="
          width: 30px;
          height: 30px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          font-size: 14px;
          flex-shrink: 0;
        "></span>
        <div id="uiModalTitulo" style="font-size: 16px; font-weight: 700;"></div>
      </div>

      <div id="uiModalTexto" style="
        font-size: 13px;
        color: #cbd5e1;
        line-height: 1.5;
        margin-top: 4px;
      "></div>

      <input
        id="uiModalInput"
        type="password"
        autocomplete="off"
        style="
          display: none;
          width: 100%;
          margin-top: 14px;
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(9, 11, 16, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: #f1f5f9;
          font-size: 13.5px;
          outline: none;
          box-sizing: border-box;
        "
      />

      <div id="uiModalErro" style="
        display: none;
        margin-top: 8px;
        font-size: 12px;
        color: #f87171;
      "></div>

      <div style="
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
      ">
        <button
          id="uiModalCancelar"
          type="button"
          class="btn"
          style="padding: 8px 14px; font-size: 12.5px;"
        >Cancelar</button>
        <button
          id="uiModalConfirmar"
          type="button"
          class="btn btn-primary"
          style="padding: 8px 16px; font-size: 12.5px;"
        >OK</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlayCache = overlay;
  return overlay;
}

function aplicarEstiloTipo(iconeEl, tipo) {
  const estilos = {
    sucesso: {
      icone: "✓",
      bg: "rgba(16, 185, 129, 0.16)",
      cor: "#10b981",
      borda: "rgba(16, 185, 129, 0.32)",
    },
    erro: {
      icone: "!",
      bg: "rgba(248, 113, 113, 0.16)",
      cor: "#f87171",
      borda: "rgba(248, 113, 113, 0.32)",
    },
    aviso: {
      icone: "⚠",
      bg: "rgba(245, 158, 11, 0.16)",
      cor: "#f59e0b",
      borda: "rgba(245, 158, 11, 0.32)",
    },
    senha: {
      icone: "🔒",
      bg: "rgba(56, 189, 248, 0.16)",
      cor: "#38bdf8",
      borda: "rgba(56, 189, 248, 0.32)",
    },
  };

  const cfg = estilos[tipo] || estilos.sucesso;
  iconeEl.textContent = cfg.icone;
  iconeEl.style.background = cfg.bg;
  iconeEl.style.color = cfg.cor;
  iconeEl.style.border = `1px solid ${cfg.borda}`;
}

export function uiAlerta(titulo, mensagem, tipo = "sucesso") {
  return new Promise((resolve) => {
    const overlay = garantirModal();
    const iconeEl = document.getElementById("uiModalIcone");
    const tituloEl = document.getElementById("uiModalTitulo");
    const textoEl = document.getElementById("uiModalTexto");
    const inputEl = document.getElementById("uiModalInput");
    const erroEl = document.getElementById("uiModalErro");
    const btnCancelar = document.getElementById("uiModalCancelar");
    const btnConfirmar = document.getElementById("uiModalConfirmar");

    aplicarEstiloTipo(iconeEl, tipo);
    tituloEl.textContent = titulo;
    textoEl.textContent = mensagem;
    inputEl.style.display = "none";
    erroEl.style.display = "none";
    btnCancelar.style.display = "none";
    btnConfirmar.textContent = "OK";
    btnConfirmar.style.background = "";
    btnConfirmar.style.borderColor = "";

    overlay.style.display = "flex";

    const fechar = () => {
      overlay.style.display = "none";
      btnConfirmar.onclick = null;
      overlay.onclick = null;
      document.removeEventListener("keydown", onKey);
      resolve();
    };

    const onKey = (e) => {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        fechar();
      }
    };

    btnConfirmar.onclick = fechar;
    overlay.onclick = (e) => {
      if (e.target === overlay) fechar();
    };
    document.addEventListener("keydown", onKey);
    btnConfirmar.focus();
  });
}

export function uiConfirmar(
  titulo,
  mensagem,
  textoConfirmar = "Confirmar",
  tipo = "aviso",
) {
  return new Promise((resolve) => {
    const overlay = garantirModal();
    const iconeEl = document.getElementById("uiModalIcone");
    const tituloEl = document.getElementById("uiModalTitulo");
    const textoEl = document.getElementById("uiModalTexto");
    const inputEl = document.getElementById("uiModalInput");
    const erroEl = document.getElementById("uiModalErro");
    const btnCancelar = document.getElementById("uiModalCancelar");
    const btnConfirmar = document.getElementById("uiModalConfirmar");

    aplicarEstiloTipo(iconeEl, tipo);
    tituloEl.textContent = titulo;
    textoEl.textContent = mensagem;
    inputEl.style.display = "none";
    erroEl.style.display = "none";
    btnCancelar.style.display = "inline-flex";
    btnConfirmar.textContent = textoConfirmar;

    if (tipo === "erro") {
      btnConfirmar.style.background = "#dc2626";
      btnConfirmar.style.borderColor = "#dc2626";
    } else {
      btnConfirmar.style.background = "";
      btnConfirmar.style.borderColor = "";
    }

    overlay.style.display = "flex";

    const fechar = (ok) => {
      overlay.style.display = "none";
      btnConfirmar.style.background = "";
      btnConfirmar.style.borderColor = "";
      btnConfirmar.onclick = null;
      btnCancelar.onclick = null;
      overlay.onclick = null;
      document.removeEventListener("keydown", onKey);
      resolve(ok);
    };

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        fechar(false);
      }
    };

    btnConfirmar.onclick = () => fechar(true);
    btnCancelar.onclick = () => fechar(false);
    overlay.onclick = (e) => {
      if (e.target === overlay) fechar(false);
    };
    document.addEventListener("keydown", onKey);
    btnCancelar.focus();
  });
}

export function uiPedirSenha(acaoTexto, senhaCorreta) {
  return new Promise((resolve) => {
    const overlay = garantirModal();
    const iconeEl = document.getElementById("uiModalIcone");
    const tituloEl = document.getElementById("uiModalTitulo");
    const textoEl = document.getElementById("uiModalTexto");
    const inputEl = document.getElementById("uiModalInput");
    const erroEl = document.getElementById("uiModalErro");
    const btnCancelar = document.getElementById("uiModalCancelar");
    const btnConfirmar = document.getElementById("uiModalConfirmar");

    aplicarEstiloTipo(iconeEl, "senha");
    tituloEl.textContent = "Confirmação de senha";
    textoEl.textContent = `Digite a senha para ${acaoTexto}:`;
    inputEl.type = "password";
    inputEl.value = "";
    inputEl.placeholder = "Senha";
    inputEl.style.display = "block";
    erroEl.style.display = "none";
    btnCancelar.style.display = "inline-flex";
    btnConfirmar.textContent = "Confirmar";
    btnConfirmar.style.background = "";
    btnConfirmar.style.borderColor = "";

    overlay.style.display = "flex";

    const fechar = (ok) => {
      overlay.style.display = "none";
      inputEl.value = "";
      btnConfirmar.onclick = null;
      btnCancelar.onclick = null;
      inputEl.onkeydown = null;
      overlay.onclick = null;
      document.removeEventListener("keydown", onEsc);
      resolve(ok);
    };

    const validar = () => {
      if (inputEl.value === senhaCorreta) {
        fechar(true);
      } else {
        erroEl.textContent = "Senha incorreta. Tente novamente.";
        erroEl.style.display = "block";
        inputEl.focus();
        inputEl.select();
      }
    };

    const onEsc = (e) => {
      if (e.key === "Escape") fechar(false);
    };

    btnConfirmar.onclick = validar;
    btnCancelar.onclick = () => fechar(false);
    inputEl.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        validar();
      }
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) fechar(false);
    };
    document.addEventListener("keydown", onEsc);

    setTimeout(() => inputEl.focus(), 30);
  });
}
