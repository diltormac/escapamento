import { painelDb } from "./painel-db.js";
import { uiPedirSenha } from "./ui-alerta.js";

const SENHA_BACKUP = "1234"; // Altere para a senha desejada
const CHAVE_ULTIMO_BACKUP = "ospaineldb_ultimo_backup_em";

function blobParaDataUrl(blob) {
  return new Promise((resolve, reject) => {
    if (!(blob instanceof Blob)) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlParaBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const resp = await fetch(dataUrl);
  return await resp.blob();
}

export function obterUltimoBackupTexto() {
  const iso = localStorage.getItem(CHAVE_ULTIMO_BACKUP);
  if (!iso) return "Nenhum backup registrado neste aparelho.";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime()))
    return "Nenhum backup registrado neste aparelho.";
  return `Último backup gerado: ${dt.toLocaleString("pt-BR")}`;
}

export function solicitarSenhaBackup(acaoTexto = "continuar") {
  return uiPedirSenha(acaoTexto, SENHA_BACKUP);
}

export async function exportarBackupComSenha(onProgresso = null) {
  const autorizado = await solicitarSenhaBackup("gerar o backup");
  if (!autorizado) {
    return { ok: false, cancelado: true };
  }

  const todos = await painelDb.ordens_servico.toArray();
  if (!todos.length) {
    return { ok: false, erro: "O OsPainelDB está vazio. Nada para exportar." };
  }

  const registros = [];
  for (let i = 0; i < todos.length; i++) {
    const os = todos[i];
    const fotosCache = Array.isArray(os.fotos_cache) ? os.fotos_cache : [];
    const fotosSerializadas = [];

    for (const f of fotosCache) {
      const blobBase64 =
        f?.blob instanceof Blob ? await blobParaDataUrl(f.blob) : null;
      fotosSerializadas.push({
        url: f?.url || "",
        blobBase64,
      });
    }

    registros.push({
      ...os,
      fotos_cache: fotosSerializadas,
    });

    if (
      typeof onProgresso === "function" &&
      ((i + 1) % 20 === 0 || i === todos.length - 1)
    ) {
      onProgresso(`Preparando OS ${i + 1} de ${todos.length}...`);
    }
  }

  const agoraIso = new Date().toISOString();
  const pacote = {
    app: "OsPainelDB",
    versao: 1,
    exportado_em: agoraIso,
    total: registros.length,
    registros,
  };

  const jsonBlob = new Blob([JSON.stringify(pacote)], {
    type: "application/json",
  });
  const urlDownload = URL.createObjectURL(jsonBlob);
  const dataStr = agoraIso.slice(0, 10);

  const a = document.createElement("a");
  a.href = urlDownload;
  a.download = `ospaineldb-backup-${dataStr}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(urlDownload), 5000);
  localStorage.setItem(CHAVE_ULTIMO_BACKUP, agoraIso);

  return { ok: true, total: registros.length };
}

export async function restaurarBackupArquivo(arquivo, onProgresso = null) {
  if (!arquivo) return { ok: false, erro: "Nenhum arquivo selecionado." };

  const texto = await arquivo.text();
  const parsed = JSON.parse(texto);

  if (parsed?.app !== "OsPainelDB" || !Array.isArray(parsed?.registros)) {
    throw new Error("Arquivo inválido: não é um backup do OsPainelDB.");
  }

  const lista = parsed.registros;
  if (!lista.length) {
    return { ok: false, erro: "O arquivo de backup não contém registros." };
  }

  const prontos = [];
  for (let i = 0; i < lista.length; i++) {
    const os = lista[i];
    const fotosSerializadas = Array.isArray(os.fotos_cache)
      ? os.fotos_cache
      : [];
    const fotosCache = [];

    for (const f of fotosSerializadas) {
      const blob = f?.blobBase64 ? await dataUrlParaBlob(f.blobBase64) : null;
      fotosCache.push({
        url: f?.url || "",
        blob,
      });
    }

    prontos.push({
      ...os,
      fotos_cache: fotosCache,
      importado_em: new Date().toISOString(),
    });

    if (
      typeof onProgresso === "function" &&
      ((i + 1) % 20 === 0 || i === lista.length - 1)
    ) {
      onProgresso(`Restaurando OS ${i + 1} de ${lista.length}...`);
    }
  }

  await painelDb.ordens_servico.bulkPut(prontos);
  return { ok: true, importados: prontos.length };
}
