export function montarHeaderPainel(alvoSeletor = "#headerSlot") {
  const alvo =
    typeof alvoSeletor === "string"
      ? document.querySelector(alvoSeletor)
      : alvoSeletor;

  if (!alvo) return null;

  alvo.innerHTML = `
    <header class="header">
      <div class="header-brand-group">
        <div class="brand">
          <div class="brand-mark">CR</div>
          <div>
            <div class="brand-title">Clínica da Roda</div>
            <div class="brand-sub">Painel de OS</div>
          </div>
        </div>

        <button
          id="btnVoltarCadastroOS"
          type="button"
          onclick="window.location.href = '../index.html'"
          class="esconder-no-electron btn btn-sm"
        >
          ← Cadastro de OS
        </button>
      </div>

      <div class="header-right">
        <button id="btnGaleriaOffline" class="btn btn-sm" type="button">
          Galeria
        </button>

        <div class="header-backup-bar">
          <input
            id="inputRestaurarBackup"
            type="file"
            accept=".json,application/json"
            style="display: none"
          />
          <button id="btnRestaurarBackup" class="btn btn-sm" type="button">
            ⬆ Restaurar backup
          </button>
          <div class="backup-meta">
            <span id="infoUltimoBackup">Último backup: verificando…</span>
            <button
              id="btnExportarBackup"
              class="backup-link-btn"
              type="button"
            >
              Gerar backup (senha)
            </button>
          </div>
        </div>

        <div class="source-pill" id="statusFonte">
          <span class="dot"></span>
          <span id="statusTexto">Carregando banco local…</span>
        </div>

        <button id="btnAtualizar" class="btn" type="button">
          ↻ Atualizar
        </button>
      </div>
    </header>
  `;

  return alvo.querySelector(".header");
}
