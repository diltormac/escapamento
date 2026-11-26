export function criarLightboxPainel({
  overlayId = "lightboxOverlay",
  imgId = "lightboxImg",
  legendaId = "lightboxLegenda",
  btnFecharId = "btnLightboxFechar",
  btnPrevId = "btnLightboxPrev",
  btnNextId = "btnLightboxNext",
  onFechar,
} = {}) {
  const getOverlay = () => document.getElementById(overlayId);
  const getImg = () => document.getElementById(imgId);
  const getLegenda = () => document.getElementById(legendaId);
  const getPrev = () => document.getElementById(btnPrevId);
  const getNext = () => document.getElementById(btnNextId);

  let fotos = [];
  let indice = 0;

  function estaAberto() {
    return Boolean(getOverlay()?.classList.contains("aberto"));
  }

  function renderizar() {
    const total = fotos.length;
    const item = fotos[indice];
    const imgEl = getImg();
    const legEl = getLegenda();
    const prevBtn = getPrev();
    const nextBtn = getNext();

    if (!item || !imgEl || !legEl) return;

    imgEl.src = item.src;
    const extraInfo = [
      item.cliente ? `${item.cliente}` : "",
      item.osId ? `OS #${item.osId}` : "",
      item.disponivelOffline ? "Local (OsPainelDB)" : "",
    ]
      .filter(Boolean)
      .join(" · ");

    legEl.textContent = `Foto ${indice + 1} de ${total}${
      extraInfo ? ` · ${extraInfo}` : ""
    }`;

    const mostrarNav = total > 1;
    if (prevBtn) prevBtn.style.visibility = mostrarNav ? "visible" : "hidden";
    if (nextBtn) nextBtn.style.visibility = mostrarNav ? "visible" : "hidden";
  }

  function abrir(fotosValidas, indiceInicial = 0) {
    const overlay = getOverlay();
    if (!overlay || !Array.isArray(fotosValidas) || fotosValidas.length === 0) {
      return;
    }

    fotos = fotosValidas;
    indice = Math.max(0, Math.min(indiceInicial, fotos.length - 1));
    renderizar();
    overlay.classList.add("aberto");
  }

  function fechar() {
    const overlay = getOverlay();
    const imgEl = getImg();
    if (overlay) overlay.classList.remove("aberto");
    if (imgEl) imgEl.src = "";
    fotos = [];
    indice = 0;
    if (typeof onFechar === "function") onFechar();
  }

  function navegar(delta) {
    const total = fotos.length;
    if (total <= 1) return;
    indice = (indice + delta + total) % total;
    renderizar();
  }

  document.getElementById(btnFecharId)?.addEventListener("click", fechar);
  getPrev()?.addEventListener("click", () => navegar(-1));
  getNext()?.addEventListener("click", () => navegar(1));

  getOverlay()?.addEventListener("click", (e) => {
    if (e.target.id === overlayId) fechar();
  });

  return {
    abrir,
    fechar,
    navegar,
    estaAberto,
  };
}
