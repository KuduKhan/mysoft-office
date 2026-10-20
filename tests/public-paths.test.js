import test from 'node:test';
import assert from 'node:assert/strict';
import {isPublicPath} from '../scripts/public-paths.mjs';

test('local server exposes app files and normal assets',()=>{
  for(const path of ['/','/index.html','/src/app.js','/src/office-ui.js','/src/workspace-storage.js','/src/studio-refinement.css','/assets/favicon.svg']){
    assert.equal(isPublicPath(path),true,path);
  }
});

test('local server denies hidden, internal and sensitive files',()=>{
  for(const path of ['/.git/config','/.git/HEAD','/package.json','/.env.local','/supabase/schema.sql','/tests/workspace-storage.test.js','/scripts/server.mjs','/src/../.git/config','/src/secrets.json','/src/app.js.map','/assets/../../.env','/README.md']){
    assert.equal(isPublicPath(path),false,path);
  }
});
