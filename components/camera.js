export async function comprimirImagemWeb(arquivo, opcoes = {}) {
  const {
    maxOriginal = 1024,
    qualidadeOriginal = 0.7,
    maxMini = 300,
    qualidadeMini = 0.6,
  } = opcoes;

  // 1. Tenta usar o plugin nativo (Super rápido)
  if (window.FileCompressor) {
    try {
      const result = await window.FileCompressor.compressImage({
        blob: arquivo,
        width: maxOriginal,
        quality: qualidadeOriginal,
        mimeType: "image/jpeg",
      });

      const blobOriginal = result.blob;
      const fileOriginal = new File(
        [blobOriginal],
        arquivo.name.replace(/\.[^/.]+$/, ".jpg"),
        { type: "image/jpeg" },
      );

      const blobMini = await gerarMiniaturaRapida(
        fileOriginal,
        maxMini,
        qualidadeMini,
      );

      return {
        original: fileOriginal,
        miniatura: new File(
          [blobMini],
          arquivo.name.replace(/\.[^/.]+$/, "_thumb.jpg"),
          { type: "image/jpeg" },
        ),
        blobMini,
      };
    } catch (e) {
      console.warn("Erro no plugin nativo, caindo para Canvas", e);
    }
  }

  // 2. Fallback Canvas
  return new Promise((resolve, reject) => {
    if (!arquivo.type || !arquivo.type.startsWith("image/")) {
      return reject(new Error("O arquivo não é uma imagem válida."));
    }

    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.src = url;

    img.onload = () => {
      try {
        const { canvas: canvasOriginal } = redimensionar(img, maxOriginal);
        canvasOriginal.toBlob(
          (blobOriginal) => {
            if (!blobOriginal)
              return reject(new Error("Falha ao gerar original."));
            const fileOriginal = new File(
              [blobOriginal],
              arquivo.name.replace(/\.[^/.]+$/, ".jpg"),
              { type: "image/jpeg" },
            );

            const { canvas: canvasMini } = redimensionar(img, maxMini);
            canvasMini.toBlob(
              (blobMini) => {
                if (!blobMini)
                  return reject(new Error("Falha ao gerar miniatura."));
                const fileMini = new File(
                  [blobMini],
                  arquivo.name.replace(/\.[^/.]+$/, "_thumb.jpg"),
                  { type: "image/jpeg" },
                );

                URL.revokeObjectURL(url);
                resolve({
                  original: fileOriginal,
                  miniatura: fileMini,
                  blobMini,
                });
              },
              "image/jpeg",
              qualidadeMini,
            );
          },
          "image/jpeg",
          qualidadeOriginal,
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao carregar a imagem."));
    };
  });
}

function gerarMiniaturaRapida(file, maxLado, qualidade) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      const { canvas } = redimensionar(img, maxLado);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(blob);
        },
        "image/jpeg",
        qualidade,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao gerar miniatura."));
    };
  });
}

function redimensionar(img, maxLado) {
  let largura = img.width;
  let altura = img.height;

  if (largura > altura) {
    if (largura > maxLado) {
      altura = Math.round((altura * maxLado) / largura);
      largura = maxLado;
    }
  } else {
    if (altura > maxLado) {
      largura = Math.round((largura * maxLado) / altura);
      altura = maxLado;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, largura, altura);

  return { canvas, largura, altura };
}
