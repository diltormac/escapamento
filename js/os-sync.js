import { supabaseClient } from "./supabase.js";
import { osRepository } from "./os-repository.js";

let sincronizando = false;

function isReforma(nome) {
  return (
    String(nome || "")
      .trim()
      .toUpperCase() === "REFORMA"
  );
}

function isConsertoOuSolda(nome) {
  const n = String(nome || "")
    .trim()
    .toUpperCase();
  return n.includes("CONSERTO") || n.includes("SOLDA");
}

function resolverNomeAparelho(os) {
  const val =
    os?.aparelho ||
    (window.DeviceId && typeof window.DeviceId.get === "function"
      ? window.DeviceId.get()
      : "") ||
    localStorage.getItem("@osfacil_aparelho") ||
    "";
  const limpo = String(val).trim().toUpperCase();
  return limpo || "APARELHO NÃO IDENTIFICADO";
}

// Sobe UMA foto; se já tem url, pula. Retorna a URL pública.
async function subirFoto(osId, foto, index) {
  if (foto.enviada && foto.url) return foto.url;

  const nomeArquivo = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpeg`;

  const { error: errUp } = await supabaseClient.storage
    .from("fotos-ordens")
    .upload(nomeArquivo, foto.blob);

  if (errUp) throw new Error("Erro upload original: " + errUp.message);

  const { data: urlData } = supabaseClient.storage
    .from("fotos-ordens")
    .getPublicUrl(nomeArquivo);

  const url = urlData.publicUrl;
  // Persiste imediatamente — se cair depois, retry NÃO reenvia esta
  await osRepository.marcarFotoEnviada(osId, index, url);
  return url;
}

export const osSync = {
  async enviarPendentes() {
    if (sincronizando || !navigator.onLine) return;
    sincronizando = true;

    try {
      const pendentes = await osRepository.listarPendentes();
      if (pendentes.length === 0) return;

      for (const os of pendentes) {
        try {
          // --- Idempotência: se já existe no Supabase, só marca e segue ---
          if (os.uuid_local) {
            const { data: existente, error: selErr } = await supabaseClient
              .from("ordens_servico")
              .select("id, numero_os, numero_os_conserto")
              .eq("uuid_local", os.uuid_local)
              .maybeSingle();

            if (!selErr && existente) {
              await osRepository.marcarSincronizada(os.id, existente.id);
              continue;
            }
          }

          // --- Uploads em PARALELO (todas as fotos de uma OS ao mesmo tempo) ---
          const fotos = os.fotos || [];
          const urlsDasFotos = await Promise.all(
            fotos.map((foto, i) => subirFoto(os.id, foto, i)),
          );

          // --- Agregações ---
          const servicosOriginais = Array.isArray(os.servicos)
            ? os.servicos
            : [];
          const valorTotal = servicosOriginais.reduce(
            (soma, i) => soma + Number(i.valor || 0) * Number(i.qtd || 0),
            0,
          );
          const qtdTotal = servicosOriginais.reduce(
            (soma, i) => soma + Number(i.qtd || 0),
            0,
          );
          const servicosResumo = servicosOriginais
            .map((i) => i.nome)
            .join(", ")
            .toUpperCase();

          const temReforma = servicosOriginais.some((s) => isReforma(s.nome));
          const temConsertoSolda = servicosOriginais.some((s) =>
            isConsertoOuSolda(s.nome),
          );

          const servicoReforma = servicosOriginais.find((s) =>
            isReforma(s.nome),
          );
          const servicoConserto = servicosOriginais.find((s) =>
            isConsertoOuSolda(s.nome),
          );

          const numeroOSReforma = temReforma
            ? servicoReforma?.numero_os || null
            : null;
          const numeroOSConserto = temConsertoSolda
            ? servicoConserto?.numero_os_conserto || null
            : null;

          // Cor da primeira REFORMA que tiver cor preenchida
          const primeiraCorReforma =
            servicosOriginais.find((s) => isReforma(s.nome) && s.cor)?.cor ||
            null;

          const itensServicosPayload = servicosOriginais.map((s) => ({
            servico: s.nome,
            valor: s.valor,
            quantidade: s.qtd,
            placa: os.placa || null,
            cor: isReforma(s.nome) ? s.cor || null : null,
            numero_os: isReforma(s.nome) ? s.numero_os || null : null,
            numero_os_conserto: isConsertoOuSolda(s.nome)
              ? s.numero_os_conserto || null
              : null,
          }));

          // Mesmo padrão do app.js: observacao = resumo + cor (se houver)
          const observacaoComCor = primeiraCorReforma
            ? `SERVIÇOS: ${servicosResumo} | COR: ${primeiraCorReforma}`
            : `SERVIÇOS: ${servicosResumo}`;

          const cadastroFinal = {
            uuid_local: os.uuid_local,
            nome:
              os.nome && os.nome.trim() !== "" ? os.nome.trim() : "CONSUMIDOR",
            telefone: os.telefone || "SEM CONTATO",
            servico: servicosResumo,
            quantidade: qtdTotal,
            valor: valorTotal,
            itens_servicos: itensServicosPayload,
            observacao: observacaoComCor,
            observacao_manual: os.observacao_manual || "",
            documento: os.documento || null,
            placa: os.placa || null,
            cor: primeiraCorReforma,
            numero_os: numeroOSReforma,
            numero_os_conserto: numeroOSConserto,
            aparelho: resolverNomeAparelho(os),
            status: "Pendente",
            servico_finalizado: false,
            desconto: 0,
            fotos_urls: urlsDasFotos,
          };

          const { data: inserted, error: insErr } = await supabaseClient
            .from("ordens_servico")
            .insert([cadastroFinal])
            .select("id, numero_os, numero_os_conserto, itens_servicos")
            .single();

          if (insErr) throw insErr;

          const numReformaOficial = inserted?.numero_os ?? null;
          const numConsertoOficial = inserted?.numero_os_conserto ?? null;

          const servicosAtualizados = servicosOriginais.map((s) => {
            if (isReforma(s.nome) && numReformaOficial) {
              return { ...s, numero_os: numReformaOficial };
            }
            if (isConsertoOuSolda(s.nome) && numConsertoOficial) {
              return { ...s, numero_os_conserto: numConsertoOficial };
            }
            return s;
          });

          const itensAtualizados = (
            inserted?.itens_servicos || itensServicosPayload
          ).map((item) => {
            if (isReforma(item.servico) && numReformaOficial) {
              return { ...item, numero_os: numReformaOficial };
            }
            if (isConsertoOuSolda(item.servico) && numConsertoOficial) {
              return { ...item, numero_os_conserto: numConsertoOficial };
            }
            return item;
          });

          if (numReformaOficial || numConsertoOficial) {
            await supabaseClient
              .from("ordens_servico")
              .update({ itens_servicos: itensAtualizados })
              .eq("id", inserted.id);
          }

          await osRepository.marcarSincronizada(
            os.id,
            inserted.id,
            numReformaOficial,
            servicosAtualizados,
          );
        } catch (err) {
          console.error(`Falha OS local ${os.id}:`, err);
          await osRepository.registrarErro(os.id, err.message || String(err));
        }
      }
    } finally {
      sincronizando = false;
    }
  },
};
