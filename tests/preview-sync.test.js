import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function fixture(t){
  const root=mkdtempSync(path.join(tmpdir(),'mysoft preview '));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const origin=path.join(root,'origin.git'), upstream=path.join(root,'upstream'), local=path.join(root,'local checkout');
  function git(cwd,...args){
    const result=spawnSync('git',args,{cwd,encoding:'utf8',env:{...process.env,GIT_AUTHOR_NAME:'Test',GIT_AUTHOR_EMAIL:'test@example.com',GIT_COMMITTER_NAME:'Test',GIT_COMMITTER_EMAIL:'test@example.com'}});
    assert.equal(result.status,0,result.stderr);return result.stdout.trim();
  }
  git(root,'init','--bare',origin);git(root,'clone',origin,upstream);git(upstream,'switch','-c','main');
  mkdirSync(path.join(upstream,'scripts'));
  copyFileSync(new URL('../scripts/sync.mjs',import.meta.url),path.join(upstream,'scripts/sync.mjs'));
  writeFileSync(path.join(upstream,'scripts/server.mjs'),"console.log('PREVIEW_STARTED');");
  writeFileSync(path.join(upstream,'document.txt'),'initial');
  git(upstream,'add','.');git(upstream,'commit','-m','initial');git(upstream,'push','origin','main');
  git(root,'clone','--branch','main',origin,local);
  const run=(preview=false)=>spawnSync(process.execPath,['scripts/sync.mjs',...(preview?['--preview']:[])],{cwd:local,encoding:'utf8'});
  return {git,upstream,local,run};
}

test('preview fast-forwards main from a path with spaces before starting the server',t=>{
  const {git,upstream,local,run}=fixture(t);
  writeFileSync(path.join(upstream,'document.txt'),'updated');
  git(upstream,'commit','-am','update');git(upstream,'push','origin','main');
  const result=run(true);
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/PREVIEW_STARTED/);
  assert.equal(readFileSync(path.join(local,'document.txt'),'utf8'),'updated');
});

test('preview preserves uncommitted work and does not start the server',t=>{
  const {local,run}=fixture(t);
  writeFileSync(path.join(local,'document.txt'),'unsaved work');
  const result=run(true);
  assert.equal(result.status,1);assert.match(result.stderr,/Local changes found/);
  assert.doesNotMatch(result.stdout,/PREVIEW_STARTED/);
  assert.equal(readFileSync(path.join(local,'document.txt'),'utf8'),'unsaved work');
});

test('preview refuses divergent main without resetting local commits',t=>{
  const {git,upstream,local,run}=fixture(t);
  writeFileSync(path.join(local,'local.txt'),'keep me');git(local,'add','.');git(local,'commit','-m','local work');
  const before=git(local,'rev-parse','HEAD');
  writeFileSync(path.join(upstream,'remote.txt'),'remote work');git(upstream,'add','.');git(upstream,'commit','-m','remote work');git(upstream,'push','origin','main');
  const result=run(true);
  assert.equal(result.status,1);assert.doesNotMatch(result.stdout,/PREVIEW_STARTED/);
  assert.equal(git(local,'rev-parse','HEAD'),before);
  assert.equal(readFileSync(path.join(local,'local.txt'),'utf8'),'keep me');
});
