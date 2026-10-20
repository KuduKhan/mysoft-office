import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureWorkbook,addSheet,switchSheet,renameSheet,duplicateSheet,deleteSheet,setCellStyle,sortSheet,sheetChartData,wordStatistics} from '../src/office-model.js';
test('old v0.2 spreadsheet upgrades without losing cells',()=>{
  const file={type:'sheets',cells:{A1:'Header',B2:'42'}};
  ensureWorkbook(file);
  assert.equal(file.worksheets[0].cells.B2,'42');
  addSheet(file);
  file.cells.A1='Separate';
  switchSheet(file,0);
  assert.equal(file.cells.A1,'Header');
  switchSheet(file,1);
  assert.equal(file.cells.A1,'Separate');
});
test('rename, duplicate, style and delete sheets',()=>{
  const f={type:'sheets',cells:{A1:'Five'}};
  ensureWorkbook(f);renameSheet(f,'Revenue');
  duplicateSheet(f);
  assert.equal(f.worksheets.length,2);
  assert.equal(f.cells.A1,'Five');
  setCellStyle(f,'A1','bold',true);
  assert.equal(f.cellStyles.A1.bold,true);
  deleteSheet(f);
  assert.equal(f.worksheets.length,1);
  assert.throws(()=>deleteSheet(f));
});
test('sort preserves headers and refuses formula corruption',()=>{
  const f={type:'sheets',cells:{A1:'Item',B1:'Value',A2:'Zebra',B2:'2',A3:'Apple',B3:'4'}};
  setCellStyle(f,'B3','bold',true);
  sortSheet(f,'A','asc');
  assert.equal(f.cells.A1,'Item');
  assert.equal(f.cells.A2,'Apple');
  assert.equal(f.cells.B2,'4');
  assert.equal(f.cellStyles.B2.bold,true);
  f.cells.C2='=B2*2';
  assert.throws(()=>sortSheet(f,'A','desc'));
});
test('chart detects numeric pairs and word count',()=>{
  const f={type:'sheets',cells:{A2:'Jan',B2:'10',A3:'Feb',B3:'=B2*2',A4:'No Data',B4:'abc'}};
  assert.deepEqual(sheetChartData(f).map(x=>x.value),[10,20]);
  assert.equal(wordStatistics('Hello <b>great</b> world').words,3);
});


test('sorting 1000-row sheets never silently deletes data below row 30',()=>{
  const sheet={type:'sheets',cells:{A1:'Name',A2:'Zebra',A3:'Apple',A500:'Omega',B500:'500'},cellStyles:{A500:{bold:true}}};
  sortSheet(sheet,'A','asc');
  const values=Object.values(sheet.cells);
  assert.ok(values.includes('Omega'),'row 500 value must survive sorting');
  assert.ok(values.includes('500'),'related cell must survive sorting');
  assert.equal(Object.values(sheet.cellStyles).filter(x=>x.bold).length,1,'cell style must follow the sorted row');
});
