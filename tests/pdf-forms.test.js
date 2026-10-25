import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {setPDFFormValue,validPDFFormValues} from '../src/pdf-forms.js';
import {encodePDF,exportPDF,validatePDFRecord} from '../src/pdf-model.js';
globalThis.self=globalThis;
const loaded=createRequire(import.meta.url)('../vendor/pdf-lib.min.js');
const lib=loaded.PDFDocument?loaded:globalThis.PDFLib;
test('PDF native form fields remain interactive and source bytes unchanged after export',async()=>{
 const doc=await lib.PDFDocument.create(),page=doc.addPage([400,400]),form=doc.getForm();
 form.createTextField('Name').addToPage(page,{x:30,y:200,width:160,height:20});
 form.createCheckBox('Accepted').addToPage(page,{x:30,y:170,width:14,height:14});
 const source=encodePDF(await doc.save()),file={type:'pdf',pdfData:source,pdfPageCount:1,pdfRotations:{}};
 setPDFFormValue(file,'Name','Edited value');setPDFFormValue(file,'Accepted',true);
 assert.equal(validatePDFRecord(file),true);
 const output=await lib.PDFDocument.load(await exportPDF(file));
 assert.equal(output.getForm().getTextField('Name').getText(),'Edited value');
 assert.equal(output.getForm().getCheckBox('Accepted').isChecked(),true);
 assert.equal(file.pdfData,source);
 await assert.rejects(exportPDF({...file,pdfPageOrder:[1,1]}),/original page order/);
});
test('invalid form field values are refused',()=>{
 assert.equal(validPDFFormValues({Name:'a'.repeat(2001)}),false);
 const file={pdfFormValues:{}};assert.throws(()=>setPDFFormValue(file,'Name','a'.repeat(2001)),/limits/);
 assert.deepEqual(file.pdfFormValues,{});
});
