export function normalizarItemOS(item = {}) {
  const nomeServico = String(item.servico ?? item.nome ?? "").trim();
  const qtdRaw = Number(item.quantidade ?? item.qtd ?? 1);
  const quantidade = Number.isFinite(qtdRaw) && qtdRaw > 0 ? qtdRaw : 1;

  const valorItemRaw = Number(item.valor ?? 0);
  const valorUnitRaw =
    item.valor_unitario ?? item.unitario ?? item.preco_unitario;

  let valorUnitario = 0;
  if (
    valorUnitRaw !== undefined &&
    valorUnitRaw !== null &&
    valorUnitRaw !== "" &&
    !Number.isNaN(Number(valorUnitRaw))
  ) {
    valorUnitario = Math.max(0, Number(valorUnitRaw));
  } else if (Number.isFinite(valorItemRaw) && valorItemRaw > 0) {
    valorUnitario = valorItemRaw / quantidade;
  }

  const valorTotalItem = Number((quantidade * valorUnitario).toFixed(2));

  return {
    servico: nomeServico,
    quantidade,
    valor_unitario: Number(valorUnitario.toFixed(2)),
    valor: valorTotalItem,
  };
}

export function calcularTotaisOS(itens = [], descontoRaw = 0) {
  const itensNormalizados = (Array.isArray(itens) ? itens : []).map(
    normalizarItemOS,
  );
  const subtotal = itensNormalizados.reduce(
    (acc, it) => acc + Number(it.valor || 0),
    0,
  );
  const descontoNum = Number(descontoRaw || 0);
  const desconto =
    Number.isFinite(descontoNum) && descontoNum > 0
      ? Number(descontoNum.toFixed(2))
      : 0;
  const valorFinal = Number(Math.max(0, subtotal - desconto).toFixed(2));

  return {
    itens: itensNormalizados,
    subtotal: Number(subtotal.toFixed(2)),
    desconto,
    valorFinal,
  };
}

export function montarPatchOS(formState = {}) {
  const { itens, desconto, valorFinal } = calcularTotaisOS(
    formState.itens_servicos,
    formState.desconto,
  );

  const itensValidos = itens.filter((it) => it.servico.length > 0);
  const resumoServicos = itensValidos.map((it) => it.servico).join(" / ");
  const finalizado = Boolean(formState.servico_finalizado);
  const statusLimpo =
    String(formState.status || "").trim() ||
    (finalizado ? "Finalizado" : "Pendente");

  const registroOsLimpo = String(
    formState.registro_os ?? formState.registroOs ?? "",
  ).trim();
  const numeroVendaLimpo = String(
    formState.numero_venda ?? formState.numeroVenda ?? "",
  ).trim();

  return {
    nome: String(formState.nome || "").trim() || "CONSUMIDOR",
    telefone: String(formState.telefone || "").trim(),
    documento: String(formState.documento || "").trim(),
    placa: String(formState.placa || "")
      .trim()
      .toUpperCase(),
    aparelho: String(formState.aparelho || "").trim(),
    cor: String(formState.cor || "").trim(),
    numero_os: String(formState.numero_os || "").trim(),
    numero_os_conserto: String(formState.numero_os_conserto || "").trim(),
    registro_os: registroOsLimpo || null,
    numero_venda: numeroVendaLimpo || null,
    status: statusLimpo,
    observacao: String(formState.observacao || "").trim(),
    observacao_manual: String(formState.observacao_manual || "").trim(),
    servico: resumoServicos || String(formState.servico || "").trim(),
    itens_servicos: itensValidos,
    desconto,
    valor: valorFinal,
  };
}
