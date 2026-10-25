// MySoft Office repository safety gate. Keeps malformed submodule/gitlink
// entries and missing relative source imports from reaching release builds.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const fail = message => { throw new Error('Repository integrity: ' + message); };

function filesIn(folder) {
  return readdirSync(resolve(root, folder), { withFileTypes: true }).flatMap(entry => {
    const path = folder + '/' + entry.name;
    return entry.isDirectory() ? filesIn(path) : entry.isFile() && entry.name.endsWith('.js') ? [path] : [];
  });
}

export function checkRepository({ requireGit = Boolean(process.env.CI) } = {}) {
  for (const required of ['index.html', 'package.json', 'src/app.js', 'src/office-ui.js', 'src/workspace-storage.js']) {
    if (!existsSync(resolve(root, required))) fail('Missing required application file: ' + required);
  }
  let checkedImports = 0;
  for (const path of [...filesIn('src'), ...filesIn('scripts')]) {
    const fullPath = resolve(root, path);
    const source = readFileSync(fullPath, 'utf8');
    // These patterns check literal module specifiers. Node syntax tests and
    // Playwright still validate JavaScript and actual browser resolution.
    const specs = [
      ...source.matchAll(/\bfrom\s*['"]((?:\.\/|\.\.\/)[^'"]+)['"]/g),
      ...source.matchAll(/\bimport\s*\(\s*['"]((?:\.\/|\.\.\/)[^'"]+)['"]\s*\)/g),
      ...source.matchAll(/\bimport\s*['"]((?:\.\/|\.\.\/)[^'"]+)['"]/g),
    ];
    for (const match of specs) {
      const dependency = fileURLToPath(new URL(match[1], pathToFileURL(fullPath)));
      if (!existsSync(dependency)) fail('Missing relative module ' + match[1] + ' referenced by ' + path);
      checkedImports++;
    }
  }
  if (!existsSync(resolve(root, '.git'))) {
    if (requireGit) fail('Git metadata is required in CI to validate gitlink entries.');
    return { checkedImports, gitChecked: false };
  }
  const result = spawnSync('git', ['ls-files', '--stage'], { cwd: root, encoding: 'utf8' });
  if (result.error || result.status !== 0) fail('Cannot inspect Git index: ' + (result.error?.message || result.stderr?.trim() || result.status));
  const links = result.stdout.split(/\r?\n/).filter(line => /^160000\s/.test(line));
  if (links.length) fail('Unconfigured nested repositories/gitlinks are prohibited: ' + links.map(line => line.split('\t').pop()).join(', '));
  return { checkedImports, gitChecked: true };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = checkRepository();
    console.log('Repository integrity passed: ' + report.checkedImports + ' relative imports; Git index ' + (report.gitChecked ? 'clean' : 'not present (source archive)') + '.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
