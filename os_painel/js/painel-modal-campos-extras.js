import { normalizarNomeServico } from "./painel-catalogo-regras.js";

export const btnCopiarCampoStyle =
  "font-size:10px;padding:1px 6px;border-radius:4px;border:1px solid #d0d5db;background:#fff;color:#334155;cursor:pointer";

export const btnWhatsAppCampoStyle =
  "font-size:10px;padding:1px 6px;border-radius:4px;border:1px solid #16a34a;background:#16a34a;color:#fff;cursor:pointer";

export function renderBotaoCopiar(targetId) {
  return `<button type="button" class="btn-copiar-campo" data-copiar-target="${targetId}" style="${btnCopiarCampoStyle}">Copiar</button>`;
}

export function renderBotoesTelefoneExtras(targetId = "editTelefone") {
  return `
    <span style="display:inline-flex;gap:4px">
      ${renderBotaoCopiar(targetId)}
      <button type="button" id="btnWhatsAppTelefone" style="${btnWhatsAppCampoStyle}">WhatsApp</button>
    </span>
  `;
}

export function maskBR(valor) {
  const d = String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 11);
  if (d.length > 2) {
    return `(${d.slice(0, 2)}) ${d.slice(2)}`.replace(
      /(\(\d{2}\)) (\d{5})(\d{1,4})/,
      "$1 $2-$3",
    );
  }
  return d;
}

export function maskPY(valor) {
  let d = String(valor || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  d = d.slice(0, 9);
  if (d.length > 3) {
    return `(${d.slice(0, 3)}) ${d.slice(3)}`.replace(
      /\((\d{3})\) (\d{3})(\d{1,3})/,
      "($1) $2-$3",
    );
  }
  return d;
}

export function formatarTelefoneLocal(valor, pais = "BR") {
  return pais === "PY" ? maskPY(valor) : maskBR(valor);
}

// Alias de compatibilidade
export const formatarTelefoneBR = formatarTelefoneLocal;

export function extrairPaisENumeroLocal(valorSalvo) {
  const bruto = String(valorSalvo || "").trim();
  const digitos = bruto.replace(/\D/g, "");
  if (!digitos) return { pais: "BR", localFormatado: "" };

  if (
    bruto.startsWith("+595") ||
    (digitos.startsWith("595") && digitos.length >= 11)
  ) {
    const local = digitos.slice(3);
    return { pais: "PY", localFormatado: maskPY(local) };
  }

  if (
    bruto.startsWith("+55") ||
    (digitos.startsWith("55") && digitos.length >= 12)
  ) {
    const local = digitos.slice(2);
    return { pais: "BR", localFormatado: maskBR(local) };
  }

  if (digitos.length === 9 && digitos.startsWith("9")) {
    return { pais: "PY", localFormatado: maskPY(digitos) };
  }

  return { pais: "BR", localFormatado: maskBR(digitos) };
}

export function normalizarTelefoneSomenteDigitos(valor, pais = "BR") {
  let digitos = String(valor || "").replace(/\D/g, "");
  if (!digitos) return "";

  if (pais === "PY") {
    if (digitos.startsWith("595") && digitos.length >= 11) {
      digitos = digitos.slice(3);
    }
    if (digitos.startsWith("0")) {
      digitos = digitos.slice(1);
    }
    digitos = digitos.slice(0, 9);
    return digitos ? `595${digitos}` : "";
  }

  if (digitos.startsWith("55") && digitos.length >= 12) {
    digitos = digitos.slice(2);
  }
  digitos = digitos.slice(0, 11);
  return digitos ? `55${digitos}` : "";
}

export function obterSaudacaoPorHorario(dataRef = new Date()) {
  const hora = dataRef.getHours();
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

export function montarMensagemWhatsAppEmpresarial(nomeCliente) {
  const saudacao = obterSaudacaoPorHorario();
  const nome = String(nomeCliente || "").trim();
  const ehConsumidor = !nome || nome.toUpperCase() === "CONSUMIDOR";

  const cumprimento = ehConsumidor
    ? `Olá, ${saudacao.toLowerCase()}!`
    : `Olá, ${nome}, ${saudacao.toLowerCase()}!`;

  return `${cumprimento} Aqui é da *Clínica da Roda*. Tudo bem?`;
}

export async function copiarTextoCampo(valor, btn) {
  const texto = String(valor || "").trim();
  if (!texto) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
    } else {
      const aux = document.createElement("textarea");
      aux.value = texto;
      aux.style.position = "fixed";
      aux.style.opacity = "0";
      document.body.appendChild(aux);
      aux.select();
      document.execCommand("copy");
      aux.remove();
    }

    if (btn) {
      const anterior = btn.textContent;
      btn.textContent = "Copiado!";
      setTimeout(() => {
        btn.textContent = anterior;
      }, 1200);
    }
  } catch (err) {
    console.warn("Falha ao copiar:", err);
  }
}

export function normalizarTelefoneWhatsApp(valor, pais = "BR") {
  return normalizarTelefoneSomenteDigitos(valor, pais);
}

export function abrirWhatsAppComMensagem(telefoneBruto, mensagem, pais = "BR") {
  const numero = normalizarTelefoneWhatsApp(telefoneBruto, pais);
  if (!numero) return false;
  const texto = String(mensagem || "").trim();
  const url = texto
    ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
    : `https://wa.me/${numero}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export function forcarCapsLockAoDigitar(inputEl) {
  if (!inputEl) return;
  inputEl.addEventListener("input", (e) => {
    const pos = e.target.selectionStart;
    e.target.value = e.target.value.toUpperCase();
    if (typeof pos === "number") e.target.setSelectionRange(pos, pos);
  });
}

export function sincronizarServicosNaObservacao(conteudo, draft) {
  if (!draft || !conteudo) return;
  const inpObs = conteudo.querySelector("#editObservacao");
  if (!inpObs) return;

  const nomesServicos = [
    ...new Set(
      (draft.itens_servicos || [])
        .map((it) => normalizarNomeServico(it?.servico ?? it?.nome ?? ""))
        .filter(Boolean),
    ),
  ];

  const blocoServicos = nomesServicos.length
    ? `SERVIÇOS: ${nomesServicos.join(", ")}`
    : "";

  const atual = String(inpObs.value || "").toUpperCase();
  const partes = atual
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);

  const outrasPartes = partes.filter(
    (p) => !p.startsWith("SERVIÇOS:") && !p.startsWith("COR:"),
  );
  const combinadas = blocoServicos
    ? [blocoServicos, ...outrasPartes]
    : outrasPartes;

  const novoTexto = combinadas.join(" | ");
  inpObs.value = novoTexto;
  draft.observacao = novoTexto;
}

export function bindCamposExtrasModal(
  conteudo,
  { getDraft, sincronizarCamposDoDom, onTelefoneInvalido } = {},
) {
  if (!conteudo) return;

  const inpTel = conteudo.querySelector("#editTelefone");
  const btnPais = conteudo.querySelector("#btnPaisTelefone");
  const spanDdi = conteudo.querySelector("#editTelefoneDdi");

  const getPaisAtual = () => btnPais?.dataset.pais || "BR";

  const atualizarPaisUI = (pais) => {
    const ehPY = pais === "PY";
    if (btnPais) {
      btnPais.dataset.pais = ehPY ? "PY" : "BR";
      btnPais.textContent = ehPY ? "🇵🇾" : "🇧🇷";
      btnPais.style.background = ehPY
        ? "rgba(217, 43, 43, 0.10)"
        : "rgba(255, 196, 0, 0.14)";
      btnPais.style.borderColor = ehPY
        ? "rgba(217, 43, 43, 0.38)"
        : "rgba(202, 138, 4, 0.38)";
    }
    if (spanDdi) {
      spanDdi.textContent = ehPY ? "+595" : "+55";
      spanDdi.style.color = ehPY ? "#b91c1c" : "#92400e";
    }
    if (inpTel) {
      inpTel.placeholder = ehPY ? "(000) 000-000" : "(00) 00000-0000";
    }
  };
  if (inpTel) {
    const inicial = extrairPaisENumeroLocal(inpTel.value);
    atualizarPaisUI(inicial.pais);
    inpTel.value = inicial.localFormatado;

    btnPais?.addEventListener("click", (e) => {
      e.stopPropagation();
      const proximo = getPaisAtual() === "BR" ? "PY" : "BR";
      atualizarPaisUI(proximo);
      inpTel.value = formatarTelefoneLocal(inpTel.value, proximo);
      inpTel.focus();
    });

    inpTel.addEventListener("input", (e) => {
      let rawValue = e.target.value.replace(/\D/g, "");
      let pais = getPaisAtual();

      if (
        rawValue.length > 0 &&
        rawValue.length <= 9 &&
        (rawValue.startsWith("9") || rawValue.startsWith("0"))
      ) {
        if (pais !== "PY" && rawValue.length === 9) {
          pais = "PY";
          atualizarPaisUI("PY");
        }
      } else if (rawValue.length > 9) {
        if (pais !== "BR") {
          pais = "BR";
          atualizarPaisUI("BR");
        }
      }

      e.target.value = formatarTelefoneLocal(rawValue, pais);
    });
  }

  conteudo.querySelectorAll(".btn-copiar-campo").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const alvoId = btn.dataset.copiarTarget;
      const val = conteudo.querySelector(`#${alvoId}`)?.value ?? "";
      copiarTextoCampo(val, btn);
    });
  });

  conteudo
    .querySelector("#btnWhatsAppTelefone")
    ?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const draft = typeof getDraft === "function" ? getDraft() : null;
      if (!draft) return;

      const paisAtual = getPaisAtual();
      const telAtual = inpTel?.value ?? draft.telefone;

      if (!normalizarTelefoneWhatsApp(telAtual, paisAtual)) {
        if (typeof onTelefoneInvalido === "function") {
          await onTelefoneInvalido();
        }
        return;
      }

      if (typeof sincronizarCamposDoDom === "function") {
        sincronizarCamposDoDom(conteudo);
      }

      const nomeAtual =
        conteudo.querySelector("#editNome")?.value ?? draft.nome;
      const msg = montarMensagemWhatsAppEmpresarial(nomeAtual);
      abrirWhatsAppComMensagem(telAtual, msg, paisAtual);
    });

  forcarCapsLockAoDigitar(conteudo.querySelector("#editNome"));
  forcarCapsLockAoDigitar(conteudo.querySelector("#editCor"));
  forcarCapsLockAoDigitar(conteudo.querySelector("#editObservacao"));
  conteudo.querySelectorAll(".item-servico").forEach((inp) => {
    forcarCapsLockAoDigitar(inp);
  });
}
