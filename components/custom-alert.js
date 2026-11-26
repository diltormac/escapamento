(function () {
  // Cria o CSS do Alerta
  const style = document.createElement("style");
  style.textContent = `
    .ca-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      z-index: 99999; opacity: 0; pointer-events: none;
      transition: opacity 0.2s ease; padding: 20px; box-sizing: border-box;
    }
    .ca-overlay.active { opacity: 1; pointer-events: auto; }
    
    .ca-box {
      background: #111b2d; border: 1.5px solid #34435f;
      border-radius: 20px; padding: 24px; width: 100%; max-width: 360px;
      transform: translateY(20px) scale(0.95); transition: all 0.2s ease;
      box-shadow: 0 24px 60px rgba(0,0,0,0.5); text-align: center;
      display: flex; flex-direction: column; align-items: center;
    }
    .ca-overlay.active .ca-box { transform: translateY(0) scale(1); }

    .ca-icon { width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
    .ca-icon.sucesso { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
    .ca-icon.erro { background: rgba(255, 68, 68, 0.15); color: #ff4444; }
    .ca-icon.info { background: rgba(255, 196, 0, 0.15); color: #ffc400; }
    
    .ca-icon svg { width: 28px; height: 28px; }
    
    .ca-title { font-size: 18px; font-weight: 800; color: #f4f7fc; margin-bottom: 8px; }
    .ca-msg { font-size: 14px; color: #c8d3e4; line-height: 1.5; margin-bottom: 24px; }
    
    .ca-btn {
      width: 100%; height: 48px; border-radius: 12px; border: 0;
      background: #ffc400; color: #101827; font-weight: 800; font-size: 16px;
      cursor: pointer; transition: transform 0.1s;
    }
    .ca-btn:active { transform: scale(0.96); }
  `;
  document.head.appendChild(style);

  // Ícones
  const icons = {
    sucesso: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    erro: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };

  window.CustomAlert = {
    show: function (mensagem, tipo = "info", titulo = null) {
      // Cria o HTML na tela se ainda não existir
      let overlay = document.getElementById("customAlertOverlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "customAlertOverlay";
        overlay.className = "ca-overlay";
        document.body.appendChild(overlay);
      }

      const tituloFinal =
        titulo ||
        (tipo === "sucesso"
          ? "Tudo Certo!"
          : tipo === "erro"
            ? "Atenção"
            : "Aviso");

      overlay.innerHTML = `
        <div class="ca-box">
          <div class="ca-icon ${tipo}">${icons[tipo] || icons.info}</div>
          <div class="ca-title">${tituloFinal}</div>
          <div class="ca-msg">${mensagem}</div>
          <button class="ca-btn" onclick="document.getElementById('customAlertOverlay').classList.remove('active')">OK, entendi</button>
        </div>
      `;

      // Mostra na tela
      setTimeout(() => overlay.classList.add("active"), 10);
    },
  };
})();
