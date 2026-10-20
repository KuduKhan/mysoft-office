import { cp, mkdir, rm, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const check = (file) => {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
};
for (const file of ['src/app.js', 'src/formulas.js', 'src/revisions.js', 'src/file-formats.js', 'src/cloud.js', 'src/cloud-config.js', 'scripts/server.mjs']) check(file);
await access('index.html');
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('index.html', 'dist/index.html');
await cp('src', 'dist/src', { recursive: true });
await cp('assets', 'dist/assets', { recursive: true });
console.log('MySoft Office static build created in dist/');
