# Bundled PDF dependencies

- **Mozilla PDF.js 6.4.299**, legacy browser display library and worker from `pdfjs-dist`, Apache-2.0. See `pdfjs/LICENSE` and the licenses retained in `pdfjs/standard_fonts/`.
- **pdf-lib 1.17.1**, browser UMD build from `pdf-lib`, MIT. See `pdf-lib-LICENSE.md`.

Sources: https://mozilla.github.io/pdf.js/ and https://pdf-lib.js.org/ . The original published npm distributions are vendored so the app needs no PDF CDN or remote document service. Only the display library, worker, character maps and standard fonts are shipped. PDF JavaScript evaluation, XFA and WebAssembly decoding are disabled.
