import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizedPageSettings,documentGeometry,printPageCSS} from '../src/doc-layout.js';
test('page formats and safe print boundaries',()=>{
  const a=documentGeometry({paper:'A4',margins:'normal'});
  assert.equal(a.width,210);assert.equal(a.height,297);
  assert.ok(a.contentWidth<210);
  const legal=documentGeometry({paper:'Legal',orientation:'landscape',margins:'wide'});
  assert.ok(legal.width>legal.height);
  assert.ok(legal.contentHeight>0);
  assert.match(printPageCSS(legal),/@page\{size:Legal landscape/);
});
test('page settings sanitize untrusted header and footer input',()=>{
  const p=normalizedPageSettings({paper:'unknown',margins:'XX',header:'Hello\nWorld',footer:'a'.repeat(500)});
  assert.equal(p.paper,'A4');assert.equal(p.margins,'normal');
  assert.equal(p.header,'Hello World');assert.equal(p.footer.length,120);
  assert.equal(normalizedPageSettings({background:'url(foo)'}).background,'#ffffff');
});
