export function abrirSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const btnAbrir = document.getElementById("btnAbrirSidebarFlutuante");
  if (sidebar) sidebar.style.transform = "translateX(0)";
  if (overlay) overlay.style.display = "block";
  if (btnAbrir) btnAbrir.style.display = "none";
}

export function fecharSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const btnAbrir = document.getElementById("btnAbrirSidebarFlutuante");
  if (sidebar) sidebar.style.transform = "translateX(-105%)";
  if (overlay) overlay.style.display = "none";
  if (btnAbrir) btnAbrir.style.display = "inline-flex";
}

export function alternarSidebar() {
  const sidebar = document.getElementById("sidebar");
  const estaAberta =
    sidebar &&
    (sidebar.style.transform === "translateX(0px)" ||
      sidebar.style.transform === "translateX(0)");
  if (estaAberta) fecharSidebar();
  else abrirSidebar();
}

export function definirAtualizando(ativo) {
  const btn = document.getElementById("btnAtualizar");
  const btnSide = document.getElementById("btnSideAtualizar");
  if (btn) {
    btn.disabled = Boolean(ativo);
    btn.setAttribute("aria-busy", ativo ? "true" : "false");
    const icone = btn.querySelector("i");
    if (icone) icone.classList.toggle("fa-spin", Boolean(ativo));
  }
  if (btnSide) {
    btnSide.disabled = Boolean(ativo);
    btnSide.textContent = ativo ? "Atualizando…" : "↻ Atualizar";
  }
}

export function montarSidebarPainel(alvoSeletor = "#sidebarSlot") {
  const alvo =
    typeof alvoSeletor === "string"
      ? document.querySelector(alvoSeletor)
      : alvoSeletor;
  if (!alvo) return null;

  alvo.innerHTML = `
    <button
      id="btnAbrirSidebarFlutuante"
      type="button"
      aria-label="Abrir menu lateral"
      title="Abrir menu"
      style="position:fixed;top:14px;left:14px;z-index:44;width:40px;height:40px;border-radius:10px;border:1px solid #cbd5e1;background:#ffffff;color:#0f172a;box-shadow:0 4px 12px rgba(15,23,42,0.12);display:inline-flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;cursor:pointer"
    >☰</button>

    <div
      id="sidebarOverlay"
      style="display:none;position:fixed;inset:0;z-index:45;background:rgba(15,23,42,0.45);backdrop-filter:blur(2px)"
    ></div>

    <aside
      id="sidebar"
      aria-label="Menu lateral do painel"
      style="position:fixed;top:0;left:0;bottom:0;z-index:50;width:310px;max-width:90vw;background:#f8fafc;border-right:1px solid #e2e8f0;box-shadow:0 20px 40px rgba(15,23,42,0.18);display:flex;flex-direction:column;overflow-y:auto;transform:translateX(-105%);transition:transform 0.22s ease;padding:16px;gap:16px;color:#0f172a"
    >
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:12px">
        <div>
          <div style="font-weight:800;font-size:15px">Clínica da Roda</div>
          <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.05em">HEADER & RESUMO</div>
        </div>
        <button
          id="btnFecharSidebar"
          type="button"
          aria-label="Fechar menu"
          title="Fechar menu"
          style="width:34px;height:34px;border-radius:10px;border:1px solid #e2e8f0;background:#ffffff;color:#475569;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s ease;box-shadow:0 1px 2px rgba(15,23,42,0.05)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px;background:#fff;border:1px solid #e6ebf1;border-radius:12px;padding:12px">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase">Header</div>
        <button id="btnSideCadastroOS" class="btn btn-sm esconder-no-electron" type="button" style="justify-content:flex-start">
          ← Cadastro de OS
        </button>
        <div style="display:flex;gap:8px">
          <button id="btnSideGaleria" class="btn btn-sm" type="button" style="flex:1">Galeria</button>
          <button id="btnSideAtualizar" class="btn btn-sm" type="button" style="flex:1">↻ Atualizar</button>
        </div>
        <div id="sideStatusFonte" class="mono" style="font-size:11px;color:#334155;background:#f1f5f9;border-radius:8px;padding:7px 10px">
          Carregando banco local…
        </div>
        <div style="border-top:1px dashed #e2e8f0;padding-top:8px;display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;gap:8px">
            <button id="btnSideRestaurarBackup" class="btn btn-sm" type="button" style="flex:1">⬆ Restaurar</button>
            <button id="btnSideExportarBackup" class="btn btn-sm" type="button" style="flex:1">Gerar Backup</button>
          </div>
          <div id="sideUltimoBackup" style="font-size:11px;color:#64748b">Último backup: verificando…</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase">Cards de Resumo (KPIs)</div>

        <button type="button" class="kpi-card" data-side-kpi="" style="background:#fff;border:1px solid #e6ebf1;border-radius:12px;padding:12px 14px;text-align:left;cursor:pointer;width:100%">
          <div style="font-size:12px;color:#4b5563">Ordens cadastradas</div>
          <div id="sideKTotal" style="font-size:22px;font-weight:700;color:#111827;margin-top:2px">—</div>
        </button>

        <button type="button" class="kpi-card" data-side-kpi="Pendente" style="background:#fff;border:1px solid #e6ebf1;border-radius:12px;padding:12px 14px;text-align:left;cursor:pointer;width:100%">
          <div style="font-size:12px;color:#4b5563">Pendentes</div>
          <div id="sideKAbertas" style="font-size:22px;font-weight:700;color:#111827;margin-top:2px">—</div>
        </button>

        <button type="button" class="kpi-card" data-side-kpi="Em andamento" style="background:#fff;border:1px solid #e6ebf1;border-radius:12px;padding:12px 14px;text-align:left;cursor:pointer;width:100%">
          <div style="font-size:12px;color:#4b5563">Em andamento</div>
          <div id="sideKAndamento" style="font-size:22px;font-weight:700;color:#111827;margin-top:2px">—</div>
        </button>

        <button type="button" class="kpi-card" data-side-kpi="Prontas" style="background:#fff;border:1px solid #e6ebf1;border-radius:12px;padding:12px 14px;text-align:left;cursor:pointer;width:100%">
          <div style="font-size:12px;color:#4b5563">Prontas p/ Retirada</div>
          <div id="sideKProntas" style="font-size:22px;font-weight:700;color:#16a34a;margin-top:2px">—</div>
        </button>

        <div class="kpi-card" style="background:#fff;border:1px solid #e6ebf1;border-radius:12px;padding:12px 14px;width:100%">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:#4b5563">Faturamento total</span>
            <button type="button" id="btnSideToggleFaturamento" class="btn btn-sm" style="padding:3px 8px;font-size:11px">Mostrar/Ocultar</button>
          </div>
          <div id="sideKTotalValor" style="font-size:22px;font-weight:700;color:#111827;margin-top:4px">••••••</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:2px">exceto canceladas</div>
        </div>
      </div>
    </aside>
  `;

  const sincronizar = () => {
    const mapTexto = [
      ["statusTexto", "sideStatusFonte"],
      ["infoUltimoBackup", "sideUltimoBackup"],
      ["kTotal", "sideKTotal"],
      ["kAbertas", "sideKAbertas"],
      ["kAndamento", "sideKAndamento"],
      ["kProntas", "sideKProntas"],
      ["kTotalValor", "sideKTotalValor"],
    ];

    mapTexto.forEach(([origemId, destinoId]) => {
      const orig = document.getElementById(origemId);
      const dest = document.getElementById(destinoId);
      if (orig && dest) dest.textContent = orig.textContent;
    });
  };

  const btnFechar = document.getElementById("btnFecharSidebar");
  if (btnFechar) {
    btnFechar.addEventListener("mouseenter", () => {
      btnFechar.style.background = "#fee2e2";
      btnFechar.style.borderColor = "#fca5a5";
      btnFechar.style.color = "#dc2626";
    });
    btnFechar.addEventListener("mouseleave", () => {
      btnFechar.style.background = "#ffffff";
      btnFechar.style.borderColor = "#e2e8f0";
      btnFechar.style.color = "#475569";
    });
    btnFechar.addEventListener("click", fecharSidebar);
  }

  document
    .getElementById("btnAbrirSidebarFlutuante")
    ?.addEventListener("click", () => {
      sincronizar();
      abrirSidebar();
    });

  document
    .getElementById("sidebarOverlay")
    ?.addEventListener("click", fecharSidebar);

  document
    .getElementById("btnSideCadastroOS")
    ?.addEventListener("click", () => {
      fecharSidebar();
      window.location.href = "../index.html";
    });

  document.getElementById("btnSideGaleria")?.addEventListener("click", () => {
    fecharSidebar();
    document.getElementById("btnGaleriaOffline")?.click();
  });

  document.getElementById("btnSideAtualizar")?.addEventListener("click", () => {
    fecharSidebar();
    document.getElementById("btnAtualizar")?.click();
  });

  document
    .getElementById("btnSideRestaurarBackup")
    ?.addEventListener("click", () => {
      fecharSidebar();
      document.getElementById("btnRestaurarBackup")?.click();
    });

  document
    .getElementById("btnSideExportarBackup")
    ?.addEventListener("click", () => {
      fecharSidebar();
      document.getElementById("btnExportarBackup")?.click();
    });

  document
    .getElementById("btnSideToggleFaturamento")
    ?.addEventListener("click", () => {
      document.getElementById("btnToggleFaturamento")?.click();
      sincronizar();
    });

  alvo.querySelectorAll("[data-side-kpi]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tipo = btn.dataset.sideKpi || "";
      const cardOriginal = document.querySelector(
        `#kpisSlot .kpi-card[data-kpi-filtro="${tipo}"]`,
      );
      if (cardOriginal) {
        cardOriginal.click();
      }
      sincronizar();
      fecharSidebar();
    });
  });

  const observer = new MutationObserver(sincronizar);
  ["#headerSlot", "#kpisSlot"].forEach((sel) => {
    const node = document.querySelector(sel);
    if (node) {
      observer.observe(node, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  });

  sincronizar();

  return {
    abrir: () => {
      sincronizar();
      abrirSidebar();
    },
    fechar: fecharSidebar,
    alternar: alternarSidebar,
    sincronizar,
  };
}
