/* Renders math with the self-hosted KaTeX. Loaded only on pages that contain math.
   Without JavaScript the TeX source stays visible, so the page is still readable. */
(function () {
  "use strict";
  if (typeof window.renderMathInElement !== "function") return;
  var blocks = document.querySelectorAll(".arithmatex");
  for (var i = 0; i < blocks.length; i++) {
    window.renderMathInElement(blocks[i], {
      delimiters: [
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true }
      ],
      throwOnError: false
    });
  }
})();
