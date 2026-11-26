import Dexie from "../../js/dexie.min.mjs";

// Banco local exclusivo do painel (espelho offline do Supabase)
export const painelDb = new Dexie("OsPainelDB");

painelDb.version(1).stores({
  ordens_servico:
    "id, uuid_local, status, servico_finalizado, aparelho, created_at",
});
