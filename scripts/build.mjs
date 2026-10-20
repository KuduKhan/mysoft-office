import { cp, mkdir, rm, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const check = (file) => {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
};
for (const file of ['src/app.js', 'src/formulas.js', 'src/revisions.js', 'src/file-formats.js', 'src/cloud.js', 'src/cloud-config.js', 'src/office-model.js', 'src/office-ui.js', 'src/sheet-window.js', 'src/sheet-grid.js', 'src/document-history.js', 'src/ooxml-zip.js', 'src/ooxml-docx.js', 'src/ooxml-xlsx.js', 'src/ooxml-pptx.js', 'src/studio-tools.js', 'src/sheet-range.js', 'src/slide-objects.js', 'src/note-structure.js', 'src/doc-review.js', 'src/doc-layout.js', 'src/sheet-audit.js', 'src/slide-align.js', 'src/note-search.js', 'src/doc-blocks.js', 'src/sheet-recalc.js', 'src/slide-layers.js', 'src/sheet-rules.js', 'src/doc-find.js', 'src/note-pin.js', 'src/slide-transform.js', 'scripts/server.mjs']) check(file);
await access('index.html');
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('index.html', 'dist/index.html');
await cp('src', 'dist/src', { recursive: true });
await cp('assets', 'dist/assets', { recursive: true });
console.log('MySoft Office static build created in dist/');
