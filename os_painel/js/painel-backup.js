import { uiAlerta } from "./ui-alerta.js";
import {
  exportarBackupComSenha,
  restaurarBackupArquivo,
  solicitarSenhaBackup,
  obterUltimoBackupTexto,
} from "./backup-manager.js";

export function criarGerenciadorBackup({
  setStatusIndicator,
  carregarDoBancoOffline,
  sincronizarNovos,
  getEl = (id) => document.getElementById(id),
} = {}) {
  function atualizarInfoBackup() {
    const infoEl = getEl("infoUltimoBackup");
    if (infoEl) {
      infoEl.textContent = obterUltimoBackupTexto();
    }
  }

  async function acionarExportarBackup() {
    const btn = getEl("btnExportarBackup");
    if (btn) btn.disabled = true;

    try {
      const res = await exportarBackupComSenha((msg) => {
        setStatusIndicator(msg, !navigator.onLine);
      });

      if (res.cancelado) return;
      if (!res.ok) {
        await uiAlerta(
          "Aviso",
          res.erro || "Não foi possível exportar o backup.",
          "aviso",
        );
        return;
      }

      atualizarInfoBackup();
      await uiAlerta(
        "Backup concluído",
        `Backup gerado com sucesso (${res.total} OS).`,
        "sucesso",
      );
    } catch (err) {
      console.error("Erro ao exportar backup:", err);
      await uiAlerta("Erro ao exportar", err.message || String(err), "erro");
    } finally {
      if (btn) btn.disabled = false;
      await carregarDoBancoOffline();
    }
  }

  async function solicitarRestauracaoComSenha() {
    const autorizado = await solicitarSenhaBackup("restaurar o backup");
    if (!autorizado) return;
    getEl("inputRestaurarBackup")?.click();
  }

  async function acionarRestaurarBackup(arquivo) {
    if (!arquivo) return;

    const btnTopo = getEl("btnRestaurarBackup");
    const btnInicial = getEl("btnInicialRestaurar");
    if (btnTopo) btnTopo.disabled = true;
    if (btnInicial) btnInicial.disabled = true;

    try {
      const res = await restaurarBackupArquivo(arquivo, (msg) => {
        setStatusIndicator(msg, !navigator.onLine);
      });

      if (!res.ok) {
        await uiAlerta(
          "Aviso",
          res.erro || "Falha ao restaurar backup.",
          "aviso",
        );
        return;
      }

      await carregarDoBancoOffline(`${res.importados} OS restaurada(s)`);
      await uiAlerta(
        "Restauração concluída",
        `Backup restaurado com sucesso (${res.importados} OS).`,
        "sucesso",
      );

      if (navigator.onLine && typeof sincronizarNovos === "function") {
        await sincronizarNovos(false);
      }
    } catch (err) {
      console.error("Erro ao restaurar backup:", err);
      await uiAlerta("Erro ao restaurar", err.message || String(err), "erro");
    } finally {
      if (btnTopo) btnTopo.disabled = false;
      if (btnInicial) btnInicial.disabled = false;
      const inputFile = getEl("inputRestaurarBackup");
      if (inputFile) inputFile.value = "";
      await carregarDoBancoOffline();
    }
  }

  return {
    atualizarInfoBackup,
    acionarExportarBackup,
    solicitarRestauracaoComSenha,
    acionarRestaurarBackup,
  };
}
