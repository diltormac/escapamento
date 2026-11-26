import { uiAlerta } from "./ui-alerta.js";
import { montarHeaderPainel } from "./painel-header.js";
import {
  montarKpisPainel,
  atualizarKpisPainel,
  definirFiltroKpiAtivo,
} from "./painel-kpis.js";
import { montarSidebarPainel, abrirSidebar, fecharSidebar } from "./sidebar.js";
import { criarModalDetalhesOS } from "./painel-modal-os.js";
import { criarLightboxPainel } from "./painel-lightbox.js";
import { criarGaleriaOffline } from "./painel-galeria-offline.js";
import { criarGerenciadorSync } from "./painel-sync.js";
import { criarGerenciadorBackup } from "./painel-backup.js";
import { criarGerenciadorCards } from "./painel-cards.js";
import { osCache } from "./os-cache.js";

const el = (id) => document.getElementById(id);

let filtroKpiAtivo = "";
let galeriaOffline = null;
let gerenciadorCards = null;

montarHeaderPainel("#headerSlot");
if (el("headerSlot")) {
  el("headerSlot").style.display = "none";
}

montarKpisPainel("#kpisSlot", (tipoFiltro) => {
  filtroKpiAtivo = tipoFiltro || "";
  gerenciadorCards?.render();
});
if (el("kpisSlot")) {
  el("kpisSlot").style.display = "none";
}

const sidebarPainel = montarSidebarPainel("#sidebarSlot");
window.abrirSidebarPainel = abrirSidebar;

const state = {
  dados: [],
  blobUrls: [],
  sincronizandoBg: false,
  canalRealtime: null,
  realtimeAtivo: false,
};

function setStatusIndicator(texto, isOffline) {
  const statusEl = el("statusTexto");
  const fonteEl = el("statusFonte");
  if (statusEl) statusEl.textContent = texto;
  if (fonteEl) fonteEl.classList.toggle("offline", isOffline);
  sidebarPainel?.sincronizar();
}

function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

function brl(n) {
  return Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const lightbox = criarLightboxPainel();

galeriaOffline = criarGaleriaOffline({
  onAbrirLightbox: (fotos, idx) => lightbox.abrir(fotos, idx),
  onAviso: (titulo, msg, tipo) => uiAlerta(titulo, msg, tipo),

  onAbrirOS: async (idOs) => {
    if (!idOs) return false;

    // Normaliza o ID para busca (apenas string)
    const buscaId = String(idOs).trim();

    // 1. Tenta achar a OS na lista que já está na memória
    let osEncontrada = state.dados.find(
      (o) => String(o.id) === buscaId || String(o.uuid_local) === buscaId,
    );

    // 2. Se não achar, busca direto do banco local (IndexedDB)
    if (!osEncontrada) {
      const locais = await osCache.listarOffline();
      osEncontrada = locais.find(
        (o) => String(o.id) === buscaId || String(o.uuid_local) === buscaId,
      );
    }

    if (osEncontrada) {
      // Usa um pequeno atraso para garantir que a galeria feche suavemente
      setTimeout(() => modalOS.abrir(osEncontrada), 100);
      return true; // Avisa a galeria que abriu com sucesso
    }

    return false; // Avisa a galeria que falhou (ela abrirá o lightbox)
  },
});

const modalOS = criarModalDetalhesOS({
  onAbrirFoto: (fotosValidas, idx) => lightbox.abrir(fotosValidas, idx),
  onAtualizarOS: (os, patch) => gerenciadorCards?.atualizarOS(os, patch),
  onFechar: () => lightbox.fechar(),
});

gerenciadorCards = criarGerenciadorCards({
  state,
  modalOS,
  atualizarKpisPainel,
  getFiltroKpi: () => filtroKpiAtivo,
  esc,
  brl,
  getEl: el,
});

const gerenciadorSync = criarGerenciadorSync({
  state,
  setStatusIndicator,
  onDadosAtualizados: () => {
    gerenciadorBackup.atualizarInfoBackup();
    gerenciadorCards.render();
    sidebarPainel?.sincronizar();
  },
  getBtnAtualizar: () => el("btnAtualizar"),
});

const gerenciadorBackup = criarGerenciadorBackup({
  setStatusIndicator,
  carregarDoBancoOffline: gerenciadorSync.carregarDoBancoOffline,
  sincronizarNovos: gerenciadorSync.sincronizarNovos,
  getEl: el,
});

/* ---------------- Eventos Globais ---------------- */

["fBusca", "fServico", "fDataInicial", "fDataFinal"].forEach((id) =>
  el(id)?.addEventListener("input", () => {
    gerenciadorCards.render();
  }),
);

el("fServico")?.addEventListener("change", () => gerenciadorCards.render());
el("fDataInicial")?.addEventListener("change", () => gerenciadorCards.render());
el("fDataFinal")?.addEventListener("change", () => gerenciadorCards.render());

el("btnLimparFiltros")?.addEventListener("click", () => {
  filtroKpiAtivo = "";
  definirFiltroKpiAtivo("");
  if (el("fBusca")) el("fBusca").value = "";
  if (el("fServico")) el("fServico").value = "";
  if (el("fDataInicial")) el("fDataInicial").value = "";
  if (el("fDataFinal")) el("fDataFinal").value = "";
  gerenciadorCards.render();
});

el("btnGaleriaOffline")?.addEventListener("click", () => {
  galeriaOffline.abrirGaleriaOffline(0);
});

el("btnAtualizar")?.addEventListener("click", async () => {
  await gerenciadorSync.sincronizarNovos(true);
  sidebarPainel?.sincronizar();

  const textoStatus = (el("statusTexto")?.textContent || "").trim();
  const offline = Boolean(el("statusFonte")?.classList.contains("offline"));

  if (offline) {
    await uiAlerta(
      "Sincronização offline",
      textoStatus || "Sem conexão no momento. Exibindo dados locais.",
      "aviso",
    );
  } else {
    await uiAlerta(
      "Painel atualizado",
      textoStatus || "Ordens de serviço sincronizadas com sucesso.",
      "sucesso",
    );
  }
});

el("btnInicialSupabase")?.addEventListener("click", () =>
  gerenciadorSync.sincronizarNovos(true),
);

el("btnRestaurarBackup")?.addEventListener(
  "click",
  gerenciadorBackup.solicitarRestauracaoComSenha,
);
el("btnInicialRestaurar")?.addEventListener(
  "click",
  gerenciadorBackup.solicitarRestauracaoComSenha,
);
el("inputRestaurarBackup")?.addEventListener("change", (e) => {
  gerenciadorBackup.acionarRestaurarBackup(e.target.files?.[0]);
});

el("btnExportarBackup")?.addEventListener(
  "click",
  gerenciadorBackup.acionarExportarBackup,
);

document.addEventListener("keydown", (e) => {
  if (lightbox.estaAberto()) {
    if (e.key === "Escape") lightbox.fechar();
    else if (e.key === "ArrowLeft") lightbox.navegar(-1);
    else if (e.key === "ArrowRight") lightbox.navegar(1);
    return;
  }

  if (e.key === "Escape" && galeriaOffline?.estaAberta?.()) {
    galeriaOffline.fechar();
    return;
  }

  if (e.key === "Escape" && modalOS.estaAberto()) {
    modalOS.fechar();
  }

  const sidebarEl = document.getElementById("sidebar");
  if (
    e.key === "Escape" &&
    sidebarEl &&
    (sidebarEl.style.transform === "translateX(0)" ||
      sidebarEl.style.transform === "translateX(0px)")
  ) {
    fecharSidebar();
  }
});

window.addEventListener("online", async () => {
  await gerenciadorSync.sincronizarNovos(false);
  gerenciadorSync.iniciarRealtime();
});

window.addEventListener("offline", async () => {
  await gerenciadorSync.encerrarRealtime();
  await gerenciadorSync.carregarDoBancoOffline();
});

gerenciadorSync.carregarDoBancoOffline().then(async () => {
  await gerenciadorSync.sincronizarNovos(false);
  gerenciadorSync.iniciarRealtime();
});
