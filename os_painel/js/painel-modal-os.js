import { calcularTotaisOS, montarPatchOS } from "./painel-os-editor.js";
import {
  carregarCatalogoServicos,
  criarControladorPlaca,
  maskCPF,
  normalizarNomeServico,
  isReforma,
  isConsertoOuSolda,
  buscarMenorNumeroLivreReforma,
  buscarMenorNumeroLivreConsertoSolda,
} from "./painel-catalogo-regras.js";
import {
  renderBotaoCopiar,
  renderBotoesTelefoneExtras,
  normalizarTelefoneSomenteDigitos,
  sincronizarServicosNaObservacao,
  bindCamposExtrasModal,
} from "./painel-modal-campos-extras.js";
import { comprimirImagemWeb } from "../../components/camera.js";
import { compartilharTexto } from "./compartilhamento.js";
import { supabaseClient } from "../../js/supabase.js";
import { uiAlerta, uiConfirmar } from "./ui-alerta.js";

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

function formatarDataRelatorio(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function numeroExibicaoRelatorio(os, atualDraft) {
  const servicosTexto = [
    ...(atualDraft?.itens_servicos || []).map((i) => i.servico || i.nome || ""),
    atualDraft?.servico || "",
    os?.servico || "",
  ]
    .join(" ")
    .toUpperCase();

  if (servicosTexto.includes("CONSERTO") || servicosTexto.includes("SOLDA")) {
    return (
      atualDraft?.numero_os_conserto ||
      os?.numero_os_conserto ||
      atualDraft?.numero_os ||
      os?.numero_os ||
      `#${os?.id ?? os?.uuid_local ?? "—"}`
    );
  }
  return (
    atualDraft?.numero_os ||
    os?.numero_os ||
    `#${os?.id ?? os?.uuid_local ?? "—"}`
  );
}

async function converterImagemParaBase64(url) {
  try {
    const resposta = await fetch(url);
    const blob = await resposta.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function baixarBlob(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function calcularStatusPorDocumentos(draft) {
  if (draft?.status === "Cancelado") {
    return "Cancelado";
  }
  if (String(draft?.numero_venda || "").trim()) return "Concluído";
  if (String(draft?.registro_os || "").trim()) return "Em andamento";
  return "Pendente";
}

function montarTextoCompartilhamento(os, atualDraft) {
  const linhas = [];

  const cliente = String(atualDraft?.nome || os?.nome || "CONSUMIDOR").trim();
  if (cliente) linhas.push(`Cliente: ${cliente}`);

  const placa = String(atualDraft?.placa || os?.placa || "").trim();
  if (placa) linhas.push(`Placa: ${placa}`);

  const cor = String(atualDraft?.cor || os?.cor || "").trim();
  if (cor) linhas.push(`Cor: ${cor}`);

  const numeros = [];
  const numReforma = String(
    atualDraft?.numero_os ?? os?.numero_os ?? "",
  ).trim();
  const numConserto = String(
    atualDraft?.numero_os_conserto ?? os?.numero_os_conserto ?? "",
  ).trim();
  const regOs = String(atualDraft?.registro_os ?? os?.registro_os ?? "").trim();
  const numVenda = String(
    atualDraft?.numero_venda ?? os?.numero_venda ?? "",
  ).trim();

  if (numReforma) numeros.push(`Reforma: ${numReforma}`);
  if (numConserto) numeros.push(`Conserto: ${numConserto}`);
  if (regOs) numeros.push(`Registro: ${regOs}`);
  if (numVenda) numeros.push(`Venda: ${numVenda}`);

  if (numeros.length > 0) {
    linhas.push(`Números: ${numeros.join(" | ")}`);
  }

  const obs = String(atualDraft?.observacao ?? os?.observacao ?? "").trim();
  if (obs) linhas.push(`Observações: ${obs}`);

  return linhas.join("\n");
}

function montarFotosExistentesIniciais(os) {
  const locais = Array.isArray(os?.fotos_locais)
    ? os.fotos_locais.filter((f) => f && f.src)
    : [];
  if (locais.length > 0) {
    return locais.map((f, idx) => ({
      tipo: "existente",
      src: f.urlOriginal || f.url || f.src,
      urlOriginal: f.urlOriginal || f.url || os?.fotos_urls?.[idx] || "",
      disponivelOffline: Boolean(f.disponivelOffline),
    }));
  }

  const urls = Array.isArray(os?.fotos_urls)
    ? os.fotos_urls.filter(Boolean)
    : [];
  return urls.map((url) => ({
    tipo: "existente",
    src: url,
    urlOriginal: url,
    disponivelOffline: false,
  }));
}

function limparPreviewsNovasFotos(atualDraft) {
  if (!atualDraft || !Array.isArray(atualDraft.novasFotos)) return;
  atualDraft.novasFotos.forEach((nf) => {
    if (nf?.previewUrl) {
      try {
        URL.revokeObjectURL(nf.previewUrl);
      } catch {
        // ignora erro de revogação
      }
    }
  });
}

async function enviarNovasFotosStorage(novasFotos = []) {
  const urlsEnviadas = [];

  for (const nf of novasFotos) {
    if (nf?.urlEnviada) {
      urlsEnviadas.push(nf.urlEnviada);
      continue;
    }

    const blobParaEnviar = nf?.fileOriginal || nf?.blobMini;
    if (!blobParaEnviar) continue;

    const nomeArquivo = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpeg`;
    const { error: errUp } = await supabaseClient.storage
      .from("fotos-ordens")
      .upload(nomeArquivo, blobParaEnviar);

    if (errUp) {
      throw new Error("Erro upload original: " + errUp.message);
    }

    const { data: urlData } = supabaseClient.storage
      .from("fotos-ordens")
      .getPublicUrl(nomeArquivo);

    const urlPublica = urlData?.publicUrl || "";
    if (!urlPublica) {
      throw new Error("Não foi possível obter a URL pública da foto enviada.");
    }

    nf.urlEnviada = urlPublica;
    urlsEnviadas.push(urlPublica);
  }

  return urlsEnviadas;
}

async function abrirModalRelatorioEstiloCorporativo(os, atualDraft, totais) {
  if (document.getElementById("modalRelatorioOS")) return;

  const logoBase64 = await converterImagemParaBase64("./assets/logo.png");
  const numExibicao = numeroExibicaoRelatorio(os, atualDraft);
  const dataRef = os?.created_at || os?.criado_em;

  let obsLimpa = String(atualDraft?.observacao || os?.observacao || "");
  obsLimpa = obsLimpa.replace(/\s*\|\s*PLACA:[^|]*/g, "");
  obsLimpa = obsLimpa.replace(/\s*\|\s*COR:[^|]*/g, "");
  const obsManual = String(atualDraft?.observacao_manual || "").trim();
  const obsFinal = [obsLimpa.trim(), obsManual].filter(Boolean).join(" | ");

  const itensLista = Array.isArray(totais?.itens) ? totais.itens : [];
  const somaItens = itensLista.reduce(
    (soma, item) => soma + (Number(item.valor) || 0),
    0,
  );
  const valorExibicaoTotal =
    Number(totais?.valorFinal ?? somaItens) > 0
      ? Number(totais?.valorFinal ?? somaItens)
      : somaItens;

  const div = document.createElement("div");
  div.id = "modalRelatorioOS";
  div.style.cssText =
    "position:fixed;inset:0;z-index:90;background:rgba(15,23,42,0.65);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:12px;overflow-y:auto";

  const linhasItensHtml = itensLista
    .map((item, index) => {
      const qtd = Number(item.quantidade) || 1;
      const valorTotalItem = Number(item.valor) || 0;
      const valorUnit =
        Number(item.valor_unitario) > 0
          ? Number(item.valor_unitario)
          : valorTotalItem / qtd;

      return `
        <tr style="background:${index % 2 === 0 ? "#ffffff" : "rgba(248,250,252,0.7)"};border-top:1px solid #e2e8f0;page-break-inside:avoid">
          <td style="padding:10px 12px;font-weight:700;color:#1e293b;word-break:break-word">${esc(item.servico || item.nome || "SERVIÇO")}</td>
          <td style="padding:10px 8px;text-align:center;font-weight:700;color:#1e293b">${esc(qtd)}</td>
          <td style="padding:10px 12px;text-align:right;font-weight:600;color:#334155;white-space:nowrap">${brl(valorUnit)}</td>
          <td style="padding:10px 12px;text-align:right;font-weight:800;color:#0f172a;white-space:nowrap">${brl(valorTotalItem)}</td>
        </tr>
      `;
    })
    .join("");

  div.innerHTML = `
    <div style="background:#f1f5f9;border-radius:12px;width:100%;max-width:768px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);overflow:hidden;display:flex;flex-direction:column;max-height:92vh">
      <div style="flex:1;overflow-y:auto;background:#ffffff">
        <div id="relatorioOSCaptura" style="background:#ffffff;margin:0 auto;width:100%;max-width:210mm;padding:28px 32px;font-family:'Inter',system-ui,-apple-system,sans-serif;color:#0f172a;box-sizing:border-box">
          <div style="border-bottom:2px solid #0f172a;padding-bottom:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;gap:12px">
            <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:0">
              <img src="${esc(logoBase64 || "./assets/logo.png")}" alt="Logo" crossorigin="anonymous" style="height:56px;width:auto;object-fit:contain;border-radius:8px;flex-shrink:0" onerror="this.style.display='none'" />
              <div style="border-left:1px solid #cbd5e1;padding-left:14px">
                <h1 style="margin:0;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;color:#0f172a">Clínica da Roda</h1>
                <p style="margin:2px 0 0;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;color:#475569">Tratamento perfeito para rodas</p>
                <p style="margin:4px 0 0;font-size:10px;font-weight:600;color:#475569">CNPJ: 08.297.622.0001/35</p>
              </div>
            </div>

            <div style="text-align:right;background:#f8fafc;border:1px solid #cbd5e1;padding:10px 14px;border-radius:8px;flex-shrink:0">
              <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b">Ordem de Serviço</p>
              <p style="margin:2px 0 0;font-size:16px;font-weight:800;color:#0f172a">Nº ${esc(numExibicao)}</p>
              <p style="margin:2px 0 0;font-size:11px;font-weight:700;color:#475569">${esc(formatarDataRelatorio(dataRef))}</p>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:20px">
            <div style="background:#f8fafc;padding:12px 14px;border-radius:8px;border:1px solid #cbd5e1">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b">Dados do Cliente</p>
              <p style="margin:0;font-size:13.5px;font-weight:800;color:#0f172a;word-break:break-word">${esc(atualDraft?.nome || "Não informado")}</p>
              <p style="margin:6px 0 0;font-size:12px;font-weight:600;color:#334155;word-break:break-all">${esc(atualDraft?.telefone || "Sem contato")}</p>
            </div>

            <div style="background:#f8fafc;padding:12px 14px;border-radius:8px;border:1px solid #cbd5e1;display:flex;flex-direction:column;justify-content:space-between">
              <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b">Identificação do Veículo</p>
              <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
                ${
                  atualDraft?.placa
                    ? `<div>
                        <p style="margin:0 0 3px;font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b">Placa</p>
                        <span style="display:inline-block;background:#0f172a;color:#ffffff;font-size:12px;font-weight:800;padding:2px 7px;border-radius:4px;letter-spacing:0.08em">${esc(atualDraft.placa)}</span>
                      </div>`
                    : ""
                }
                ${
                  atualDraft?.cor
                    ? `<div>
                        <p style="margin:0 0 3px;font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b">Cor</p>
                        <p style="margin:0;font-size:12px;font-weight:800;color:#0f172a">${esc(atualDraft.cor)}</p>
                      </div>`
                    : ""
                }
                ${
                  !atualDraft?.placa && !atualDraft?.cor
                    ? `<span style="font-size:12px;color:#64748b">Não informada</span>`
                    : ""
                }
              </div>
            </div>
          </div>

          <table style="width:100%;text-align:left;font-size:12.5px;margin-bottom:20px;border-collapse:collapse;table-layout:fixed">
            <thead>
              <tr style="background:#0f172a;color:#ffffff">
                <th style="padding:10px 12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;width:45%;border-top-left-radius:6px">Serviços</th>
                <th style="padding:10px 8px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;text-align:center;width:15%">Qtd</th>
                <th style="padding:10px 12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;text-align:right;width:20%">Unitário</th>
                <th style="padding:10px 12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;text-align:right;width:20%;border-top-right-radius:6px">Total</th>
              </tr>
            </thead>
            <tbody style="border-bottom:1px solid #cbd5e1">
              ${linhasItensHtml || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#64748b">Nenhum serviço informado</td></tr>'}
            </tbody>
          </table>

          <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
            <div style="background:#0f172a;color:#ffffff;border-radius:8px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;width:100%;max-width:280px;box-shadow:0 4px 10px rgba(15,23,42,0.12)">
              <span style="font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#cbd5e1">Valor Total</span>
              <span style="font-weight:800;font-size:20px;color:#ffffff">${esc(brl(valorExibicaoTotal))}</span>
            </div>
          </div>

          ${
            obsFinal
              ? `<div style="margin-bottom:22px;page-break-inside:avoid">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b">Observações Técnicas</p>
                  <div style="font-size:12.5px;color:#1e293b;font-weight:500;background:#f8fafc;padding:10px 12px;border-radius:8px;border:1px solid #cbd5e1;line-height:1.5;word-break:break-word">${esc(obsFinal)}</div>
                </div>`
              : ""
          }

          <div style="margin-top:24px;text-align:center;padding-bottom:8px">
            <p style="margin:0;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Clínica da Roda &bull; Cuidando do que te move</p>
          </div>
        </div>
      </div>

      <div style="padding:12px 16px;background:#f1f5f9;border-top:1px solid #cbd5e1;display:flex;gap:10px;justify-content:flex-end;flex-shrink:0">
        <button type="button" id="btnFecharRelatorioOS" style="padding:9px 18px;background:#e2e8f0;color:#1e293b;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">Fechar</button>
        <button type="button" id="btnGerarPdfRelatorioOS" style="padding:9px 18px;background:#0f172a;color:#ffffff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px">
          <span id="txtBtnPdfRelatorio">Gerar PDF</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(div);

  const fecharRel = () => div.remove();
  div.addEventListener("click", (e) => {
    if (e.target === div) fecharRel();
  });
  div
    .querySelector("#btnFecharRelatorioOS")
    ?.addEventListener("click", fecharRel);

  div
    .querySelector("#btnGerarPdfRelatorioOS")
    ?.addEventListener("click", async (e) => {
      const botao = e.currentTarget;
      const textoOriginal = botao.innerHTML;
      botao.innerHTML = "Gerando PDF...";
      botao.disabled = true;

      try {
        const elemento = document.getElementById("relatorioOSCaptura");
        const nomeArquivo = `OS-${String(numExibicao).replace(/[^\w-]/g, "_")}.pdf`;

        if (typeof window.html2pdf === "function") {
          const estiloOriginal = elemento.getAttribute("style");
          elemento.style.width = "210mm";
          elemento.style.padding = "10mm 15mm";

          const opt = {
            margin: 0,
            filename: nomeArquivo,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["css", "legacy"] },
          };

          const pdfBlob = await window
            .html2pdf()
            .set(opt)
            .from(elemento)
            .outputPdf("blob");

          if (estiloOriginal) {
            elemento.setAttribute("style", estiloOriginal);
          }

          const ehCapacitor = window.Capacitor?.isNativePlatform?.() || false;
          if (ehCapacitor) {
            const arquivo = new File([pdfBlob], nomeArquivo, {
              type: "application/pdf",
            });
            const objectUrl = URL.createObjectURL(arquivo);
            await compartilharTexto({
              titulo: `Relatório OS ${numExibicao}`,
              texto: `Segue o relatório em PDF da sua OS: ${numExibicao}`,
              fotoUrl: objectUrl,
              isPdf: true,
            });
            URL.revokeObjectURL(objectUrl);
          } else {
            baixarBlob(pdfBlob, nomeArquivo);
          }
        } else {
          const janela = window.open("", "_blank", "width=820,height=700");
          if (janela) {
            janela.document.write(
              `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Relatório OS ${esc(numExibicao)}</title></head><body>${elemento.outerHTML}<script>window.print();</script></body></html>`,
            );
            janela.document.close();
          }
        }
        fecharRel();
      } catch (err) {
        console.error("Erro ao gerar PDF do relatório:", err);
      } finally {
        botao.innerHTML = textoOriginal;
        botao.disabled = false;
      }
    });
}

const inputSoftStyle =
  "width:100%;box-sizing:border-box;background:#fff;color:#1a1f26;border:1px solid #d0d5db;border-radius:6px;padding:7px 10px;font-size:13px;outline:none";

const btnAcaoRodapeStyle =
  "display:inline-flex;align-items:center;justify-content:center;gap:6px;height:38px;padding:0 14px;border-radius:8px;font-size:13px;font-weight:600;line-height:1;white-space:nowrap;cursor:pointer;box-sizing:border-box";

const btnCompartilharColoridoStyle = `${btnAcaoRodapeStyle};background:#2563eb;color:#ffffff;border:1px solid #2563eb`;

const btnRelatorioColoridoStyle = `${btnAcaoRodapeStyle};background:#4f46e5;color:#ffffff;border:1px solid #4f46e5`;

const btnExcluirColoridoStyle = `${btnAcaoRodapeStyle};background:#dc2626;color:#ffffff;border:1px solid #dc2626`;

const btnSalvarColoridoStyle = `${btnAcaoRodapeStyle};background:#059669;color:#ffffff;border:1px solid #059669`;

export function criarModalDetalhesOS({
  overlayId = "modalOverlay",
  conteudoId = "modalConteudo",
  maxFotos = 6,
  onAbrirFoto,
  onAtualizarOS,
  onExcluirOS,
  onFechar,
} = {}) {
  const maxFotosOS = Number(maxFotos) > 0 ? Number(maxFotos) : 6;
  const getOverlay = () => document.getElementById(overlayId);
  const getConteudo = () => document.getElementById(conteudoId);

  let osAtual = null;
  let draft = null;
  let catalogoServicos = [];
  let ctrlPlaca = null;

  function estaAberto() {
    return Boolean(getOverlay()?.classList.contains("aberto"));
  }

  function fechar() {
    if (ctrlPlaca) {
      ctrlPlaca.destruir();
      ctrlPlaca = null;
    }
    limparPreviewsNovasFotos(draft);
    const overlay = getOverlay();
    const conteudo = getConteudo();
    if (overlay) overlay.classList.remove("aberto");
    if (conteudo) conteudo.innerHTML = "";
    osAtual = null;
    draft = null;
    if (typeof onFechar === "function") onFechar();
  }

  function definirBotoesDesabilitados(desabilitar) {
    const conteudo = getConteudo();
    if (!conteudo) return;
    conteudo.querySelectorAll("button, input, select").forEach((el) => {
      if (
        el.classList.contains("btn-copiar-campo") ||
        el.id === "btnWhatsAppTelefone"
      ) {
        return;
      }
      el.disabled = Boolean(desabilitar);
    });
  }

  function obterListaFotosCombinadas() {
    if (!draft) return [];
    const existentes = (draft.fotosExistentes || []).map((item, idx) => ({
      ...item,
      origem: "existente",
      indiceOrigem: idx,
    }));
    const novas = (draft.novasFotos || []).map((item, idx) => ({
      ...item,
      src: item.previewUrl,
      origem: "nova",
      indiceOrigem: idx,
    }));
    return [...existentes, ...novas];
  }

  function sincronizarCamposDoDom(conteudo) {
    if (!draft || !conteudo) return;

    const getVal = (id) => conteudo.querySelector(`#${id}`)?.value ?? "";
    const paisTel =
      conteudo.querySelector("#btnPaisTelefone")?.dataset.pais || "BR";

    draft.nome = getVal("editNome").toUpperCase();
    draft.telefone = normalizarTelefoneSomenteDigitos(
      getVal("editTelefone"),
      paisTel,
    );
    draft.documento = getVal("editDocumento");
    draft.placa = getVal("editPlaca").toUpperCase();
    draft.aparelho = getVal("editAparelho");
    draft.cor = getVal("editCor").toUpperCase();
    draft.numero_os = getVal("editNumeroOs").trim();
    draft.numero_os_conserto = getVal("editNumeroOsConserto").trim();
    draft.registro_os = getVal("editRegistroOs").trim().toUpperCase();
    draft.numero_venda = getVal("editNumeroVenda").trim().toUpperCase();
    draft.status = calcularStatusPorDocumentos(draft);
    const textoCompleto = getVal("editObservacao").toUpperCase();

    // O sistema usa " | " para separar. Se tiver "SERVIÇOS:", sabemos que é a parte automática.
    let textoManual = textoCompleto;
    if (textoCompleto.includes("SERVIÇOS:")) {
      const partes = textoCompleto.split(" | ");
      // Pega tudo o que vem depois de "SERVIÇOS: ..." e ignora as partes de PLACA e COR
      textoManual = partes
        .filter(
          (p) =>
            !p.includes("SERVIÇOS:") &&
            !p.includes("PLACA:") &&
            !p.includes("COR:"),
        )
        .join(" | ")
        .trim();
    }

    draft.observacao = textoCompleto;
    draft.observacao_manual = textoManual;
    draft.desconto = Number(getVal("editDesconto") || 0);
    draft.novas_fotos_arquivos = (draft.novasFotos || []).map(
      (nf) => nf.fileOriginal,
    );
    draft.novas_fotos_miniaturas = (draft.novasFotos || []).map(
      (nf) => nf.blobMini,
    );
    draft.fotos_removidas = [...(draft.fotosRemovidas || [])];
    draft.fotos_existentes_mantidas = (draft.fotosExistentes || [])
      .map((fe) => fe.urlOriginal || fe.src)
      .filter(Boolean);

    const linhas = conteudo.querySelectorAll("tr[data-item-idx]");
    const novosItens = [];
    linhas.forEach((tr) => {
      const idx = Number(tr.dataset.itemIdx);
      const base = draft.itens_servicos[idx] || {};
      const servico = normalizarNomeServico(
        tr.querySelector(".item-servico")?.value ?? "",
      );
      const quantidade = Number(tr.querySelector(".item-qtd")?.value ?? 1);
      const valorUnit = Number(tr.querySelector(".item-unit")?.value ?? 0);

      novosItens.push({
        ...base,
        servico,
        quantidade: quantidade > 0 ? quantidade : 1,
        valor_unitario: valorUnit >= 0 ? valorUnit : 0,
        valor:
          (quantidade > 0 ? quantidade : 1) * (valorUnit >= 0 ? valorUnit : 0),
      });
    });

    draft.itens_servicos = novosItens;
  }

  function atualizarResumoNaTela(conteudo) {
    if (!draft || !conteudo) return;
    const totais = calcularTotaisOS(draft.itens_servicos, draft.desconto);

    const rows = conteudo.querySelectorAll("tr[data-item-idx]");
    rows.forEach((tr, i) => {
      const calc = totais.itens[i];
      const cellTotal = tr.querySelector(".item-total-cell");
      if (cellTotal && calc) {
        cellTotal.textContent = brl(calc.valor);
      }
    });

    const elSubtotal = conteudo.querySelector("#resumoSubtotal");
    const elTotal = conteudo.querySelector("#resumoTotal");
    if (elSubtotal) elSubtotal.textContent = brl(totais.subtotal);
    if (elTotal) elTotal.textContent = brl(totais.valorFinal);
  }

  function render() {
    const overlay = getOverlay();
    const conteudo = getConteudo();
    if (!overlay || !conteudo || !osAtual || !draft) return;

    if (ctrlPlaca) {
      ctrlPlaca.destruir();
      ctrlPlaca = null;
    }

    const podeEditar = navigator.onLine && osAtual.id != null;
    const d = osAtual.created_at || osAtual.criado_em;
    const totais = calcularTotaisOS(draft.itens_servicos, draft.desconto);

    const optionsCatalogo = catalogoServicos
      .map((s) => `<option value="${esc(s.nome)}"></option>`)
      .join("");

    const estaCancelada = draft.status === "Cancelado";
    const corStatus = estaCancelada ? "#b91c1c" : "#1f5fbf";

    const linhasItens = draft.itens_servicos
      .map((item, idx) => {
        const calc = totais.itens[idx] || {
          quantidade: item.quantidade || 1,
          valor_unitario: item.valor_unitario || 0,
          valor: item.valor || 0,
        };

        return `
          <tr data-item-idx="${idx}" class="item-os-row">
            <td class="col-servico" data-label="Serviço / Produto">
              <input type="text" list="datalistCatalogoServicos" class="item-servico" style="${inputSoftStyle};text-transform:uppercase" value="${esc(item.servico ?? item.nome ?? "")}" placeholder="Serviço / produto" ${podeEditar ? "" : "disabled"} />
            </td>
            <td class="col-qtd" data-label="Qtd">
              <input type="number" min="1" step="1" class="mono item-qtd" style="${inputSoftStyle};padding:7px 6px;text-align:center" value="${esc(calc.quantidade)}" ${podeEditar ? "" : "disabled"} />
            </td>
            <td class="col-unit" data-label="Unit.">
              <input type="number" min="0" step="0.01" class="mono item-unit" style="${inputSoftStyle};padding:7px 8px;text-align:right" value="${esc(calc.valor_unitario)}" ${podeEditar ? "" : "disabled"} />
            </td>
            <td class="col-valor mono item-total-cell" data-label="Valor" style="white-space:nowrap">${brl(calc.valor)}</td>
            <td class="col-acao" style="text-align:center">
              <button type="button" class="btn btn-remover-item" data-del-idx="${idx}" title="Excluir item" style="padding:4px 8px;min-width:0" ${podeEditar ? "" : "disabled"}>×</button>
            </td>
          </tr>
        `;
      })
      .join("");

    const fotosCombinadas = obterListaFotosCombinadas();
    const totalFotosAtual = fotosCombinadas.length;
    const podeAdicionarMaisFotos = podeEditar && totalFotosAtual < maxFotosOS;

    const fotos = fotosCombinadas
      .map(
        (f, i) => `
          <div style="position:relative;display:inline-flex;border-radius:11px">
            <button type="button" class="foto-thumb-btn" data-foto-idx="${i}" title="${
              f.origem === "nova"
                ? "Nova foto (será enviada ao salvar)"
                : f.disponivelOffline
                  ? "Ampliar foto local"
                  : "Ampliar foto"
            }">
              <img src="${esc(f.src)}" alt="Foto OS ${i + 1}" />
            </button>
            ${
              podeEditar
                ? `<button type="button" class="btn-excluir-foto" data-foto-origem="${f.origem}" data-foto-idx-origem="${f.indiceOrigem}" title="Excluir foto" aria-label="Excluir foto ${i + 1}" style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:999px;border:1px solid #ffffff;background:#dc2626;color:#ffffff;font-size:13px;font-weight:700;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 6px rgba(15,23,42,0.28)">×</button>`
                : ""
            }
          </div>`,
      )
      .join("");

    conteudo.innerHTML = `
      <datalist id="datalistCatalogoServicos">${optionsCatalogo}</datalist>

      <div class="modal-top">
        <div>
          <h2 id="tituloModalCliente">${esc(draft.nome || "CONSUMIDOR")}</h2>
          <small class="mono">OS #${esc(osAtual.id ?? osAtual.uuid_local ?? "—")} · ${d ? new Date(d).toLocaleString("pt-BR") : "—"}</small>
        </div>
        <button class="btn-close" id="btnFechar" type="button" aria-label="Fechar">×</button>
      </div>

      <div class="section-heading" style="margin-top:16px">Dados do Cliente e Veículo</div>
      <div class="props-grid" style="padding:14px;margin-top:8px">
        <div class="prop-item">
          <label for="editNome" style="display:flex;justify-content:space-between;align-items:center">
            <span>Cliente</span>
            ${renderBotaoCopiar("editNome")}
          </label>
          <input id="editNome" type="text" style="${inputSoftStyle};text-transform:uppercase" value="${esc(draft.nome)}" ${podeEditar ? "" : "disabled"} />
        </div>
        <div class="prop-item">
          <label for="editTelefone" style="display:flex;justify-content:space-between;align-items:center;gap:6px">
            <span>Telefone</span>
            ${renderBotoesTelefoneExtras("editTelefone")}
          </label>
          <div style="display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #d0d5db;border-radius:6px;padding:3px 8px">
            <button type="button" id="btnPaisTelefone" data-pais="BR" title="Trocar País (BR / PY)" style="flex-shrink:0;white-space:nowrap;background:rgba(255,196,0,0.14);border:1px solid rgba(202,138,4,0.38);border-radius:6px;padding:2px 6px;font-size:12px;font-weight:700;color:#92400e;cursor:pointer;line-height:1.2;display:inline-flex;align-items:center;justify-content:center;transition:all .15s ease" ${podeEditar ? "" : "disabled"}>BR</button>
            <span id="editTelefoneDdi" class="mono" style="flex-shrink:0;white-space:nowrap;font-size:12px;font-weight:700;color:#92400e;line-height:1;user-select:none">+55</span>
            <input id="editTelefone" type="tel" inputmode="numeric" class="mono" style="flex:1 1 auto;min-width:0;width:100%;box-sizing:border-box;background:transparent;color:#1a1f26;border:0;padding:4px 2px;font-size:13px;outline:none" value="${esc(draft.telefone)}" placeholder="(00) 00000-0000" ${podeEditar ? "" : "disabled"} />
          </div>
        </div>
        <div class="prop-item">
          <label for="editDocumento" style="display:flex;justify-content:space-between;align-items:center">
            <span>Documento</span>
            ${renderBotaoCopiar("editDocumento")}
          </label>
          <input id="editDocumento" type="text" class="mono" maxlength="14" style="${inputSoftStyle}" value="${esc(draft.documento)}" placeholder="000.000.000-00" ${podeEditar ? "" : "disabled"} />
        </div>
        <div class="prop-item">
          <label for="editPlaca" style="display:flex;justify-content:space-between;align-items:center;gap:6px">
            <span>Placa</span>
            <span style="display:inline-flex;gap:4px">
              ${renderBotaoCopiar("editPlaca")}
              <button type="button" id="btnModoPlaca" class="mono" style="font-size:10px;padding:1px 6px;border-radius:4px;border:1px solid #d0d5db;background:#fff;color:#1f5fbf;cursor:pointer" ${podeEditar ? "" : "disabled"}>MERCOSUL</button>
            </span>
          </label>
          <input id="editPlaca" type="text" class="mono" maxlength="7" style="${inputSoftStyle};text-transform:uppercase" value="${esc(draft.placa)}" placeholder="ABC1D23" ${podeEditar ? "" : "disabled"} />
        </div>
        <div class="prop-item">
          <label for="editAparelho">Veículo / Aparelho</label>
          <input id="editAparelho" type="text" style="${inputSoftStyle}" value="${esc(draft.aparelho)}" ${podeEditar ? "" : "disabled"} />
        </div>
        <div class="prop-item">
          <label for="editCor">Cor</label>
          <input id="editCor" type="text" style="${inputSoftStyle};text-transform:uppercase" value="${esc(draft.cor)}" placeholder="PRATA, PRETO..." ${podeEditar ? "" : "disabled"} />
        </div>
        <div class="prop-item full">
          <label for="editObservacao" style="display:flex;justify-content:space-between;align-items:center">
            <span>Observação</span>
            ${renderBotaoCopiar("editObservacao")}
          </label>
         <textarea id="editObservacao" rows="3" style="${inputSoftStyle};text-transform:uppercase;resize:vertical;font-family:inherit;line-height:1.4" ${podeEditar ? "" : "disabled"}>${esc(draft.observacao)}</textarea>
        </div>
      </div>

      <div class="section-heading">Controle da OS e Status</div>
      <div style="display:flex;flex-direction:column;gap:12px;padding:14px;margin-top:8px;border:1px solid #e3e6ea;border-radius:10px;background:#fafbfc">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px">
          <div class="prop-item">
            <label for="editNumeroOs">Nº OS Reforma</label>
            <input id="editNumeroOs" type="text" class="mono" style="${inputSoftStyle}" value="${esc(draft.numero_os)}" placeholder="Ex: 5907" ${podeEditar ? "" : "disabled"} />
          </div>
          <div class="prop-item">
            <label for="editNumeroOsConserto">Nº OS Conserto</label>
            <input id="editNumeroOsConserto" type="text" class="mono" style="${inputSoftStyle}" value="${esc(draft.numero_os_conserto)}" placeholder="Ex: 6201" ${podeEditar ? "" : "disabled"} />
          </div>
        </div>

        <div style="border-top:1px dashed #d8dee6;padding-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px">
          <div class="prop-item">
            <label for="editRegistroOs">Registro OS <span style="font-weight:400;color:#7a8494">(Em andamento)</span></label>
            <input id="editRegistroOs" type="text" class="mono" style="${inputSoftStyle}" value="${esc(draft.registro_os)}" placeholder="Ex: 0000" ${podeEditar ? "" : "disabled"} />
          </div>
          <div class="prop-item">
            <label for="editNumeroVenda">Nº Venda <span style="font-weight:400;color:#7a8494">(Concluído)</span></label>
            <input id="editNumeroVenda" type="text" class="mono" style="${inputSoftStyle}" value="${esc(draft.numero_venda)}" placeholder="Ex: 000000" ${podeEditar ? "" : "disabled"} />
          </div>
          <div class="prop-item">
            <label for="editStatus">Status</label>
            <div style="display:flex;gap:6px;align-items:center">
              <input id="editStatus" type="text" readonly style="${inputSoftStyle};height:36px;padding:0 10px;background:#f3f4f6;color:${corStatus};font-weight:600;cursor:default;flex:1;min-width:0" value="${esc(draft.status)}" />
              <button type="button" id="btnToggleCancelar" style="height:36px;padding:0 12px;border-radius:8px;border:1px solid #d0d5db;background:#ffffff;color:#1a1f26;font-size:12px;font-weight:600;line-height:1;white-space:nowrap;cursor:pointer;box-sizing:border-box;flex-shrink:0" ${podeEditar ? "" : "disabled"}>${estaCancelada ? "Reativar" : "Cancelar"}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="section-heading" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <span>Itens de Serviço e Produtos</span>
        <button id="btnAdicionarItem" class="btn" type="button" ${podeEditar ? "" : "disabled"}>+ Adicionar item</button>
      </div>

      <div class="items-table-wrap">
        <table class="items-table itens-os-tabela">
          <thead>
            <tr>
              <th>Serviço / Produto</th>
              <th style="width:66px">Qtd</th>
              <th style="width:102px">Unit.</th>
              <th style="width:106px">Valor</th>
              <th style="width:38px"></th>
            </tr>
          </thead>
          <tbody>
            ${linhasItens || '<tr><td colspan="5" style="text-align:center;color:#7a8494">Nenhum item adicionado</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="items-resumo" style="display:flex;justify-content:flex-end;align-items:center;gap:18px;flex-wrap:wrap;margin-top:10px;padding:10px 14px;border-radius:8px;background:#fafbfc;border:1px solid #e3e6ea">
        <div><span style="color:#7a8494;font-size:12px">Subtotal:</span> <strong id="resumoSubtotal" class="mono">${brl(totais.subtotal)}</strong></div>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#7a8494">
          <span>Desconto:</span>
          <input id="editDesconto" type="number" min="0" step="0.01" class="mono" style="${inputSoftStyle};width:96px;padding:5px 8px;text-align:right" value="${esc(totais.desconto)}" ${podeEditar ? "" : "disabled"} />
        </label>
        <div><span style="color:#7a8494;font-size:12px">Total:</span> <strong id="resumoTotal" class="mono">${brl(totais.valorFinal)}</strong></div>
      </div>

      <div class="section-heading" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <span>Galeria de Fotos (${totalFotosAtual}/${maxFotosOS})</span>
        <div style="display:inline-flex;align-items:center;gap:8px">
          <input id="editFotosInput" type="file" accept="image/*" capture="environment" multiple style="display:none" />
          <button id="btnAdicionarFotoOS" class="btn btn-sm" type="button" ${podeAdicionarMaisFotos ? "" : "disabled"}>+ Adicionar foto</button>
        </div>
      </div>
      <div id="statusCompressaoFotosOS" style="display:none;font-size:12px;font-weight:600;color:#1f5fbf;margin-bottom:8px"></div>
      <div class="modal-gallery">${fotos || '<span style="color:#7a8494;font-size:13px">Nenhuma foto nesta OS.</span>'}</div>

      <div class="modal-actions" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <button id="btnCompartilharOS" class="btn" type="button" style="${btnCompartilharColoridoStyle}">Compartilhar</button>
          <button id="btnRelatorioOS" class="btn" type="button" style="${btnRelatorioColoridoStyle}">Relatório</button>
          <button id="btnExcluirOS" class="btn" type="button" style="${btnExcluirColoridoStyle}" ${podeEditar ? "" : "disabled"}>Excluir OS</button>
        </div>
        ${
          podeEditar
            ? `<button id="btnSalvarAlteracoes" class="btn btn-primary" type="button" style="${btnSalvarColoridoStyle}">Salvar alterações</button>`
            : `<button class="btn" type="button" style="${btnSalvarColoridoStyle};opacity:0.5;cursor:not-allowed" disabled>Salvar alterações</button>
               <div class="offline-banner">Modo offline: consulta e fotos locais ativas; alterações bloqueadas sem internet.</div>`
        }
      </div>
    `;

    overlay.classList.add("aberto");

    conteudo.querySelector("#btnFechar")?.addEventListener("click", fechar);

    conteudo.querySelector("#editNome")?.addEventListener("input", (e) => {
      const titulo = conteudo.querySelector("#tituloModalCliente");
      if (titulo) {
        titulo.textContent = e.target.value.trim() || "CONSUMIDOR";
      }
    });

    bindCamposExtrasModal(conteudo, {
      getDraft: () => draft,
      sincronizarCamposDoDom,
      onTelefoneInvalido: () =>
        uiAlerta(
          "Telefone inválido",
          "Informe um número de telefone válido para abrir o WhatsApp.",
          "aviso",
        ),
    });

    const inpFotos = conteudo.querySelector("#editFotosInput");
    const btnAddFoto = conteudo.querySelector("#btnAdicionarFotoOS");
    const statusFotos = conteudo.querySelector("#statusCompressaoFotosOS");

    btnAddFoto?.addEventListener("click", () => {
      if (!podeAdicionarMaisFotos || !inpFotos) return;
      inpFotos.click();
    });

    inpFotos?.addEventListener("change", async (e) => {
      if (!draft || !podeEditar) return;
      const arquivos = Array.from(e.target.files || []).filter((f) =>
        f.type.startsWith("image/"),
      );
      e.target.value = "";
      if (!arquivos.length) return;

      const vagasRestantes =
        maxFotosOS -
        ((draft.fotosExistentes?.length || 0) +
          (draft.novasFotos?.length || 0));
      if (vagasRestantes <= 0) return;

      const selecionados = arquivos.slice(0, vagasRestantes);
      definirBotoesDesabilitados(true);
      if (statusFotos) {
        statusFotos.style.display = "block";
      }

      try {
        for (let i = 0; i < selecionados.length; i++) {
          if (statusFotos) {
            statusFotos.textContent = `Comprimindo foto ${i + 1} de ${selecionados.length}...`;
          }
          const { original, blobMini } = await comprimirImagemWeb(
            selecionados[i],
            {
              maxOriginal: 1024,
              qualidadeOriginal: 0.7,
              maxMini: 300,
              qualidadeMini: 0.6,
            },
          );
          const previewUrl = URL.createObjectURL(blobMini);
          draft.novasFotos.push({
            fileOriginal: original,
            blobMini,
            previewUrl,
            urlEnviada: null,
          });
        }
        render();
      } catch (err) {
        console.error("Erro ao comprimir foto na OS:", err);
        await uiAlerta(
          "Erro na imagem",
          err?.message || "Não foi possível processar a foto selecionada.",
          "erro",
        );
        render();
      }
    });

    conteudo.querySelectorAll(".btn-excluir-foto").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!draft || !podeEditar) return;

        const ok = await uiConfirmar(
          "Excluir foto",
          "Deseja remover esta foto da Ordem de Serviço?",
          "Excluir foto",
          "aviso",
        );
        if (!ok) return;

        const origem = btn.dataset.fotoOrigem;
        const idx = Number(btn.dataset.fotoIdxOrigem);
        if (Number.isNaN(idx)) return;

        if (origem === "nova") {
          const removida = draft.novasFotos[idx];
          if (removida?.previewUrl) {
            try {
              URL.revokeObjectURL(removida.previewUrl);
            } catch {
              // ignora erro de revogação
            }
          }
          draft.novasFotos.splice(idx, 1);
        } else if (origem === "existente") {
          const [removida] = draft.fotosExistentes.splice(idx, 1);
          const urlAlvo = removida?.urlOriginal || removida?.src || "";
          if (urlAlvo) {
            draft.fotosRemovidas.push(urlAlvo);
          }
        }

        render();
      });
    });

    conteudo
      .querySelector("#btnCompartilharOS")
      ?.addEventListener("click", async () => {
        sincronizarCamposDoDom(conteudo);
        sincronizarServicosNaObservacao(conteudo, draft);
        const texto = montarTextoCompartilhamento(osAtual, draft);
        const fotoUrl =
          fotosCombinadas[0]?.src || osAtual.fotos_urls?.[0] || "";
        await compartilharTexto({
          titulo: `OS #${osAtual.id ?? osAtual.uuid_local ?? ""}`,
          texto,
          fotoUrl,
        });
      });

    conteudo
      .querySelector("#btnRelatorioOS")
      ?.addEventListener("click", async () => {
        sincronizarCamposDoDom(conteudo);
        sincronizarServicosNaObservacao(conteudo, draft);
        const tot = calcularTotaisOS(draft.itens_servicos, draft.desconto);
        await abrirModalRelatorioEstiloCorporativo(osAtual, draft, tot);
      });

    conteudo
      .querySelector("#btnExcluirOS")
      ?.addEventListener("click", async () => {
        if (!podeEditar || !osAtual || osAtual.id == null) return;
        const idAlvo = osAtual.id;
        const nomeCliente = draft?.nome || osAtual?.nome || "cliente sem nome";
        const ok = await uiConfirmar(
          "Excluir Ordem de Serviço",
          `Deseja realmente excluir a OS #${idAlvo} de ${nomeCliente}? Essa ação não pode ser desfeita.`,
          "Excluir OS",
          "erro",
        );
        if (!ok) return;

        definirBotoesDesabilitados(true);
        try {
          if (typeof onExcluirOS === "function") {
            await onExcluirOS(osAtual);
          } else if (supabaseClient) {
            const { error } = await supabaseClient
              .from("ordens_servico")
              .delete()
              .eq("id", idAlvo);
            if (error) throw error;
          }
          fechar();
          await uiAlerta(
            "OS excluída",
            `A OS #${idAlvo} foi excluída com sucesso.`,
            "sucesso",
          );
        } catch (err) {
          console.error("Falha ao excluir OS:", err);
          definirBotoesDesabilitados(false);
          await uiAlerta(
            "Erro ao excluir OS",
            err?.message || "Não foi possível excluir a OS.",
            "erro",
          );
        }
      });

    conteudo.querySelectorAll(".foto-thumb-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.fotoIdx);
        const galeriaParaVisualizar = fotosCombinadas.map((f) => ({
          src: f.src,
          disponivelOffline: Boolean(
            f.disponivelOffline || f.origem === "nova",
          ),
        }));
        if (typeof onAbrirFoto === "function") {
          onAbrirFoto(galeriaParaVisualizar, Number.isNaN(idx) ? 0 : idx);
        }
      });
    });

    if (!podeEditar || typeof onAtualizarOS !== "function") return;

    const atualizarStatusNaTela = () => {
      const inpStatus = conteudo.querySelector("#editStatus");
      const vendaVal = conteudo.querySelector("#editNumeroVenda")?.value || "";
      const regVal = conteudo.querySelector("#editRegistroOs")?.value || "";

      if (draft.status !== "Cancelado") {
        draft.status = vendaVal.trim()
          ? "Concluído"
          : regVal.trim()
            ? "Em andamento"
            : "Pendente";
      }

      if (inpStatus) {
        inpStatus.value = draft.status;
        inpStatus.style.color =
          draft.status === "Cancelado" ? "#b91c1c" : "#1f5fbf";
      }
    };

    conteudo
      .querySelector("#btnToggleCancelar")
      ?.addEventListener("click", () => {
        draft.status = draft.status === "Cancelado" ? "" : "Cancelado";
        atualizarStatusNaTela();
        const btnCancel = conteudo.querySelector("#btnToggleCancelar");
        if (btnCancel) {
          btnCancel.textContent =
            draft.status === "Cancelado" ? "Reativar" : "Cancelar";
        }
      });

    conteudo
      .querySelector("#editRegistroOs")
      ?.addEventListener("input", atualizarStatusNaTela);

    conteudo
      .querySelector("#editNumeroVenda")
      ?.addEventListener("input", atualizarStatusNaTela);

    const inpCpf = conteudo.querySelector("#editDocumento");
    inpCpf?.addEventListener("input", (e) => {
      e.target.value = maskCPF(e.target.value);
    });

    const inpPlaca = conteudo.querySelector("#editPlaca");
    const btnModoPlaca = conteudo.querySelector("#btnModoPlaca");
    if (inpPlaca) {
      ctrlPlaca = criarControladorPlaca(inpPlaca, {
        modo: "mercosul",
        onChange: (_val, _dica, modo) => {
          if (btnModoPlaca) btnModoPlaca.textContent = modo.toUpperCase();
        },
      });
      btnModoPlaca?.addEventListener("click", () => {
        ctrlPlaca?.alternarModo();
        inpPlaca.focus();
      });
    }

    conteudo.querySelectorAll(".item-servico").forEach((inp) => {
      inp.addEventListener("change", async (e) => {
        const tr = e.target.closest("tr[data-item-idx]");
        const nomeDigitado = normalizarNomeServico(e.target.value);
        e.target.value = nomeDigitado;

        const encontrado = catalogoServicos.find(
          (s) => s.nome === nomeDigitado,
        );
        const inpUnit = tr?.querySelector(".item-unit");
        if (encontrado && inpUnit && Number(inpUnit.value || 0) === 0) {
          inpUnit.value = encontrado.valor;
        }

        const inpNumReforma = conteudo.querySelector("#editNumeroOs");
        if (
          isReforma(nomeDigitado) &&
          inpNumReforma &&
          !inpNumReforma.value.trim()
        ) {
          const prox = await buscarMenorNumeroLivreReforma();
          if (prox) inpNumReforma.value = prox;
        }

        const inpNumConserto = conteudo.querySelector("#editNumeroOsConserto");
        if (
          isConsertoOuSolda(nomeDigitado) &&
          inpNumConserto &&
          !inpNumConserto.value.trim()
        ) {
          const prox = await buscarMenorNumeroLivreConsertoSolda();
          if (prox) inpNumConserto.value = prox;
        }

        sincronizarCamposDoDom(conteudo);
        sincronizarServicosNaObservacao(conteudo, draft);
        atualizarResumoNaTela(conteudo);
      });
    });

    conteudo
      .querySelector("#btnAdicionarItem")
      ?.addEventListener("click", () => {
        sincronizarCamposDoDom(conteudo);
        draft.itens_servicos.push({
          servico: "",
          quantidade: 1,
          valor_unitario: 0,
          valor: 0,
        });
        render();
        const inputsServico = conteudo.querySelectorAll(".item-servico");
        inputsServico[inputsServico.length - 1]?.focus();
      });

    conteudo.querySelectorAll(".btn-remover-item").forEach((btn) => {
      btn.addEventListener("click", async () => {
        sincronizarCamposDoDom(conteudo);
        const delIdx = Number(btn.dataset.delIdx);
        if (Number.isNaN(delIdx)) return;

        const itemAlvo = draft.itens_servicos[delIdx];
        const nomeItem = (itemAlvo?.servico || itemAlvo?.nome || "").trim();

        if (nomeItem) {
          const ok = await uiConfirmar(
            "Remover serviço",
            `Deseja remover "${nomeItem}" desta OS?`,
            "Remover",
            "aviso",
          );
          if (!ok) return;
        }

        draft.itens_servicos.splice(delIdx, 1);
        render();
        sincronizarServicosNaObservacao(getConteudo(), draft);
      });
    });

    conteudo
      .querySelectorAll(".item-qtd, .item-unit, #editDesconto")
      .forEach((inp) => {
        inp.addEventListener("input", () => {
          sincronizarCamposDoDom(conteudo);
          atualizarResumoNaTela(conteudo);
        });
      });

    conteudo
      .querySelector("#btnSalvarAlteracoes")
      ?.addEventListener("click", async () => {
        sincronizarCamposDoDom(conteudo);
        sincronizarServicosNaObservacao(conteudo, draft);
        const patch = montarPatchOS(draft);

        definirBotoesDesabilitados(true);
        if (statusFotos && (draft.novasFotos || []).length > 0) {
          statusFotos.style.display = "block";
          statusFotos.textContent = "Enviando novas fotos...";
        }

        try {
          const urlsNovas = await enviarNovasFotosStorage(
            draft.novasFotos || [],
          );
          const urlsFinais = [
            ...new Set([
              ...(draft.fotos_existentes_mantidas || []),
              ...urlsNovas,
            ]),
          ];

          await onAtualizarOS(osAtual, {
            ...patch,
            fotos_urls: urlsFinais,
            novas_fotos_arquivos: draft.novas_fotos_arquivos,
            novas_fotos_miniaturas: draft.novas_fotos_miniaturas,
            fotos_removidas: draft.fotos_removidas,
            fotos_existentes_mantidas: draft.fotos_existentes_mantidas,
          });
        } catch (err) {
          console.error("Falha ao enviar/salvar fotos da OS:", err);
          definirBotoesDesabilitados(false);
          if (statusFotos) statusFotos.style.display = "none";
          await uiAlerta(
            "Erro ao salvar fotos",
            err?.message || "Não foi possível enviar as fotos para o servidor.",
            "erro",
          );
        }
      });
  }

  async function abrir(o) {
    if (!o) return;
    limparPreviewsNovasFotos(draft);
    osAtual = o;

    // Pega o que já está no banco e garante que não vai duplicar o texto manual
    const obsAuto = String(o.observacao || "")
      .trim()
      .toUpperCase();
    const obsManual = String(o.observacao_manual || "")
      .trim()
      .toUpperCase();

    // Se o banco já tem o texto manual dentro da observacao antiga, limpamos para não repetir
    let obsBase = obsAuto;
    if (obsManual && obsAuto.includes(obsManual)) {
      obsBase = obsAuto
        .replace(obsManual, "")
        .replace(/\|\s*$/, "")
        .trim();
    }
    const obsInicial = obsBase ? `${obsBase} | ${obsManual}` : obsManual;

    const baseDraft = {
      nome: o.nome || "",
      telefone: o.telefone || "",
      documento: o.documento || "",
      placa: o.placa || "",
      aparelho: o.aparelho || "",
      cor: o.cor || "",
      numero_os: o.numero_os || "",
      numero_os_conserto: o.numero_os_conserto || "",
      registro_os: o.registro_os || "",
      numero_venda: o.numero_venda || "",
      status: o.status === "Cancelado" ? "Cancelado" : "",
      observacao: obsInicial,
      observacao_manual: o.observacao_manual || "",
      servico: o.servico || "",
      desconto: Number(o.desconto || 0),
      itens_servicos: Array.isArray(o.itens_servicos)
        ? o.itens_servicos.map((it) => ({ ...it }))
        : [],
      fotosExistentes: montarFotosExistentesIniciais(o),
      novasFotos: [],
      fotosRemovidas: [],
      novas_fotos_arquivos: [],
      novas_fotos_miniaturas: [],
      fotos_removidas: [],
      fotos_existentes_mantidas: [],
    };

    baseDraft.status = calcularStatusPorDocumentos(baseDraft);
    baseDraft.servico_finalizado = baseDraft.status === "Concluído";

    draft = baseDraft;
    render();
    catalogoServicos = await carregarCatalogoServicos();
    if (estaAberto() && osAtual === o) {
      const dl = getConteudo()?.querySelector("#datalistCatalogoServicos");
      if (dl) {
        dl.innerHTML = catalogoServicos
          .map((s) => `<option value="${esc(s.nome)}"></option>`)
          .join("");
      }
    }
  }

  getOverlay()?.addEventListener("click", (e) => {
    if (e.target.id === overlayId) fechar();
  });

  return {
    abrir,
    fechar,
    estaAberto,
    definirBotoesDesabilitados,
  };
}
