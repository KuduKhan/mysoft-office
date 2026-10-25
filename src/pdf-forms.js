import {decodePDF} from './pdf-model.js';
let libCache;
async function library(){
 if(!libCache)libCache=import('../vendor/pdf-lib.min.js').then(m=>m.default?.PDFDocument?m.default:globalThis.PDFLib).catch(e=>{libCache=null;throw e;});
 const lib=await libCache;if(!lib?.PDFDocument)throw Error('PDF form engine unavailable.');return lib;
}
export function validPDFFormValues(values){
 return values===undefined||!!values&&typeof values==='object'&&!Array.isArray(values)&&Object.keys(values).length<=100&&
 Object.entries(values).every(([name,value])=>name.length>0&&name.length<=200&&!/[\x00-\x1f]/.test(name)&&
 (typeof value==='boolean'||typeof value==='string'&&value.length<=2000&&!/[\x00-\x1f]/.test(value)));
}
export function setPDFFormValue(file,name,value){
 if(typeof name!=='string'||!name.trim()||name.length>200||/[\x00-\x1f]/.test(name))throw Error('Invalid PDF form field.');
 const next={...(file.pdfFormValues||{}),[name]:value};
 if(!validPDFFormValues(next))throw Error('PDF form value exceeds supported limits.');
 file.pdfFormValues=next;return next;
}
export async function inspectPDFForms(file){
 if(!file?.pdfData)throw Error('Open a PDF.');
 const lib=await library(),pdf=await lib.PDFDocument.load(decodePDF(file.pdfData)),fields=pdf.getForm().getFields();
 if(fields.length>100)throw Error('Forms with more than 100 fields are unsupported.');
 return fields.map(field=>{
  const name=field.getName(),kind=field instanceof lib.PDFTextField?'text':field instanceof lib.PDFCheckBox?'checkbox':'unsupported';
  const value=kind==='text'?field.getText()||'':kind==='checkbox'?field.isChecked():null;
  return {name,kind,value:file.pdfFormValues?.[name]??value};
 });
}
export function applyPDFFormValues(pdf,values,lib){
 if(!validPDFFormValues(values))throw Error('Invalid PDF form edits.');
 const form=pdf.getForm();
 for(const [name,value] of Object.entries(values||{})){
  const field=form.getField(name);
  if(field instanceof lib.PDFTextField&&typeof value==='string')field.setText(value);
  else if(field instanceof lib.PDFCheckBox&&typeof value==='boolean')value?field.check():field.uncheck();
  else throw Error('Unsupported PDF form field or value type.');
 }
}
