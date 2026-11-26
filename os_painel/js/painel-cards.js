import { supabaseClient } from "../../js/supabase.js";
import { painelDb } from "./painel-db.js";
import { osCache } from "./os-cache.js";
import { uiAlerta } from "./ui-alerta.js";
import { classificarStatusKpi, isOsProntaRetirada } from "./painel-kpis.js";
import { carregarCatalogoServicos } from "./painel-catalogo-regras.js";

function obterEstiloStatusCard(o) {
  const statusRaw = String(o?.status || "").trim();
  const temVenda = String(o?.numero_venda || "").trim().length > 0;
  const temRegistro = String(o?.registro_os || "").trim().length > 0;

  if (statusRaw === "Cancelado") {
    return {
      slug: "cancelado",
      texto: "Cancelado",
      isDone: false,
      borda: "#dc2626",
      bg: "#fef2f2",
      cor: "#b91c1c",
      bordaPill: "#fecaca",
    };
  }

  if (temVenda) {
    return {
      slug: "concluido",
      texto: "Concluído",
      isDone: true,
      borda: "#16a34a",
      bg: "#f0fdf4",
      cor: "#15803d",
      bordaPill: "#bbf7d0",
    };
  }

  if (temRegistro || statusRaw === "Em andamento") {
    return {
      slug: "andamento",
      texto: "Em andamento",
      isDone: false,
      borda: "#2563eb",
      bg: "#eff6ff",
      cor: "#1d4ed8",
      bordaPill: "#bfdbfe",
    };
  }

  return {
    slug: "pendente",
    texto: "Pendente",
    isDone: false,
    borda: "#d97706",
    bg: "#fffbeb",
    cor: "#b45309",
    bordaPill: "#fde68a",
  };
}

function normalizarTexto(v) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function extrairDataLocalISO(o) {
  const raw = o?.created_at || o?.criado_em || "";
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }
  const m = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function osPossuiServico(o, servicoFiltro) {
  const alvo = normalizarTexto(servicoFiltro);
  if (!alvo) return true;

  const listaTextos = [o?.servico || ""];
  if (Array.isArray(o?.itens_servicos)) {
    o.itens_servicos.forEach((it) => {
      if (it?.servico) listaTextos.push(it.servico);
      if (it?.nome) listaTextos.push(it.nome);
    });
  }

  return listaTextos.some((txt) => normalizarTexto(txt).includes(alvo));
}

export function criarGerenciadorCards({
  state,
  modalOS,
  atualizarKpisPainel,
  getFiltroKpi = () => "",
  esc,
  brl,
  getEl = (id) => document.getElementById(id),
} = {}) {
  let catalogoCarregado = false;

  function preencherSelectServico(selSrv, catalogo) {
    if (!selSrv || !Array.isArray(catalogo)) return;

    const nomes = [
      ...new Set(
        catalogo
          .map((item) =>
            typeof item === "string" ? item : item?.nome || item?.servico || "",
          )
          .map((n) => String(n).trim().toUpperCase())
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b, "pt-BR"));

    const atual = selSrv.value;
    selSrv.innerHTML =
      '<option value="">Todos os serviços</option>' +
      nomes.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("");

    if (nomes.includes(atual)) {
      selSrv.value = atual;
    }
  }

  function sincronizarCatalogoFiltro(selSrv) {
    if (!selSrv || typeof carregarCatalogoServicos !== "function") return;
    carregarCatalogoServicos()
      .then((catalogo) => {
        if (Array.isArray(catalogo) && catalogo.length > 0) {
          preencherSelectServico(selSrv, catalogo);
        }
      })
      .catch((err) => {
        console.warn("Não foi possível carregar catálogo de serviços:", err);
      });
  }

  function filtrados() {
    const q = (getEl("fBusca")?.value || "").trim().toLowerCase();
    const st = getEl("fStatus")?.value || "";
    const srv = getEl("fServico")?.value || "";
    const dataIni = getEl("fDataInicial")?.value || "";
    const dataFim = getEl("fDataFinal")?.value || "";
    const filtroKpi = typeof getFiltroKpi === "function" ? getFiltroKpi() : "";

    return state.dados.filter((o) => {
      if (q) {
        const alvo = [
          o.nome,
          o.telefone,
          o.placa,
          o.documento,
          o.servico,
          o.aparelho,
          o.registro_os,
          o.numero_venda,
          o.numero_os,
          o.numero_os_conserto,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!alvo.includes(q)) return false;
      }

      if (filtroKpi === "Prontas") {
        if (!isOsProntaRetirada(o)) return false;
      } else if (filtroKpi === "Pendente" || filtroKpi === "Em andamento") {
        if (classificarStatusKpi(o) !== filtroKpi) return false;
      }

      if (st && classificarStatusKpi(o) !== st) return false;
      if (srv && !osPossuiServico(o, srv)) return false;

      if (dataIni || dataFim) {
        const dataOs = extrairDataLocalISO(o);
        if (dataIni && (!dataOs || dataOs < dataIni)) return false;
        if (dataFim && (!dataOs || dataOs > dataFim)) return false;
      }

      return true;
    });
  }

  function cardHtml(o, idx) {
    const d = o.created_at || o.criado_em;
    const data = d ? new Date(d).toLocaleDateString("pt-BR") : "—";

    const nums = [
      o.numero_os
        ? `<span class="code-chip mono">REF ${esc(o.numero_os)}</span>`
        : "",
      o.numero_os_conserto
        ? `<span class="code-chip conserto mono">CON ${esc(o.numero_os_conserto)}</span>`
        : "",
    ].join("");

    const detalhes = [
      o.cor ? `<span class="detail-pill">Cor: ${esc(o.cor)}</span>` : "",
      o.quantidade != null && o.quantidade !== ""
        ? `<span class="detail-pill mono">Qtd: ${esc(o.quantidade)}</span>`
        : "",
      Number(o.desconto || 0) > 0
        ? `<span class="detail-pill mono">Desc: ${brl(o.desconto)}</span>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    const limiteFotosCard = 2;
    const fotosList = (o.fotos_locais || []).filter((f) => f.src);
    const fotosHtml = fotosList.length
      ? `${fotosList
          .slice(0, limiteFotosCard)
          .map(
            (f) => `<img src="${esc(f.src)}" alt="Foto OS" loading="lazy" />`,
          )
          .join("")}${
          fotosList.length > limiteFotosCard
            ? `<span class="more-photos mono">+${fotosList.length - limiteFotosCard}</span>`
            : ""
        }`
      : `<span class="no-photo-label">Sem fotos locais</span>`;

    const st = obterEstiloStatusCard(o);
    const resumoTexto =
      o.servico ||
      o.observacao ||
      o.observacao_manual ||
      "Sem resumo de serviço";

    return `
      <article
        class="os-card status-${st.slug} ${st.isDone ? "is-done" : "is-open"}"
        data-idx="${idx}"
        style="border-left:4px solid ${st.borda}"
      >
        <div class="card-header">
          <div>
            <div class="client-name">${esc(o.nome || "CONSUMIDOR")}</div>
            <div class="client-phone mono">${esc(o.telefone || "Sem telefone")}${o.placa ? ` · ${esc(o.placa)}` : ""}</div>
          </div>
          <span
            class="status-tag status-${st.slug}"
            style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;background:${st.bg};color:${st.cor};border:1px solid ${st.bordaPill};white-space:nowrap"
          >
            <span style="width:7px;height:7px;border-radius:50%;background:${st.borda};display:inline-block"></span>
            ${esc(st.texto)}
          </span>
        </div>

        <div class="card-meta-row">
          <div class="meta-left">
            <span class="device-discrete">${esc(o.aparelho || "Aparelho não inf.")}</span>
            <span class="mono">${esc(data)}</span>
          </div>
          <div class="os-codes">
            ${nums || `<span style="color:var(--muted)">Sem nº OS</span>`}
          </div>
        </div>

        ${detalhes ? `<div class="card-details-strip">${detalhes}</div>` : ""}

        <div class="card-service">${esc(resumoTexto)}</div>

        <div class="card-footer" style="display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div class="card-thumbs" style="display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;flex:1 1 auto">${fotosHtml}</div>
          <div class="card-price-box" style="flex-shrink:0;white-space:nowrap">
            <span class="card-price-label">Valor</span>
            <span class="card-price mono">${brl(o.valor)}</span>
          </div>
        </div>
      </article>
    `;
  }

  function render() {
    const selSrv = getEl("fServico");
    if (selSrv) {
      if (!selSrv.dataset.focusBound) {
        selSrv.dataset.focusBound = "1";
        selSrv.addEventListener("focus", () =>
          sincronizarCatalogoFiltro(selSrv),
        );
      }
      if (!catalogoCarregado) {
        catalogoCarregado = true;
        sincronizarCatalogoFiltro(selSrv);
      }
    }

    const boxPrimeiro = getEl("boxPrimeiroAcesso");
    const container = getEl("cards");
    if (!container) return;

    if (state.dados.length === 0) {
      if (boxPrimeiro) boxPrimeiro.style.display = "block";
      container.innerHTML = "";
      if (typeof atualizarKpisPainel === "function") atualizarKpisPainel([]);
      return;
    }

    if (boxPrimeiro) boxPrimeiro.style.display = "none";

    if (typeof atualizarKpisPainel === "function") {
      atualizarKpisPainel(state.dados);
    }

    const lista = filtrados();

    if (!lista.length) {
      container.innerHTML = `<div class="empty-box">Nenhuma Ordem de Serviço encontrada no banco local para os filtros aplicados.</div>`;
      return;
    }

    container.innerHTML = lista.map((o, idx) => cardHtml(o, idx)).join("");
    container.querySelectorAll(".os-card").forEach((card) => {
      card.addEventListener("click", () => {
        const idx = Number(card.dataset.idx);
        if (lista[idx]) modalOS.abrir(lista[idx]);
      });
    });
  }

  async function atualizarOS(os, patch) {
    modalOS.definirBotoesDesabilitados(true);

    const {
      novas_fotos_arquivos = [],
      novas_fotos_miniaturas = [],
      fotos_removidas = [],
      fotos_existentes_mantidas = [],
      ...patchTabela
    } = patch || {};

    try {
      const { error } = await supabaseClient
        .from("ordens_servico")
        .update(patchTabela)
        .eq("id", os.id);

      if (error) throw error;

      Object.assign(os, patchTabela);
      try {
        const registroCache = await painelDb.ordens_servico.get(os.id);
        if (registroCache) {
          await osCache.atualizarRegistroLocal({
            ...registroCache,
            ...patchTabela,
          });
        }
      } catch (cacheErr) {
        console.warn(
          "Não foi possível atualizar registro no OsPainelDB:",
          cacheErr,
        );
      }

      modalOS.fechar();
      render();
    } catch (e) {
      await uiAlerta("Falha ao atualizar OS", e.message || String(e), "erro");
      modalOS.definirBotoesDesabilitados(false);
    }
  }

  return {
    filtrados,
    render,
    atualizarOS,
  };
}
