import { supabaseClient } from "../../js/supabase.js";
import { osCache } from "./os-cache.js";

export function criarGerenciadorSync({
  state,
  setStatusIndicator,
  onDadosAtualizados,
  getBtnAtualizar = () => document.getElementById("btnAtualizar"),
} = {}) {
  const dataUrlCache = new Map();

  function limparBlobUrls() {
    if (Array.isArray(state.blobUrls)) {
      state.blobUrls.forEach((url) => {
        if (typeof url === "string" && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
      state.blobUrls = [];
    }
  }

  function blobParaDataUrl(blob) {
    return new Promise((resolve) => {
      if (!(blob instanceof Blob) || blob.size === 0) {
        resolve("");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const res = typeof reader.result === "string" ? reader.result : "";
        resolve(res);
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  }

  function atualizarBadgeStatus(statusExtra = "") {
    const isOffline = !navigator.onLine;
    const prefixo = isOffline
      ? "Offline"
      : state.realtimeAtivo
        ? "Realtime"
        : "Banco Local";
    const sufixo = statusExtra ? ` · ${statusExtra}` : "";

    setStatusIndicator(
      `${prefixo} · ${state.dados.length} OS${sufixo}`,
      isOffline,
    );
  }

  async function adaptarPainelDb(os) {
    const fotosCache = Array.isArray(os.fotos_cache) ? os.fotos_cache : [];
    const fotosLocais = [];

    for (const f of fotosCache) {
      if (f?.blob instanceof Blob && f.blob.size > 0) {
        const chaveCache =
          f.url ||
          `${os.id ?? os.uuid_local ?? ""}_${f.blob.size}_${f.blob.type}`;

        let dataUrl = dataUrlCache.get(chaveCache);
        if (!dataUrl) {
          dataUrl = await blobParaDataUrl(f.blob);
          if (dataUrl) {
            dataUrlCache.set(chaveCache, dataUrl);
          }
        }

        if (dataUrl) {
          fotosLocais.push({
            src: dataUrl,
            disponivelOffline: true,
            urlRemota: f.url || "",
          });
          continue;
        }
      }

      if (f?.url && navigator.onLine) {
        fotosLocais.push({
          src: f.url,
          disponivelOffline: false,
          urlRemota: f.url,
        });
      }
    }

    return {
      ...os,
      itens_servicos: Array.isArray(os.itens_servicos) ? os.itens_servicos : [],
      fotos_locais: fotosLocais,
      fotos_urls: fotosLocais.map((x) => x.urlRemota).filter(Boolean),
      servico_finalizado: Boolean(os.servico_finalizado),
      status: os.status || (os.servico_finalizado ? "Concluído" : "Pendente"),
    };
  }

  async function carregarDoBancoOffline(statusExtra = "") {
    limparBlobUrls();
    const locais = await osCache.listarOffline();
    state.dados = await Promise.all(locais.map(adaptarPainelDb));

    atualizarBadgeStatus(statusExtra);

    if (typeof onDadosAtualizados === "function") {
      onDadosAtualizados();
    }
  }

  async function sincronizarNovos(forcarIndicador = false) {
    if (!navigator.onLine || state.sincronizandoBg) {
      if (forcarIndicador) {
        await carregarDoBancoOffline("sem internet");
      }
      return;
    }

    state.sincronizandoBg = true;
    const btnAtualizar = getBtnAtualizar();
    if (forcarIndicador) {
      if (btnAtualizar) btnAtualizar.disabled = true;
      setStatusIndicator("Sincronizando…", false);
    }

    try {
      const rem = await osCache.reconciliarRemocoesComSupabase();
      const upd = await osCache.sincronizarAtualizacoesComSupabase({
        limite: 500,
        baixarImagens: true,
      });
      const res = await osCache.baixarNovosDoSupabase({
        limite: 500,
        baixarImagens: true,
      });

      const houveMudanca =
        (rem.ok && rem.removidos > 0) ||
        (upd.ok && upd.atualizados > 0) ||
        (res.ok && res.adicionados > 0);

      if (houveMudanca) {
        const detalhe = [
          res.adicionados > 0 ? `+${res.adicionados} nova(s)` : "",
          upd.atualizados > 0 ? `${upd.atualizados} atualizada(s)` : "",
          rem.removidos > 0 ? `-${rem.removidos} removida(s)` : "",
        ]
          .filter(Boolean)
          .join(", ");
        await carregarDoBancoOffline(detalhe);
      } else if (forcarIndicador) {
        await carregarDoBancoOffline(
          res.ok ? "atualizado" : "falha na consulta",
        );
      }
    } finally {
      state.sincronizandoBg = false;
      if (forcarIndicador && btnAtualizar) {
        btnAtualizar.disabled = false;
      }
    }
  }

  function iniciarRealtime() {
    if (!navigator.onLine || state.canalRealtime) return;

    const canal = supabaseClient
      .channel("painel-ordens-servico")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ordens_servico" },
        async (payload) => {
          try {
            if (payload.eventType === "DELETE") {
              const idRemovido = payload.old?.id;
              if (idRemovido != null) {
                await osCache.removerLocal(idRemovido);
                await carregarDoBancoOffline("OS removida");
              }
              return;
            }

            if (payload.new) {
              await osCache.salvarEventoRealtime(payload.new);
              const rotulo =
                payload.eventType === "INSERT" ? "+1 nova OS" : "OS atualizada";
              await carregarDoBancoOffline(rotulo);
            }
          } catch (err) {
            console.error("Erro ao processar evento Realtime:", err);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          state.realtimeAtivo = true;
          atualizarBadgeStatus();
        } else if (
          status === "CLOSED" ||
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          state.realtimeAtivo = false;
          atualizarBadgeStatus();
        }
      });

    state.canalRealtime = canal;
  }

  async function encerrarRealtime() {
    if (!state.canalRealtime) return;
    try {
      await supabaseClient.removeChannel(state.canalRealtime);
    } catch (e) {
      console.warn("Erro ao fechar canal Realtime:", e);
    }
    state.canalRealtime = null;
    state.realtimeAtivo = false;
  }

  return {
    carregarDoBancoOffline,
    sincronizarNovos,
    iniciarRealtime,
    encerrarRealtime,
    limparBlobUrls,
  };
}
