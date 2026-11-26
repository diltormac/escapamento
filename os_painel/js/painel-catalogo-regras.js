import { supabaseClient } from "../../js/supabase.js";
import { criarControladorPlaca } from "../../components/placa-teclado.js";

export { criarControladorPlaca };

export function maskCPF(v) {
  return String(v || "")
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatarTelefoneInteligente(valor) {
  const digits = String(valor || "").replace(/\D/g, "");
  if (!digits) return "";

  // Detecta DDI 595 ou padrão local Paraguai (9 dígitos iniciando com 9 ou 0)
  const semDdiPy = digits.startsWith("595") ? digits.slice(3) : null;
  if (
    semDdiPy !== null ||
    (digits.length <= 9 && (digits.startsWith("9") || digits.startsWith("0")))
  ) {
    const d = (semDdiPy ?? digits).slice(0, 9);
    if (d.length > 3) {
      return `+595 (${d.slice(0, 3)}) ${d.slice(3)}`.replace(
        /\((\d{3})\) (\d{3})(\d{1,3})/,
        "($1) $2-$3",
      );
    }
    return `+595 ${d}`;
  }

  // Padrão Brasil (+55)
  const semDdiBr =
    digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  const d = semDdiBr.slice(0, 11);
  if (d.length > 2) {
    return `+55 (${d.slice(0, 2)}) ${d.slice(2)}`.replace(
      /(\(\d{2}\)) (\d{5})(\d{1,4})/,
      "$1 $2-$3",
    );
  }
  return `+55 ${d}`;
}

export function normalizarNomeServico(nome) {
  return String(nome || "")
    .trim()
    .toUpperCase();
}

export function isReforma(nome) {
  return normalizarNomeServico(nome) === "REFORMA";
}

export function isConsertoOuSolda(nome) {
  const n = normalizarNomeServico(nome);
  return n.includes("CONSERTO") || n.includes("SOLDA");
}

let catalogoCache = [];

export async function carregarCatalogoServicos() {
  if (catalogoCache.length > 0 && !navigator.onLine) {
    return catalogoCache;
  }

  if (navigator.onLine) {
    try {
      const { data, error } = await supabaseClient
        .from("catalogo_servicos")
        .select("id, nome, valor")
        .order("id", { ascending: true });

      if (!error && Array.isArray(data)) {
        catalogoCache = data.map((s) => ({
          nome: normalizarNomeServico(s.nome),
          valor: Number(s.valor || 0),
        }));
      }
    } catch (err) {
      console.warn("Falha ao buscar catalogo_servicos:", err);
    }
  }

  return catalogoCache;
}

export async function buscarMenorNumeroLivreReforma() {
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
        .map((r) => parseInt(String(r.numero_os || "").replace(/\D/g, ""), 10))
        .filter((n) => Number.isInteger(n) && n >= 5898),
    );

    let candidato = 5898;
    while (usados.has(candidato)) candidato++;
    return String(candidato);
  } catch {
    return null;
  }
}

export async function buscarMenorNumeroLivreConsertoSolda() {
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
    while (usados.has(candidato)) candidato++;
    return String(candidato);
  } catch {
    return null;
  }
}
