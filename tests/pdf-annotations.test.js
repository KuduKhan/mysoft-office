import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {encodePDF,exportPDF,validatePDFRecord} from '../src/pdf-model.js';
import {addAnnotation,deleteAnnotation,validAnnotations} from '../src/pdf-annotations.js';
import {PDFEditHistory} from '../src/pdf-edits.js';
const require=createRequire(import.meta.url);
const {PDFDocument,PDFName,PDFArray}=require('../vendor/pdf-lib.min.js');
test('PDF annotation data is bounded and duplicate IDs are refused',()=>{
 const f={pdfPageCount:2,pdfAnnotations:[]},a={id:'one',kind:'note',page:1,rect:[5,10,23,28],text:'Check'};
 addAnnotation(f,a);assert.equal(validAnnotations(f.pdfAnnotations,2),true);
 assert.throws(()=>addAnnotation(f,{...a,id:'bad',rect:[2,2,1,3]}),/Invalid/);
 assert.throws(()=>addAnnotation(f,a),/Duplicate/);assert.equal(deleteAnnotation(f,'one'),true);
});
test('export produces native PDF Text and Highlight annotations, preserving original',async()=>{
 const doc=await PDFDocument.create(),p=doc.addPage([360,360]);p.drawText('Under the annotation',{x:20,y:280,size:12});
 const raw=encodePDF(await doc.save());
 const f={pdfData:raw,pdfPageCount:1,pdfRotations:{},pdfAnnotations:[]};
 addAnnotation(f,{id:'one',kind:'note',page:1,rect:[10,260,28,278],text:'Review'});
 addAnnotation(f,{id:'two',kind:'highlight',page:1,rect:[20,275,210,295],text:'Marked'});
 assert.ok(validatePDFRecord(f));
 const output=await PDFDocument.load(await exportPDF(f));
 const arr=output.getPage(0).node.lookup(PDFName.of('Annots'),PDFArray);
 assert.equal(arr.size(),2);
 assert.deepEqual([0,1].map(i=>output.context.lookup(arr.get(i)).lookup(PDFName.of('Subtype')).toString()),['/Text','/Highlight']);
 assert.equal(f.pdfData,raw);
 const h=new PDFEditHistory(f);deleteAnnotation(f,'two');h.checkpoint(f);assert.ok(h.undo(f));assert.equal(f.pdfAnnotations.length,2);
});
