import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,safeCSVCell,makeCSV} from '../src/file-formats.js';

test('CSV parser supports quoted commas, newlines and escaped quotes',()=>{
  const cells=parseCSV('Name,Value\r\n"Hello, world","one ""two"""\r\n"line\nbreak",7');
  assert.equal(cells.A2,'Hello, world');
  assert.equal(cells.B2,'one "two"');
  assert.equal(cells.A3,'line\nbreak');
  assert.equal(cells.B3,'7');
});
test('CSV export neutralizes spreadsheet injection',()=>{
  assert.equal(safeCSVCell('=HYPERLINK("evil")'), "\"'=HYPERLINK(\"\"evil\"\")\"");
  assert.equal(safeCSVCell('hello, world'), '"hello, world"');
  assert.match(makeCSV([['+1','safe']]), /"'\+1"/);
});
