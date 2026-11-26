import { painelDb } from "./painel-db.js";

const el = (id) => document.getElementById(id);

function setLog(msg, erro = false) {
  const box = el("statusBox");
  box.textContent = msg;
  box.style.color = erro ? "#f87171" : "#10b981";
}

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

async function atualizarResumoLocal() {
  try {
    const todos = await painelDb.ordens_servico.toArray();
    let totalFotos = 0;
    for (const os of todos) {
      if (Array.isArray(os.fotos_cache)) {
        totalFotos += os.fotos_cache.filter(
          (f) => f?.blob instanceof Blob,
        ).length;
      }
    }
    el("resumoLocal").textContent =
      `${todos.length} OS · ${totalFotos} foto(s) em Blob no OsPainelDB`;
  } catch (err) {
    el("resumoLocal").textContent = "Não foi possível ler o OsPainelDB.";
    console.error(err);
  }
}

async function exportarBanco() {
  const btn = el("btnExportar");
  btn.disabled = true;
  setLog("Preparando backup do OsPainelDB (convertendo fotos)...");

  try {
    const todos = await painelDb.ordens_servico.toArray();
    if (!todos.length) {
      setLog("O OsPainelDB está vazio. Nada para exportar.", true);
      return;
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

      if ((i + 1) % 25 === 0 || i === todos.length - 1) {
        setLog(`Processando OS ${i + 1} de ${todos.length}...`);
      }
    }

    const pacote = {
      app: "OsPainelDB",
      versao: 1,
      exportado_em: new Date().toISOString(),
      total: registros.length,
      registros,
    };

    const jsonBlob = new Blob([JSON.stringify(pacote)], {
      type: "application/json",
    });
    const urlDownload = URL.createObjectURL(jsonBlob);
    const dataStr = new Date().toISOString().slice(0, 10);

    const a = document.createElement("a");
    a.href = urlDownload;
    a.download = `ospaineldb-backup-${dataStr}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(urlDownload), 5000);
    setLog(`Backup exportado com sucesso: ${registros.length} OS.`);
  } catch (err) {
    console.error("Erro ao exportar:", err);
    setLog("Erro ao exportar backup: " + (err.message || err), true);
  } finally {
    btn.disabled = false;
  }
}

async function importarBanco(arquivo) {
  if (!arquivo) return;
  const btn = el("btnImportar");
  btn.disabled = true;
  setLog("Lendo arquivo de backup...");

  try {
    const texto = await arquivo.text();
    const parsed = JSON.parse(texto);

    if (parsed?.app !== "OsPainelDB" || !Array.isArray(parsed?.registros)) {
      throw new Error("Arquivo inválido: não é um backup do OsPainelDB.");
    }

    const lista = parsed.registros;
    if (!lista.length) {
      setLog("O arquivo não contém nenhuma OS.", true);
      return;
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

      if ((i + 1) % 25 === 0 || i === lista.length - 1) {
        setLog(`Restaurando OS ${i + 1} de ${lista.length}...`);
      }
    }

    await painelDb.ordens_servico.bulkPut(prontos);
    await atualizarResumoLocal();
    setLog(
      `Importação concluída: ${prontos.length} OS gravadas no OsPainelDB.`,
    );
  } catch (err) {
    console.error("Erro ao importar:", err);
    setLog("Erro ao importar backup: " + (err.message || err), true);
  } finally {
    btn.disabled = false;
    el("inputArquivo").value = "";
  }
}

el("btnExportar").addEventListener("click", exportarBanco);
el("btnImportar").addEventListener("click", () => el("inputArquivo").click());
el("inputArquivo").addEventListener("change", (e) =>
  importarBanco(e.target.files?.[0]),
);

atualizarResumoLocal();
