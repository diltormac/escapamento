function formatarMoedaBrl(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function isOsFinalizada(o) {
  if (!o || o.status === "Cancelado") return false;
  const temVenda = String(o.numero_venda || "").trim().length > 0;
  return Boolean(o.servico_finalizado) || temVenda || o.status === "Concluído";
}

export function classificarStatusKpi(o) {
  if (!o || o.status === "Cancelado") return "Cancelado";
  const temVenda = String(o.numero_venda || "").trim().length > 0;
  const temRegistro = String(o.registro_os || "").trim().length > 0;

  if (temVenda || o.status === "Concluído") return "Concluído";
  if (temRegistro || o.status === "Em andamento") return "Em andamento";
  return "Pendente";
}

export function isOsProntaRetirada(o) {
  const st = classificarStatusKpi(o);
  return (
    Boolean(o?.servico_finalizado) && st !== "Concluído" && st !== "Cancelado"
  );
}

let faturamentoVisivel = false;
let ultimoFaturamentoTexto = "R$ 0,00";
let filtroAtivoAtual = "";

function atualizarDestaqueCards(alvo) {
  if (!alvo) return;
  alvo.querySelectorAll(".kpi-card[data-kpi-filtro]").forEach((card) => {
    const tipo = card.dataset.kpiFiltro || "";
    const ativo = filtroAtivoAtual !== "" && filtroAtivoAtual === tipo;
    card.style.borderColor = ativo ? "#2563eb" : "#e6ebf1";
    card.style.boxShadow = ativo
      ? "0 0 0 2px rgba(37, 99, 235, 0.18)"
      : "0 1px 3px rgba(16,24,40,.04)";
  });
}

export function definirFiltroKpiAtivo(tipo = "") {
  filtroAtivoAtual = tipo || "";
  const grid = document.querySelector("#kpisSlot .kpi-grid");
  atualizarDestaqueCards(grid);
}

function atualizarExibicaoFaturamento() {
  const elValor = document.getElementById("kTotalValor");
  const btnOlho = document.getElementById("btnToggleFaturamento");
  if (elValor) {
    elValor.textContent = faturamentoVisivel
      ? ultimoFaturamentoTexto
      : "••••••";
  }
  if (btnOlho) {
    btnOlho.title = faturamentoVisivel
      ? "Ocultar faturamento"
      : "Mostrar faturamento";
    btnOlho.setAttribute("aria-pressed", String(faturamentoVisivel));
    btnOlho.innerHTML = faturamentoVisivel
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  }
}

export function montarKpisPainel(
  alvoSeletor = "#kpisSlot",
  onSelecionarFiltro = null,
) {
  const alvo =
    typeof alvoSeletor === "string"
      ? document.querySelector(alvoSeletor)
      : alvoSeletor;

  if (!alvo) return null;

  const cardStyle =
    "background:#fff;border:1px solid #e6ebf1;border-radius:14px;padding:18px 20px;box-shadow:0 1px 3px rgba(16,24,40,.04);display:flex;flex-direction:column;justify-content:space-between;min-height:132px;position:relative;cursor:pointer;transition:border-color .15s,box-shadow .15s";
  const badgeBase =
    "width:38px;height:38px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px";
  const valorStyle =
    "font-size:26px;font-weight:700;line-height:1.15;color:#111827;letter-spacing:-0.02em";
  const labelStyle =
    "font-size:13px;font-weight:500;color:#4b5563;margin-top:4px";

  alvo.innerHTML = `
    <section
      class="kpi-grid"
      aria-label="Visão geral das ordens de serviço"
      style="display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:14px"
    >
      <div class="kpi-card" data-kpi-filtro="" style="${cardStyle}">
        <div style="${badgeBase};background:#eef2ff;color:#4f46e5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 2a1 1 0 0 0-1 1H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2a1 1 0 0 0-1-1H9zm0 2h6v1H9V4zm-1 5h8v2H8V9zm0 4h8v2H8v-2zm0 4h5v2H8v-2z"/>
          </svg>
        </div>
        <div>
          <div class="kpi-value" id="kTotal" style="${valorStyle}">—</div>
          <div class="kpi-sub" id="kTotalSub" style="${labelStyle}">Ordens cadastradas</div>
        </div>
      </div>

      <div class="kpi-card" data-kpi-filtro="Pendente" style="${cardStyle}">
        <div style="${badgeBase};background:#fef3c7;color:#b45309">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm1 10.414 3.293 3.293-1.414 1.414L11 13.242V6h2z"/>
          </svg>
        </div>
        <div>
          <div class="kpi-value" id="kAbertas" style="${valorStyle}">—</div>
          <div class="kpi-sub" style="${labelStyle}">Pendentes</div>
        </div>
      </div>

      <div class="kpi-card" data-kpi-filtro="Em andamento" style="${cardStyle}">
        <div style="${badgeBase};background:#eff6ff;color:#2563eb">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
            <line x1="12" y1="3" x2="12" y2="6"/>
            <line x1="12" y1="18" x2="12" y2="21"/>
            <line x1="4.93" y1="4.93" x2="7.05" y2="7.05"/>
            <line x1="16.95" y1="16.95" x2="19.07" y2="19.07"/>
            <line x1="3" y1="12" x2="6" y2="12"/>
            <line x1="18" y1="12" x2="21" y2="12"/>
            <line x1="4.93" y1="19.07" x2="7.05" y2="16.95"/>
            <line x1="16.95" y1="7.05" x2="19.07" y2="4.93"/>
          </svg>
        </div>
        <div>
          <div class="kpi-value" id="kAndamento" style="${valorStyle}">—</div>
          <div class="kpi-sub" style="${labelStyle}">Em andamento</div>
        </div>
      </div>

      <div class="kpi-card" data-kpi-filtro="Prontas" style="${cardStyle}">
        <div style="${badgeBase};background:#ecfdf5;color:#16a34a">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="7 11 11 15 18 7"/>
            <polyline points="7 16 11 20 18 12"/>
          </svg>
        </div>
        <div>
          <div class="kpi-value" id="kProntas" style="${valorStyle};color:#16a34a">—</div>
          <div class="kpi-sub" style="${labelStyle}">Prontas p/ Retirada</div>
        </div>
      </div>

      <div class="kpi-card" style="${cardStyle};cursor:default">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="${badgeBase};background:#ecfdf5;color:#16a34a">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="2" x2="12" y2="22"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <button
            type="button"
            id="btnToggleFaturamento"
            aria-label="Alternar visibilidade do faturamento"
            style="background:transparent;border:none;color:#9ca3af;cursor:pointer;padding:4px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center"
          ></button>
        </div>
        <div>
          <div class="kpi-value" id="kTotalValor" style="${valorStyle}">••••••</div>
          <div class="kpi-sub" style="${labelStyle}">Faturamento total</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:2px">exceto canceladas</div>
        </div>
      </div>
    </section>
  `;

  alvo
    .querySelector("#btnToggleFaturamento")
    ?.addEventListener("click", (e) => {
      e.stopPropagation();
      faturamentoVisivel = !faturamentoVisivel;
      atualizarExibicaoFaturamento();
    });

  alvo.querySelectorAll(".kpi-card[data-kpi-filtro]").forEach((card) => {
    card.addEventListener("click", () => {
      const clicado = card.dataset.kpiFiltro || "";
      const proximo =
        clicado === "" || filtroAtivoAtual === clicado ? "" : clicado;
      definirFiltroKpiAtivo(proximo);
      if (typeof onSelecionarFiltro === "function") {
        onSelecionarFiltro(proximo);
      }
    });
  });

  atualizarExibicaoFaturamento();
  return alvo.querySelector(".kpi-grid");
}

export function atualizarKpisPainel(entrada = []) {
  let total = 0;
  let pendentes = 0;
  let emAndamento = 0;
  let prontas = 0;
  let soma = 0;

  if (entrada && !Array.isArray(entrada) && typeof entrada === "object") {
    total = Number(entrada.total ?? entrada.ordens_cadastradas ?? 0);
    pendentes = Number(entrada.pendentes ?? 0);
    emAndamento = Number(entrada.em_andamento ?? entrada.emAndamento ?? 0);
    prontas = Number(entrada.prontas ?? 0);
    soma = Number(entrada.faturamento ?? entrada.soma ?? 0);
  } else {
    const lista = Array.isArray(entrada) ? entrada : [];
    total = lista.length;

    for (const o of lista) {
      const st = classificarStatusKpi(o);
      if (st === "Pendente") pendentes += 1;
      else if (st === "Em andamento") emAndamento += 1;

      if (isOsProntaRetirada(o)) {
        prontas += 1;
      }

      if (st !== "Cancelado") {
        soma += Number(o.valor || 0);
      }
    }
  }

  ultimoFaturamentoTexto = formatarMoedaBrl(soma);

  const elTotal = document.getElementById("kTotal");
  const elAbertas = document.getElementById("kAbertas");
  const elAndamento = document.getElementById("kAndamento");
  const elProntas = document.getElementById("kProntas");

  if (elTotal) elTotal.textContent = total;
  if (elAbertas) elAbertas.textContent = pendentes;
  if (elAndamento) elAndamento.textContent = emAndamento;
  if (elProntas) elProntas.textContent = prontas;

  atualizarExibicaoFaturamento();
}
