export function criarControladorPlaca(
  inputEl,
  {
    modo = "mercosul", // "mercosul" (padrão) | "livre"
    maxLen = 7,
    onChange,
  } = {},
) {
  if (!inputEl) return null;

  let modoAtual = modo;
  const padraoMercosul = ["L", "L", "L", "N", "L", "N", "N"];

  function filtrar(raw) {
    const limpa = String(raw || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, maxLen);

    if (modoAtual === "livre") {
      return limpa;
    }

    let out = "";
    for (let i = 0; i < limpa.length && i < padraoMercosul.length; i++) {
      const ch = limpa[i];
      const esperado = padraoMercosul[i];
      if (esperado === "L" && /[A-Z]/.test(ch)) out += ch;
      else if (esperado === "N" && /[0-9]/.test(ch)) out += ch;
    }
    return out;
  }

  function atualizarMode(val) {
    if (modoAtual === "livre") {
      inputEl.inputMode = "text";
      return "LIVRE";
    }

    const len = val.length;
    if (len >= padraoMercosul.length) {
      inputEl.inputMode = "text";
      return "MERCOSUL";
    }

    inputEl.inputMode = padraoMercosul[len] === "L" ? "text" : "numeric";
    return padraoMercosul[len] === "L" ? "LETRA" : "NÚMERO";
  }

  function aplicar() {
    const formatado = filtrar(inputEl.value);
    if (inputEl.value !== formatado) {
      inputEl.value = formatado;
    }
    const dica = atualizarMode(formatado);
    if (typeof onChange === "function") {
      onChange(formatado, dica, modoAtual);
    }
    return { valor: formatado, dica, modo: modoAtual };
  }

  const onInput = () => aplicar();
  const onKeydown = (e) => {
    if (e.key === "Backspace") {
      setTimeout(aplicar, 0);
    }
  };

  inputEl.addEventListener("input", onInput);
  inputEl.addEventListener("keydown", onKeydown);

  return {
    aplicar,
    getModo() {
      return modoAtual;
    },
    setModo(novoModo) {
      modoAtual = novoModo === "livre" ? "livre" : "mercosul";
      return aplicar();
    },
    alternarModo() {
      modoAtual = modoAtual === "mercosul" ? "livre" : "mercosul";
      return aplicar();
    },
    destruir() {
      inputEl.removeEventListener("input", onInput);
      inputEl.removeEventListener("keydown", onKeydown);
    },
  };
}
