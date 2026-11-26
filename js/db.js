// 1. Aponta para o Dexie local (offline)
import Dexie from "./dexie.min.mjs";

// 2. Importa o cliente do Supabase que você já configurou no outro arquivo
import { supabaseClient } from "./supabase.js";

// Inicializa o banco offline
export const db = new Dexie("OsFacilDB");
db.version(1).stores({
  catalogo_servicos: "id, nome, valor",
});
db.version(2).stores({
  catalogo_servicos: "id, nome, valor",
  ordens_servico: "++id, uuid_local, status, criado_em",
});

// Sincroniza: Pega do Supabase e salva no Dexie
// Retorna true se sincronizou de verdade, false se caiu no fallback/offline
export async function sincronizarServicos() {
  if (!navigator.onLine) return false;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const { data, error } = await supabaseClient
      .from("catalogo_servicos")
      .select("*")
      .abortSignal(controller.signal);

    clearTimeout(timer);

    if (error) throw error;
    if (!data || data.length === 0) return false;

    await db.catalogo_servicos.clear();
    await db.catalogo_servicos.bulkAdd(data);
    console.log("Catálogo de serviços sincronizado com sucesso!");
    return true;
  } catch (error) {
    console.warn(
      "Falha ao sincronizar com Supabase. Usando dados offline.",
      error,
    );

    // PLANO B: se o banco local estiver vazio, carrega do JSON de teste
    try {
      const bancoAtual = await db.catalogo_servicos.toArray();
      if (bancoAtual.length === 0) {
        const respostaLocal = await fetch("./js/catalogo_servicos_rows.json");
        const servicosLocais = await respostaLocal.json();
        await db.catalogo_servicos.bulkAdd(servicosLocais);
        console.log("Catálogo carregado do JSON local de teste!");
      }
    } catch (e) {
      console.error("Nem o JSON local foi encontrado.", e);
    }
    return false;
  }
}
