import test from 'node:test';
import assert from 'node:assert/strict';
import {encodePDF,decodePDF,validatePDFRecord,rotatePDFPage,PDF_MAX_BYTES} from '../src/pdf-model.js';
import {validateWorkspace} from '../src/workspace-storage.js';
import {versionContent,restoreRevision} from '../src/revisions.js';
import {workspaceMatchSource} from '../src/workspace-search.js';

const file=()=>({id:'pdf-one',type:'pdf',title:'Report',pdfData:encodePDF(new TextEncoder().encode('%PDF-1.7\nfixture')),pdfPageCount:2,pdfRotations:{},pdfText:'Quarterly balance sheet'});
test('PDF encoding preserves source bytes and rejects other file types',()=>{
  const bytes=new TextEncoder().encode('%PDF-1.7\nexample\u00ff');
  assert.deepEqual(decodePDF(encodePDF(bytes)),bytes);
  assert.throws(()=>encodePDF(new TextEncoder().encode('<script>alert(1)</script>')),/valid PDF header/);
  assert.throws(()=>encodePDF(new Uint8Array(PDF_MAX_BYTES+1)),/8 MB/);
});
test('PDF rotations are bounded, reversible and leave source bytes untouched',()=>{
  const pdf=file(),source=pdf.pdfData;
  rotatePDFPage(pdf,2,90);assert.equal(pdf.pdfRotations[2],90);
  const revision={content:versionContent(pdf)};
  rotatePDFPage(pdf,2,-90);assert.equal(pdf.pdfRotations[2],0);
  assert.equal(restoreRevision(pdf,revision).pdfRotations[2],90);
  assert.equal(pdf.pdfData,source);
  assert.equal(revision.content.pdfData,undefined);
  assert.throws(()=>rotatePDFPage(pdf,3,90));
  assert.throws(()=>rotatePDFPage(pdf,1,17));
});
test('workspace validation, trash and content search accept bounded PDF records',()=>{
  const pdf=file();
  assert.ok(validatePDFRecord(pdf));
  assert.ok(validateWorkspace({files:[pdf],trash:[],versions:{}}));
  assert.ok(validateWorkspace({files:[],trash:[pdf],versions:{}}));
  assert.equal(workspaceMatchSource(pdf,'quarterly'),'PDF text');
  assert.equal(validatePDFRecord({...pdf,pdfPageCount:501}),false);
  assert.equal(validatePDFRecord({...pdf,pdfData:'<script>'}),false);
  assert.equal(validatePDFRecord({...pdf,pdfRotations:{'3':90}}),false);
  assert.equal(validatePDFRecord({...pdf,pdfData:'',pdfPageCount:0,pdfRotations:{}}),true);
});
