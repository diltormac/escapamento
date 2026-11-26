import { db, sincronizarServicos } from "../js/db.js";
import { supabaseClient } from "../js/supabase.js";

(function () {
  const style = document.createElement("style");
  style.textContent = `
    html, body { overscroll-behavior: none; }
    .service-sheet-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh;
      background: rgba(0, 0, 0, 0.75); z-index: 9999;
      display: none; align-items: flex-start; justify-content: center;
      opacity: 0; transition: opacity 0.3s; box-sizing: border-box; overflow: hidden;
    }
    .service-sheet-overlay.open { display: flex; opacity: 1; }
    .service-sheet-content {
      width: 100%; max-width: 540px; background: #111b2d;
      border-radius: 0 0 24px 24px; padding: 20px;
      transform: translateY(-100%); transition: transform 0.3s ease-out;
      max-height: 100dvh; display: flex; flex-direction: column; box-sizing: border-box;
    }
    .service-sheet-overlay.open .service-sheet-content { transform: translateY(0); }
    .service-sheet-handle { width: 40px; height: 4px; background: #435675; border-radius: 2px; margin: 0 auto 16px; flex-shrink: 0; }
    .service-sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .service-sheet-header h3 { margin: 0; font-size: 18px; color: #f4f7fc; }
    .btn-close-sheet { background: transparent; border: 0; color: #9aa9c2; font-size: 24px; cursor: pointer; padding: 0; line-height: 1; }
    .service-catalog-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
      margin-bottom: 16px; max-height: 150px; overflow-y: auto; padding-right: 4px;
      scrollbar-width: none; -ms-overflow-style: none;
    }
    .service-catalog-grid::-webkit-scrollbar { display: none; }
    .service-catalog-btn {
      background: #0d1728; border: 1px solid #34435f; color: #ffffff;
      padding: 10px 6px; border-radius: 8px; font-size: 12px; font-weight: 800;
      cursor: pointer; transition: all 0.2s; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; text-align: center;
      text-transform: uppercase; text-shadow: 0px 1px 2px rgba(0,0,0,0.5);
    }
    .service-catalog-btn:active { background: #ffc400; color: #000; border-color: #ffc400; transform: scale(0.96); }
    .service-catalog-btn.selected { background: rgba(74, 222, 128, 0.15); border-color: rgba(74, 222, 128, 0.5); color: #4ade80; text-shadow: none; }
    .btn-add-manual {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; height: 44px; margin-bottom: 16px;
      background: transparent; border: 1.5px dashed #7386a6; border-radius: 12px;
      color: #c8d3e4; font-size: 14px; font-weight: bold; cursor: pointer; transition: all 0.2s;
    }
    .btn-add-manual:active { background: rgba(255, 196, 0, 0.1); border-color: #ffc400; color: #ffc400; }
    .manual-input-wrapper { display: none; gap: 8px; margin-bottom: 16px; width: 100%; box-sizing: border-box; }
    .manual-input-wrapper.active { display: flex; animation: fadeIn 0.2s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
    .manual-input-wrapper input {
      flex: 1; width: 0; min-width: 0; height: 48px; border-radius: 12px; border: 1.5px solid #34435f;
      background: #0d1728; color: #f4f7fc; padding: 0 16px; font-size: 14px; outline: none; box-sizing: border-box; text-transform: uppercase;
    }
    .manual-input-wrapper input:focus { border-color: #ffc400; }
    .manual-input-wrapper input::placeholder { text-transform: none; }
    .manual-input-wrapper button {
      width: 48px; flex-shrink: 0; height: 48px; border-radius: 12px; border: 0;
      background: #ffc400; color: #000; font-weight: bold; font-size: 20px; cursor: pointer; display: grid; place-items: center;
    }
    .service-list {
      flex: 1; overflow-y: auto; min-height: 100px; max-height: 35vh;
      display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;
      scrollbar-width: none; -ms-overflow-style: none;
    }
    .service-list::-webkit-scrollbar { display: none; }
    .service-item { display: flex; flex-direction: column; gap: 10px; background: #0d1728; border: 1px solid #34435f; padding: 14px; border-radius: 12px; }
    .service-item-header { display: flex; justify-content: space-between; align-items: flex-start; }

    .service-item-title-row { display: flex; align-items: center; gap: 8px; flex: 1; flex-wrap: wrap; }
    .service-item-name { font-weight: bold; font-size: 16px; color: #f4f7fc; text-transform: uppercase; word-break: break-word; }
    .badge-numero-os {
      background: #ffc400;
      color: #000000;
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 0.4px;
      padding: 5px 11px;
      border-radius: 8px;
      border: 1px solid #ffe066;
      box-shadow: 0 2px 8px rgba(255, 196, 0, 0.35);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      line-height: 1.1;
    }

    .btn-remove-service {
      background: rgba(255, 68, 68, 0.1); border: 0; color: #ff4444;
      width: 32px; height: 32px; border-radius: 8px; cursor: pointer;
      display: grid; place-items: center; flex-shrink: 0; margin-left: 10px; margin-top: -4px; margin-right: -4px;
    }
    .service-item-body { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .qty-control { display: flex; align-items: center; background: #1a263b; border-radius: 8px; border: 1px solid #34435f; overflow: hidden; height: 40px; }
    .qty-btn { background: transparent; border: 0; color: #c8d3e4; width: 36px; height: 100%; font-size: 20px; font-weight: bold; cursor: pointer; }
    .qty-btn:active { background: #2a3b55; }
    .qty-value { width: 30px; text-align: center; font-size: 16px; font-weight: bold; color: #fff; }
    .valor-input-wrapper { display: flex; align-items: center; background: #1a263b; border-radius: 8px; border: 1px solid #34435f; padding: 0 10px; height: 40px; flex: 1; }
    .valor-input-wrapper span { font-size: 12px; color: #8797b3; font-weight: bold; margin-right: 4px; }
    .valor-input { width: 100%; background: transparent; border: 0; color: #4ade80; font-size: 16px; font-weight: bold; outline: none; padding: 0; text-align: right; }
    .valor-input::-webkit-outer-spin-button, .valor-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .valor-input[type=number] { -moz-appearance: textfield; }
    .service-item-total { font-size: 14px; font-weight: 900; color: #fff; background: rgba(74, 222, 128, 0.15); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(74, 222, 128, 0.3); white-space: nowrap; height: 40px; display: flex; align-items: center; }
    .service-empty { text-align: center; color: #9aa9c2; font-size: 14px; padding: 20px 0; }
    .service-sheet-footer button { width: 100%; height: 56px; border-radius: 14px; border: 0; background: #ffc400; color: #000; font-weight: bold; font-size: 16px; cursor: pointer; }

    /* Cor da roda REFORMA — destaque obrigatório */
    .reforma-cor-wrapper {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255, 196, 0, 0.06);
      border: 1.5px solid rgba(255, 196, 0, 0.55);
      border-radius: 10px; padding: 0 12px; height: 44px;
      width: 100%; box-sizing: border-box;
      transition: border-color 0.2s, background 0.2s;
    }
    .reforma-cor-wrapper:hover {
      border-color: rgba(255, 196, 0, 0.85);
      background: rgba(255, 196, 0, 0.09);
    }
    .reforma-cor-wrapper svg {
      width: 18px; height: 18px; color: #ffc400; flex-shrink: 0;
    }
    .reforma-cor-wrapper .cor-label {
      font-size: 10px; font-weight: 900; color: #ffc400;
      letter-spacing: 0.6px; white-space: nowrap;
      text-transform: uppercase;
    }
    .reforma-cor-wrapper .cor-label .obrig {
      color: #ff5555; font-size: 12px;
    }
    .reforma-cor-wrapper input {
      flex: 1; width: 0; min-width: 0;
      background: transparent; border: 0; outline: 0;
      color: #f4f7fc; font-size: 14px; font-weight: 800;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .reforma-cor-wrapper input::placeholder {
      color: #6b7a94; text-transform: none;
      font-weight: 500; letter-spacing: 0;
    }

    .reforma-cor-wrapper.preenchido {
      border-color: rgba(74, 222, 128, 0.6);
      background: rgba(74, 222, 128, 0.06);
    }
    .reforma-cor-wrapper.preenchido svg { color: #4ade80; }
    .reforma-cor-wrapper.preenchido .cor-label { color: #4ade80; }

    .reforma-cor-wrapper.erro {
      border-color: #ff4444;
      background: rgba(255, 68, 68, 0.08);
      animation: shakeCor 0.3s;
    }
    .reforma-cor-wrapper.erro svg,
    .reforma-cor-wrapper.erro .cor-label { color: #ff5555; }
    @keyframes shakeCor {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    @media (max-width: 380px) {
      .service-item-body { flex-wrap: wrap; }
      .service-item-total { width: 100%; justify-content: center; }
      .service-catalog-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-height: 700px) {
      .service-list { max-height: 30vh; }
      .service-catalog-grid { max-height: 120px; }
    }
  `;
  document.head.appendChild(style);

  let services = [];
  let renderFn = null;
  let mainLabelRef = null;
  let mainBtnRef = null;

  function normalizarNome(nome) {
    return String(nome || "")
      .trim()
      .toUpperCase();
  }

  function isReforma(nome) {
    return normalizarNome(nome) === "REFORMA";
  }

  function isConsertoOuSolda(nome) {
    const n = normalizarNome(nome);
    return n.includes("CONSERTO") || n.includes("SOLDA");
  }

  function getNumeroDoServico(s) {
    if (isReforma(s.nome)) return s.numero_os || null;
    if (isConsertoOuSolda(s.nome)) return s.numero_os_conserto || null;
    return null;
  }

  function setNumeroDoServico(s, valor) {
    const limpo = valor ? String(valor).replace(/\D/g, "") : null;
    if (isReforma(s.nome)) {
      s.numero_os = limpo || null;
    } else if (isConsertoOuSolda(s.nome)) {
      s.numero_os_conserto = limpo || null;
    }
  }

  // Menor número livre de REFORMA a partir de 5898 (coluna numero_os)
  async function buscarMenorNumeroLivreReforma() {
    if (!navigator.onLine) return null;

    try {
      const { data, error } = await supabaseClient
        .from("ordens_servico")
        .select("numero_os")
        .ilike("servico", "%REFORMA%")
        .not("numero_os", "is", null);

      if (error || !data) return null;

      const usados = new Set(
        data
          .map((r) =>
            parseInt(String(r.numero_os || "").replace(/\D/g, ""), 10),
          )
          .filter((n) => Number.isInteger(n) && n >= 5898),
      );

      let candidato = 5898;
      while (usados.has(candidato)) {
        candidato++;
      }

      return String(candidato);
    } catch (err) {
      console.warn("Erro ao buscar número livre de reforma:", err);
      return null;
    }
  }

  // Menor número livre compartilhado de CONSERTO e SOLDA a partir de 6189 (coluna numero_os_conserto)
  async function buscarMenorNumeroLivreConsertoSolda() {
    if (!navigator.onLine) return null;

    try {
      const { data, error } = await supabaseClient
        .from("ordens_servico")
        .select("numero_os_conserto")
        .or("servico.ilike.%CONSERTO%,servico.ilike.%SOLDA%")
        .not("numero_os_conserto", "is", null);

      if (error || !data) return null;

      const usados = new Set(
        data
          .map((r) =>
            parseInt(String(r.numero_os_conserto || "").replace(/\D/g, ""), 10),
          )
          .filter((n) => Number.isInteger(n) && n >= 6189),
      );

      let candidato = 6189;
      while (usados.has(candidato)) {
        candidato++;
      }

      return String(candidato);
    } catch (err) {
      console.warn("Erro ao buscar número livre de conserto/solda:", err);
      return null;
    }
  }

  async function obterProximoNumeroParaServico(nome) {
    if (!navigator.onLine) return null;
    if (isReforma(nome)) return await buscarMenorNumeroLivreReforma();
    if (isConsertoOuSolda(nome))
      return await buscarMenorNumeroLivreConsertoSolda();
    return null;
  }

  window.ServiceSheet = {
    init: function (containerId, triggerBtnId, labelId) {
      const container = document.getElementById(containerId);
      const mainBtn = document.getElementById(triggerBtnId);
      const mainLabel = document.getElementById(labelId);

      if (!container) return;
      mainLabelRef = mainLabel;
      mainBtnRef = mainBtn;

      let viewportMeta = document.querySelector('meta[name="viewport"]');
      if (
        viewportMeta &&
        !viewportMeta.content.includes("interactive-widget")
      ) {
        viewportMeta.content += ", interactive-widget=resizes-content";
      }

      container.innerHTML = `
        <div class="service-sheet-overlay" id="sheetOverlay">
          <div class="service-sheet-content">
            <div class="service-sheet-handle"></div>
            <div class="service-sheet-header">
              <h3>Selecionar Serviços</h3>
              <button class="btn-close-sheet" id="closeSheetBtn">×</button>
            </div>

            <div class="service-catalog-grid" id="servicesCatalog">
              <span style="color: #8797b3; font-size: 12px; grid-column: 1 / -1; text-align: center;">Carregando...</span>
            </div>

            <button type="button" class="btn-add-manual" id="btnShowManualInput">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 5v14M5 12h14"/></svg>
              Adicionar outro serviço
            </button>

            <div class="manual-input-wrapper" id="manualInputWrapper">
              <input type="text" id="inputServico" placeholder="Digite o nome do serviço..." maxlength="50">
              <button type="button" id="addServiceBtn">+</button>
            </div>

            <div class="service-list" id="servicesList"></div>

            <div class="service-sheet-footer">
              <button type="button" id="finishSheetBtn">Concluir</button>
            </div>
          </div>
        </div>
      `;

      const overlay = document.getElementById("sheetOverlay");
      const list = document.getElementById("servicesList");
      const catalog = document.getElementById("servicesCatalog");
      const btnShowManual = document.getElementById("btnShowManualInput");
      const manualWrapper = document.getElementById("manualInputWrapper");
      const input = document.getElementById("inputServico");
      const btnAdd = document.getElementById("addServiceBtn");

      const atualizarDestaquesCatalogo = () => {
        catalog.querySelectorAll(".service-catalog-btn").forEach((btn) => {
          const nome = normalizarNome(btn.dataset.nome);
          const selecionado = services.some(
            (s) => normalizarNome(s.nome) === nome,
          );
          if (selecionado) btn.classList.add("selected");
          else btn.classList.remove("selected");
        });
      };

      const renderCatalogo = (dbServices) => {
        if (dbServices.length === 0) {
          catalog.innerHTML =
            '<span style="color: #8797b3; font-size: 12px; grid-column: 1 / -1; text-align: center;">Nenhum serviço no catálogo.</span>';
          return;
        }

        catalog.innerHTML = dbServices
          .map((s) => {
            const nomeUpper = normalizarNome(s.nome);
            const selecionado = services.some(
              (item) => normalizarNome(item.nome) === nomeUpper,
            );
            return `<button type="button" class="service-catalog-btn ${selecionado ? "selected" : ""}" data-nome="${s.nome}" data-valor="${s.valor}" title="${s.nome}">${s.nome}</button>`;
          })
          .join("");

        catalog.querySelectorAll(".service-catalog-btn").forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            const nome = normalizarNome(e.currentTarget.dataset.nome);
            const valor = Number(e.currentTarget.dataset.valor);

            const existente = services.find(
              (s) => normalizarNome(s.nome) === nome,
            );
            if (existente) {
              existente.qtd += 1;
            } else {
              const numero = await obterProximoNumeroParaServico(nome);
              services.push({
                nome,
                valor,
                qtd: 1,
                cor: isReforma(nome) ? "" : null,
                numero_os: isReforma(nome) ? numero : null,
                numero_os_conserto: isConsertoOuSolda(nome) ? numero : null,
              });
            }
            render();
            atualizarDestaquesCatalogo();
          });
        });
      };

      const loadCatalog = async () => {
        const locais = await db.catalogo_servicos.toArray();
        if (locais.length > 0) {
          renderCatalogo(locais);
        } else {
          catalog.innerHTML =
            '<span style="color: #8797b3; font-size: 12px; grid-column: 1 / -1; text-align: center;">Carregando...</span>';
        }

        sincronizarServicos().then(async (sincronizou) => {
          if (!sincronizou) {
            const cache = await db.catalogo_servicos.toArray();
            if (cache.length === 0) {
              catalog.innerHTML =
                '<span style="color: #8797b3; font-size: 12px; grid-column: 1 / -1; text-align: center;">Nenhum serviço no catálogo.</span>';
            }
            return;
          }
          const atualizados = await db.catalogo_servicos.toArray();
          renderCatalogo(atualizados);
        });
      };

      const render = () => {
        if (services.length === 0) {
          list.innerHTML =
            '<div class="service-empty">Nenhum serviço selecionado.</div>';
          return;
        }

        list.innerHTML = services
          .map((s, i) => {
            const totalItem = s.qtd * s.valor;
            const numAtual = getNumeroDoServico(s);
            const mostrarEtiqueta =
              (isReforma(s.nome) || isConsertoOuSolda(s.nome)) &&
              navigator.onLine &&
              numAtual;

            return `
          <div class="service-item">
            <div class="service-item-header">
              <div class="service-item-title-row">
                <span class="service-item-name">${s.nome}</span>
                ${
                  mostrarEtiqueta
                    ? `
                  <span class="badge-numero-os" title="Clique para editar" onclick="document.getElementById('edit-num-${i}').style.display='block'; this.style.display='none'; document.getElementById('edit-num-${i}').focus();">
                    Nº ${numAtual} ✎
                  </span>
                  <input type="text" id="edit-num-${i}" class="input-edit-num" data-index="${i}" value="${numAtual}" style="display:none; width: 84px; background: #1a263b; border: 1px solid #ffc400; color: #fff; border-radius: 6px; padding: 3px 6px; font-size: 14px; font-weight: bold;" maxlength="8">
                `
                    : ""
                }
              </div>
              <button type="button" class="btn-remove-service" data-index="${i}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div class="service-item-body">
              <div class="qty-control">
                <button type="button" class="qty-btn btn-minus" data-index="${i}">−</button>
                <span class="qty-value">${s.qtd}</span>
                <button type="button" class="qty-btn btn-plus" data-index="${i}">+</button>
              </div>

              <div class="valor-input-wrapper">
                <span>R$</span>
                <input type="number" class="valor-input input-valor" data-index="${i}" value="${s.valor}" step="0.01" min="0">
              </div>

              <div class="service-item-total">
                R$ ${totalItem.toFixed(2)}
              </div>
            </div>

            ${
              isReforma(s.nome)
                ? `
              <div class="reforma-cor-wrapper ${s.cor ? "preenchido" : ""}" data-cor-index="${i}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <span class="cor-label">COR <span class="obrig">*</span></span>
                <input
                  type="text"
                  class="input-cor-reforma"
                  data-index="${i}"
                  value="${s.cor || ""}"
                  placeholder="PRATA, PRETO, GRAFITE..."
                  maxlength="30"
                >
              </div>
            `
                : ""
            }
          </div>
        `;
          })
          .join("");

        list.querySelectorAll(".btn-minus").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const idx = e.currentTarget.dataset.index;
            if (services[idx].qtd > 1) {
              services[idx].qtd -= 1;
              render();
            }
          });
        });

        list.querySelectorAll(".btn-plus").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const idx = e.currentTarget.dataset.index;
            services[idx].qtd += 1;
            render();
          });
        });

        list.querySelectorAll(".input-valor").forEach((inputEl) => {
          inputEl.addEventListener("focus", (e) => e.target.select());
          inputEl.addEventListener("input", (e) => {
            const idx = e.currentTarget.dataset.index;
            services[idx].valor = Number(e.currentTarget.value) || 0;
            const itemElement = e.currentTarget.closest(".service-item");
            const totalDiv = itemElement.querySelector(".service-item-total");
            const novoTotal = services[idx].qtd * services[idx].valor;
            totalDiv.textContent = `R$ ${novoTotal.toFixed(2)}`;
          });
        });

        list.querySelectorAll(".input-cor-reforma").forEach((inputEl) => {
          inputEl.addEventListener("input", (e) => {
            const idx = e.currentTarget.dataset.index;
            const val = e.currentTarget.value.toUpperCase();
            services[idx].cor = val;

            const wrapper = e.currentTarget.closest(".reforma-cor-wrapper");
            wrapper.classList.toggle("preenchido", val.trim().length > 0);
            wrapper.classList.remove("erro");
          });
        });

        list.querySelectorAll(".input-edit-num").forEach((inputEl) => {
          inputEl.addEventListener("blur", (e) => {
            const idx = e.currentTarget.dataset.index;
            setNumeroDoServico(services[idx], e.currentTarget.value);
            render();
          });
          inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          });
        });

        list.querySelectorAll(".btn-remove-service").forEach((b) => {
          b.addEventListener("click", (e) => {
            services.splice(e.currentTarget.dataset.index, 1);
            render();
            atualizarDestaquesCatalogo();
          });
        });
      };

      renderFn = render;

      btnShowManual.addEventListener("click", () => {
        btnShowManual.style.display = "none";
        manualWrapper.classList.add("active");
        input.focus({ preventScroll: true });
      });

      const add = async () => {
        const val = normalizarNome(input.value);
        if (!val) return;

        const numero = await obterProximoNumeroParaServico(val);
        services.push({
          nome: val,
          valor: 0,
          qtd: 1,
          cor: isReforma(val) ? "" : null,
          numero_os: isReforma(val) ? numero : null,
          numero_os_conserto: isConsertoOuSolda(val) ? numero : null,
        });
        input.value = "";
        render();
        atualizarDestaquesCatalogo();
        manualWrapper.classList.remove("active");
        btnShowManual.style.display = "flex";
      };

      const atualizarNumerosSelecionados = async () => {
        for (const s of services) {
          if (isReforma(s.nome)) {
            s.numero_os = await buscarMenorNumeroLivreReforma();
          } else if (isConsertoOuSolda(s.nome)) {
            s.numero_os_conserto = await buscarMenorNumeroLivreConsertoSolda();
          }
        }
      };

      const open = async () => {
        document.body.style.overflow = "hidden";
        overlay.classList.add("open");

        await atualizarNumerosSelecionados();
        loadCatalog();
        render();
        manualWrapper.classList.remove("active");
        btnShowManual.style.display = "flex";
      };

      const close = () => {
        // Valida cor obrigatória em toda REFORMA
        const reformasSemCor = services.filter(
          (s) => isReforma(s.nome) && !(s.cor && s.cor.trim()),
        );
        if (reformasSemCor.length > 0) {
          // Marca os wrappers em erro
          list.querySelectorAll(".reforma-cor-wrapper").forEach((wrapper) => {
            const idx = Number(wrapper.dataset.corIndex);
            const item = services[idx];
            if (isReforma(item?.nome) && !(item.cor && item.cor.trim())) {
              wrapper.classList.add("erro");
            }
          });
          // Scroll até o primeiro erro e foca
          const primeiroErro = list.querySelector(".reforma-cor-wrapper.erro");
          if (primeiroErro) {
            primeiroErro.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            const inputErro = primeiroErro.querySelector("input");
            if (inputErro) setTimeout(() => inputErro.focus(), 300);
          }
          // Aviso
          if (window.CustomAlert) {
            window.CustomAlert.show(
              `Informe a cor da roda em ${reformasSemCor.length === 1 ? "1 serviço REFORMA" : reformasSemCor.length + " serviços REFORMA"}.`,
              "erro",
              "Cor obrigatória",
            );
          }
          return;
        }

        overlay.classList.remove("open");
        document.body.style.overflow = "";
        const totalItens = services.reduce((acc, s) => acc + s.qtd, 0);
        if (totalItens > 0) {
          mainLabel.textContent = `${totalItens} Serviços`;
          mainBtn.classList.add("filled");
        } else {
          mainLabel.textContent = "Serviços";
          mainBtn.classList.remove("filled");
        }
        document.dispatchEvent(
          new CustomEvent("services-change", { detail: services }),
        );
      };

      mainBtn.addEventListener("click", open);
      document.getElementById("closeSheetBtn").addEventListener("click", close);
      document
        .getElementById("finishSheetBtn")
        .addEventListener("click", close);
      btnAdd.addEventListener("click", add);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          add();
        }
      });
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });

      const atualizarPorRede = async () => {
        if (services.length === 0) return;
        await atualizarNumerosSelecionados();
        render();
      };
      window.addEventListener("online", atualizarPorRede);
      window.addEventListener("offline", atualizarPorRede);
    },

    limpar: function () {
      services = [];
      if (renderFn) renderFn();
      if (mainLabelRef) mainLabelRef.textContent = "Serviços";
      if (mainBtnRef) mainBtnRef.classList.remove("filled");
      document.dispatchEvent(
        new CustomEvent("services-change", { detail: services }),
      );
    },
  };
})();
