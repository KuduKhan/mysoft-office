import test from 'node:test';
import assert from 'node:assert/strict';
import {studioShortcut,studioShortcutLabel} from '../src/studio-shortcuts.js';
test('standard studio keyboard shortcuts resolve consistently',()=>{
  assert.equal(studioShortcut({ctrlKey:true,key:'k'}),'command-search');
  assert.equal(studioShortcut({metaKey:true,key:'S'}),'save');
  assert.equal(studioShortcut({ctrlKey:true,shiftKey:true,key:'E'}),'export');
  assert.equal(studioShortcut({ctrlKey:true,shiftKey:true,key:'n'}),'new-file');
  assert.equal(studioShortcut({ctrlKey:true,altKey:true,key:'s'}),null);
  assert.equal(studioShortcut({key:'s'}),null);
  assert.equal(studioShortcutLabel('command-search',true),'⌘+K');
});
