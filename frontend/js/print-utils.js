/**
 * print-utils.js
 * Injeção de espaçadores antes da impressão para evitar que o
 * rodapé fixo (position:fixed) sobreponha o conteúdo em quebras de página.
 *
 * Estratégia:
 *   1. Medir a altura real do rodapé na tela
 *   2. Estimar a altura da página de impressão (A4 proporcional à largura do wrapper)
 *   3. Iterar todos os filhos diretos do <td> de conteúdo
 *   4. Para cada filho que termina dentro da "zona do rodapé" de qualquer página,
 *      inserir um <div> espaçador transparente antes dele para empurrá-lo
 *      para o início da página seguinte
 *   5. No afterprint, remover os espaçadores
 */

(function () {
  const SPACER_CLASS = "pmes-print-spacer";

  // Proporção A4: 297mm altura / 210mm largura ≈ 1.4143
  const A4_RATIO = 297 / 210;

  // Buffer de segurança extra além da altura do rodapé (px)
  const SAFETY_BUFFER = 8;

  function getPageContentHeight() {
    const wrapper = document.querySelector(".print-wrapper");
    if (!wrapper) return null;

    const wrapperWidth = wrapper.getBoundingClientRect().width;
    // Estimativa da altura total da página de impressão
    const pageTotalHeight = wrapperWidth * A4_RATIO;

    // Altura do cabeçalho (thead repete em cada página)
    const header = document.querySelector(".print-header");
    const headerHeight = header ? header.getBoundingClientRect().height : 0;

    // Altura do rodapé
    const footer = document.querySelector(".print-footer-content");
    const footerPaddingTop = 12; // padding-top definido no CSS
    const footerHeight = footer
      ? footer.getBoundingClientRect().height + footerPaddingTop + SAFETY_BUFFER
      : 70 + SAFETY_BUFFER;

    // Margem de impressão padrão do Chrome (~12mm ≈ 45px cada lado)
    const PAGE_MARGIN = 45;

    // Área de conteúdo disponível por página
    const contentHeight = pageTotalHeight - PAGE_MARGIN * 2 - headerHeight;

    return { contentHeight, footerHeight };
  }

  function injectSpacers() {
    // Limpar espaçadores anteriores se existirem
    removeSpacers();

    const dims = getPageContentHeight();
    if (!dims) return;

    const { contentHeight, footerHeight } = dims;
    const footerZoneStart = contentHeight - footerHeight;

    const bodyTd = document.querySelector(".print-body > tr > td");
    if (!bodyTd) return;

    const tdTop = bodyTd.getBoundingClientRect().top + window.scrollY;
    const children = Array.from(bodyTd.children);

    // Iteramos de trás para frente para que os espaçadores inseridos
    // não afetem o cálculo dos anteriores
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child.classList.contains(SPACER_CLASS)) continue;

      const childBottom =
        child.getBoundingClientRect().bottom + window.scrollY - tdTop;

      // Em qual página está o fundo deste elemento?
      const pageIndex = Math.floor(childBottom / contentHeight);
      // Onde dentro da página está o fundo do elemento?
      const posInPage = childBottom - pageIndex * contentHeight;

      // Se cai na zona do rodapé, precisamos empurrá-lo para a próxima página
      if (posInPage > footerZoneStart) {
        const spacerHeight = contentHeight - posInPage + SAFETY_BUFFER;
        const spacer = document.createElement("div");
        spacer.className = SPACER_CLASS;
        spacer.style.cssText = `
          height: ${spacerHeight}px;
          display: block;
          visibility: hidden;
          pointer-events: none;
        `;
        bodyTd.insertBefore(spacer, child);
      }
    }
  }

  function removeSpacers() {
    document.querySelectorAll("." + SPACER_CLASS).forEach((el) => el.remove());
  }

  window.addEventListener("beforeprint", injectSpacers);
  window.addEventListener("afterprint", removeSpacers);
})();
