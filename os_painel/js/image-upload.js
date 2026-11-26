import { comprimirImagemWeb } from "./camera.js";

(function () {
  const style = document.createElement("style");
  style.textContent = `
    .iu-container { width: 100%; margin-bottom: 16px; }
    .iu-upload-btn {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      width: 100%; height: 70px; border: 2px dashed #7386a6; border-radius: 16px;
      background: rgba(9,18,32,.42); color: #f2f5fa; cursor: pointer; transition: border-color 0.2s;
    }
    .iu-upload-btn:hover { border-color: #ffc400; }
    .iu-upload-btn svg { width: 26px; height: 26px; color: #ffc400; flex-shrink: 0; }
    .iu-upload-text { text-align: left; }
    .iu-upload-text strong { font-size: 16px; display: block; }
    .iu-upload-text small { color: #aebbd0; font-size: 13px; }

    .iu-loading { display: none; align-items: center; justify-content: center; gap: 10px; height: 70px; color: #ffc400; font-weight: bold; }
    .iu-spinner { width: 20px; height: 20px; border: 3px solid rgba(255,196,0,0.3); border-top-color: #ffc400; border-radius: 50%; animation: iu-spin 0.8s linear infinite; }
    @keyframes iu-spin { to { transform: rotate(360deg); } }

    .iu-previews { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
    .iu-preview-item { position: relative; aspect-ratio: 1; border-radius: 10px; overflow: hidden; border: 1px solid #42516a; }
    .iu-preview-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .iu-remove-btn { position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; border-radius: 50%; border: 0; background: rgba(5,11,21,.78); color: #fff; display: grid; place-items: center; cursor: pointer; padding: 0; transition: transform 0.1s; }
    .iu-remove-btn:active { transform: scale(0.9); }
    .iu-remove-btn svg { width: 14px; height: 14px; }
    .iu-size-badge { position: absolute; bottom: 4px; left: 4px; background: rgba(5,11,21,.78); color: #4ade80; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
  `;
  document.head.appendChild(style);

  const iconCamera = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
  const iconX = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

  window.ImageUpload = {
    init: function (containerId, options = {}) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const maxImages =
        Number(options.maxImages) > 0 ? Number(options.maxImages) : 6;
      const existenteCount =
        Number(options.existingCount) > 0 ? Number(options.existingCount) : 0;
      let images = [];

      container.innerHTML = `
        <div class="iu-container">
          <input type="file" class="iu-file-input" accept="image/*" capture="environment" multiple style="display: none;">
          <button class="iu-upload-btn" type="button">
            ${iconCamera}
            <div class="iu-upload-text">
              <strong>Adicionar Fotos</strong>
              <small class="iu-subtitle">Até ${maxImages} fotos</small>
            </div>
          </button>
          <div class="iu-loading" style="display:none;">
            <div class="iu-spinner"></div>
            <span class="iu-loading-text">Comprimindo imagem...</span>
          </div>
          <div class="iu-previews"></div>
        </div>
      `;

      const btnTrigger = container.querySelector(".iu-upload-btn");
      const fileInput = container.querySelector(".iu-file-input");
      const loading = container.querySelector(".iu-loading");
      const loadingText = container.querySelector(".iu-loading-text");
      const previews = container.querySelector(".iu-previews");
      const subtitle = container.querySelector(".iu-subtitle");

      const formatSize = (bytes) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
      };

      const totalAtual = () => existenteCount + images.length;

      const render = () => {
        if (totalAtual() >= maxImages) {
          btnTrigger.style.display = "none";
        } else {
          btnTrigger.style.display = "flex";
          subtitle.textContent =
            totalAtual() > 0
              ? `${totalAtual()} de ${maxImages} adicionadas`
              : `Até ${maxImages} fotos`;
        }

        previews.innerHTML = images
          .map(
            (img, index) => `
          <div class="iu-preview-item">
            <img src="${img.previewUrl}" alt="Foto ${index + 1}">
            <span class="iu-size-badge">${img.size}</span>
            <button type="button" class="iu-remove-btn" data-index="${index}" aria-label="Remover foto ${index + 1}">${iconX}</button>
          </div>
        `,
          )
          .join("");

        previews.querySelectorAll(".iu-remove-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const index = parseInt(e.currentTarget.dataset.index, 10);
            URL.revokeObjectURL(images[index].previewUrl);
            images.splice(index, 1);
            render();
            notifyChange();
          });
        });
      };

      const notifyChange = () => {
        const filesOnly = images.map((img) => img.file);
        document.dispatchEvent(
          new CustomEvent("images-change", { detail: filesOnly }),
        );
      };

      const processFiles = async (files) => {
        const filesArray = Array.from(files).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (filesArray.length === 0) return;

        btnTrigger.style.display = "none";
        loading.style.display = "flex";

        try {
          for (let i = 0; i < filesArray.length; i++) {
            if (totalAtual() >= maxImages) break;

            loadingText.textContent = `Comprimindo ${i + 1} de ${filesArray.length}...`;

            const { original, blobMini } = await comprimirImagemWeb(
              filesArray[i],
              {
                maxOriginal: 1024,
                qualidadeOriginal: 0.7,
                maxMini: 300,
                qualidadeMini: 0.6,
              },
            );

            const previewUrl = URL.createObjectURL(blobMini);

            images.push({
              file: original,
              blobMini,
              previewUrl,
              size: formatSize(original.size),
              sizeBytes: original.size,
            });
          }

          render();
          notifyChange();
        } catch (error) {
          console.error("Erro ao comprimir imagem:", error);
          if (window.CustomAlert) {
            window.CustomAlert.show(
              "Ocorreu um erro ao processar a imagem. Detalhes: " +
                (error.message || error),
              "erro",
            );
          }
        } finally {
          loading.style.display = "none";
          render();
        }
      };

      btnTrigger.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", (e) => {
        processFiles(e.target.files);
        fileInput.value = "";
      });

      render();

      return {
        getImages: () => images.map((img) => img.file),
        getMiniaturas: () => images.map((img) => img.blobMini),
      };
    },
  };
})();
