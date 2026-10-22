import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Resolve from this file, including when the checkout directory contains spaces.
const root=fileURLToPath(new URL('..',import.meta.url));
function git(...args){
  const result=spawnSync('git',args,{cwd:root,encoding:'utf8'});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(result.stderr.trim()||result.stdout.trim()||`git ${args[0]} failed`);
  return result.stdout.trim();
}
try{
  if(git('status','--porcelain'))throw new Error('Local changes found. Commit or stash your work before syncing. Nothing was overwritten.');
  git('fetch','origin','main');
  git('switch','main');
  git('merge','--ff-only','origin/main');
  console.log(`MySoft Office main synced at ${git('rev-parse','--short','HEAD')}.`);
  if(process.argv.includes('--preview'))await import('./server.mjs');
}catch(error){
  console.error(`Preview sync stopped: ${error.message}`);
  console.error('Resolve the Git issue and retry npm run preview. To preview your current files without syncing, use npm run dev.');
  process.exitCode=1;
}
