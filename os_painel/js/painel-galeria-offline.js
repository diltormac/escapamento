import { painelDb } from "./painel-db.js";
import { osCache } from "./os-cache.js";

function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

function blobParaDataUrl(blob) {
  return new Promise((resolve) => {
    if (!(blob instanceof Blob) || blob.size === 0) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(blob);
  });
}

function abrirBancoGaleriaOffline() {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }

    const req = indexedDB.open("GaleriaOSFacil");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function lerFotosDaGaleriaOSFacil() {
  const db = await abrirBancoGaleriaOffline();
  if (!db) return [];

  try {
    if (!db.objectStoreNames.contains("fotos")) return [];

    return await new Promise((resolve) => {
      const tx = db.transaction("fotos", "readonly");
      const store = tx.objectStore("fotos");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } finally {
    db.close();
  }
}

export function criarGaleriaOffline({
  overlayId = "galeriaOfflineOverlay",
  onAbrirLightbox,
  onAbrirOS,
  onAviso,
} = {}) {
  const dataUrlCache = new Map();
  let fotosAtuais = [];

  function limparUrls() {
    dataUrlCache.clear();
  }

  function getOverlay() {
    let overlay = document.getElementById(overlayId);
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = overlayId;
      overlay.className = "modal-backdrop galeria-offline-backdrop";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.innerHTML = `
        <div class="modal-box galeria-offline-box">
          <div class="modal-top">
            <div>
              <h2>Galeria Offline</h2>
              <small id="galeriaOfflineSubtitulo" class="mono">0 fotos</small>
            </div>
            <button class="btn-close" id="btnFecharGaleriaOffline" type="button" aria-label="Fechar galeria">×</button>
          </div>
          <div id="galeriaOfflineGrid" class="galeria-offline-grid"></div>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.addEventListener("click", (e) => {
        if (e.target.id === overlayId) fechar();
      });

      overlay
        .querySelector("#btnFecharGaleriaOffline")
        ?.addEventListener("click", fechar);
    }
    return overlay;
  }

  function estaAberta() {
    return Boolean(getOverlay()?.classList.contains("aberto"));
  }

  function fechar() {
    const overlay = document.getElementById(overlayId);
    if (overlay) overlay.classList.remove("aberto");
  }

  async function obterRegistrosLocais() {
    if (osCache && typeof osCache.listarOffline === "function") {
      return await osCache.listarOffline();
    }
    if (
      painelDb?.ordens_servico &&
      typeof painelDb.ordens_servico.toArray === "function"
    ) {
      return await painelDb.ordens_servico.toArray();
    }
    return [];
  }

  async function extrairFotosDeRegistro(os) {
    const lista = [];
    const fotosCache = Array.isArray(os?.fotos_cache) ? os.fotos_cache : [];

    for (const f of fotosCache) {
      if (f?.blob instanceof Blob && f.blob.size > 0) {
        const chave =
          f.url ||
          `${os?.id ?? os?.uuid_local ?? ""}_${f.blob.size}_${f.blob.type}`;

        let src = dataUrlCache.get(chave);
        if (!src) {
          src = await blobParaDataUrl(f.blob);
          if (src) dataUrlCache.set(chave, src);
        }

        if (src) {
          lista.push({
            src,
            disponivelOffline: true,
            urlRemota: f.url || "",
            osId: os?.id ?? os?.uuid_local ?? "",
            cliente: os?.nome || "CONSUMIDOR",
          });
          continue;
        }
      }

      if (typeof f?.src === "string" && f.src.startsWith("data:image/")) {
        lista.push({
          src: f.src,
          disponivelOffline: true,
          urlRemota: f.url || "",
          osId: os?.id ?? os?.uuid_local ?? "",
          cliente: os?.nome || "CONSUMIDOR",
        });
      } else if (f?.url && navigator.onLine) {
        lista.push({
          src: f.url,
          disponivelOffline: false,
          urlRemota: f.url,
          osId: os?.id ?? os?.uuid_local ?? "",
          cliente: os?.nome || "CONSUMIDOR",
        });
      }
    }

    return lista;
  }

  function atualizarContador(totalVisivel) {
    const subtitulo = document.getElementById("galeriaOfflineSubtitulo");
    if (subtitulo) {
      subtitulo.textContent = `${totalVisivel} foto(s) no banco local`;
    }
  }

  function renderizarGrade(fotos) {
    const overlay = getOverlay();
    const grid = overlay.querySelector("#galeriaOfflineGrid");
    if (!grid) return;

    atualizarContador(fotos.length);

    grid.innerHTML = fotos
      .map((item, idx) => {
        const legenda = [
          item.osId ? `OS #${esc(item.osId)}` : "",
          item.cliente ? esc(item.cliente) : "",
        ]
          .filter(Boolean)
          .join(" · ");

        const temLink = legenda && typeof onAbrirOS === "function";
        const legendaHtml = legenda
          ? `<span class="galeria-offline-legenda mono" style="cursor:${temLink ? "pointer" : "default"};display:inline-block; margin-top:4px;" data-idx="${idx}" data-os-id="${esc(item.osId)}">${legenda} ${temLink ? "🔗" : ""}</span>`
          : "";

        return `
          <div class="galeria-offline-item" data-idx="${idx}" title="${legenda}">
            <button type="button" class="galeria-offline-foto-btn" data-idx="${idx}" data-os-id="${esc(item.osId)}" style="all:unset;cursor:pointer;display:block;width:100%">
              <img src="${esc(item.src)}" alt="Foto ${idx + 1}" loading="lazy" />
            </button>
            ${legendaHtml}
          </div>
        `;
      })
      .join("");

    // Evento de clique na FOTO
    grid.querySelectorAll(".galeria-offline-foto-btn").forEach((btn) => {
      const img = btn.querySelector("img");
      img?.addEventListener("error", () => {
        btn.closest(".galeria-offline-item")?.remove();
        atualizarContador(
          grid.querySelectorAll(".galeria-offline-item").length,
        );
      });

      btn.addEventListener("click", async () => {
        const idx = Number(btn.dataset.idx);
        const item = fotosAtuais[Number.isNaN(idx) ? 0 : idx];
        const osId = item?.osId || btn.dataset.osId || "";
        let abriuOS = false;

        // Tenta abrir a OS
        if (osId && typeof onAbrirOS === "function") {
          fechar(); // Fecha a galeria
          abriuOS = await onAbrirOS(osId);
        }

        // Se não conseguiu abrir a OS (ou se a foto não tem OS), abre o lightbox!
        if (!abriuOS && typeof onAbrirLightbox === "function") {
          // Se a galeria foi fechada, reabre para o lightbox ter contexto
          if (osId) renderizarGrade(fotosAtuais);

          onAbrirLightbox(fotosAtuais, Number.isNaN(idx) ? 0 : idx);
        }
      });
    });

    // Evento de clique na LEGENDA
    if (typeof onAbrirOS === "function") {
      grid.querySelectorAll(".galeria-offline-legenda").forEach((span) => {
        span.addEventListener("click", async (e) => {
          e.stopPropagation();
          const idx = Number(span.dataset.idx);
          const item = fotosAtuais[Number.isNaN(idx) ? 0 : idx];
          const osId = item?.osId || span.dataset.osId || "";

          if (osId) {
            fechar();
            const abriu = await onAbrirOS(osId);
            if (!abriu) renderizarGrade(fotosAtuais); // Se não achou, mantém a galeria
          }
        });
      });
    }

    overlay.classList.add("aberto");
  }

  async function abrirGaleriaOffline() {
    const todasFotos = [];
    const vistos = new Set();

    const fotosGaleria = await lerFotosDaGaleriaOSFacil();
    for (const item of fotosGaleria) {
      if (
        typeof item?.dataUrl === "string" &&
        item.dataUrl.startsWith("data:image/") &&
        !vistos.has(item.dataUrl)
      ) {
        vistos.add(item.dataUrl);
        todasFotos.push({
          src: item.dataUrl,
          disponivelOffline: true,
          urlRemota: item.url || "",
          // AQUI ESTÁ O AJUSTE DO ID (LIMPA O ID DEIXANDO SÓ NÚMEROS)
          osId: String(item.os || item.id || "")
            .replace(/[^0-9]/g, "")
            .trim(),
          cliente: item.nome || "CONSUMIDOR",
        });
      }
    }

    const registros = await obterRegistrosLocais();
    const TAMANHO_LOTE = 25;
    for (let i = 0; i < registros.length; i += TAMANHO_LOTE) {
      const lote = registros.slice(i, i + TAMANHO_LOTE);
      const resultadosLote = await Promise.all(
        lote.map((os) => extrairFotosDeRegistro(os)),
      );
      for (const fotosOs of resultadosLote) {
        for (const foto of fotosOs) {
          if (foto.src && !vistos.has(foto.src)) {
            vistos.add(foto.src);
            todasFotos.push(foto);
          }
        }
      }
    }

    if (!todasFotos.length) {
      if (typeof onAviso === "function") {
        await onAviso(
          "Galeria offline",
          "Nenhuma imagem salva localmente foi encontrada no banco offline.",
          "aviso",
        );
      }
      return;
    }

    fotosAtuais = todasFotos;
    renderizarGrade(fotosAtuais);
  }

  return {
    abrirGaleriaOffline,
    estaAberta,
    fechar,
    limparUrls,
  };
}
