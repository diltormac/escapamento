import { db } from "./db.js";

function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
}

function obterNomeAparelho(aparelhoInformado) {
  const val =
    aparelhoInformado ||
    (window.DeviceId ? window.DeviceId.get() : "") ||
    localStorage.getItem("@osfacil_aparelho") ||
    "";
  return String(val).trim().toUpperCase();
}

export const osRepository = {
  async salvar(dados) {
    const aparelho = obterNomeAparelho(dados.aparelho);
    if (!aparelho || aparelho.length < 2) {
      if (window.DeviceId) window.DeviceId.require();
      throw new Error("Cadastre o nome do aparelho antes de enviar.");
    }

    return await db.ordens_servico.add({
      uuid_local: uuid(),
      nome: dados.nome || "",
      telefone: dados.telefone || "",
      telefone_formatado: dados.telefoneFormatado || "",
      pais: dados.pais || "BR",
      documento: dados.cpf || "",
      placa: dados.placa || "",
      observacao_manual: dados.observacao || "",
      servicos: dados.servicos || [],
      // Cada foto ganha: blob, url pública (null até subir) e flag de envio
      fotos: (dados.fotos || []).map((f) => ({
        nome: f.name,
        tipo: f.type,
        blob: f,
        url: null,
        enviada: false,
      })),
      aparelho,
      numero_os: null,
      status: "pendente",
      criado_em: new Date().toISOString(),
      sincronizado_em: null,
      supabase_id: null,
      ultimo_erro: null,
    });
  },

  async listarPendentes() {
    return await db.ordens_servico.where("status").equals("pendente").toArray();
  },

  // Marca uma foto específica como enviada (chamado pelo os-sync em tempo real)
  async marcarFotoEnviada(osId, index, url) {
    const atual = await db.ordens_servico.get(osId);
    if (!atual || !Array.isArray(atual.fotos)) return;
    const fotos = atual.fotos.map((f, i) =>
      i === index ? { ...f, url, enviada: true } : f,
    );
    return await db.ordens_servico.update(osId, { fotos });
  },

  async marcarSincronizada(
    id,
    supabaseId,
    numeroOS = null,
    servicosAtualizados = null,
  ) {
    const atual = await db.ordens_servico.get(id);
    const patch = {
      status: "sincronizado",
      sincronizado_em: new Date().toISOString(),
      supabase_id: supabaseId,
      ultimo_erro: null,
    };

    if (numeroOS !== null && numeroOS !== undefined) {
      patch.numero_os = numeroOS;
    }

    if (Array.isArray(servicosAtualizados)) {
      patch.servicos = servicosAtualizados;
    } else if (numeroOS && Array.isArray(atual?.servicos)) {
      patch.servicos = atual.servicos.map((s) =>
        String(s.nome || "")
          .trim()
          .toUpperCase() === "REFORMA"
          ? { ...s, numero_os: numeroOS }
          : s,
      );
    }

    return await db.ordens_servico.update(id, patch);
  },

  async registrarErro(id, mensagem) {
    return await db.ordens_servico.update(id, { ultimo_erro: mensagem });
  },
};
