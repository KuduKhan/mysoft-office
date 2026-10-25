import {croppedBox} from './workflow-studio.js';
import {validPDFFormValues,applyPDFFormValues} from './pdf-forms.js';
import {validAnnotations,embedAnnotations} from './pdf-annotations.js';
export const PDF_MAX_BYTES=8*1024*1024;
export const PDF_MAX_PAGES=500;
export function validatePDFRecord(file){
  if(typeof file?.pdfData!=='string'||file.pdfData.length>Math.ceil(PDF_MAX_BYTES/3)*4)return false;
  if(file.pdfData&&(file.pdfData.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(file.pdfData)))return false;
  if(!Number.isInteger(file.pdfPageCount)||file.pdfPageCount<0||file.pdfPageCount>PDF_MAX_PAGES)return false;
  if(Boolean(file.pdfData)!==Boolean(file.pdfPageCount))return false;
  if(file.pdfPageOrder!==undefined&&(!Array.isArray(file.pdfPageOrder)||!file.pdfPageOrder.length||file.pdfPageOrder.length>PDF_MAX_PAGES||file.pdfPageOrder.some(n=>!Number.isInteger(n)||n<1||n>file.pdfPageCount)))return false;
  if(file.pdfBookmarks!==undefined && (!Array.isArray(file.pdfBookmarks)||file.pdfBookmarks.length>50||
      file.pdfBookmarks.some(item=>!item||!Number.isInteger(item.page)||item.page<1||
        item.page>file.pdfPageCount||typeof item.label!=='string'||!item.label.trim()||
        item.label.length>80||/[\u0000-\u001f]/.test(item.label))||
      new Set(file.pdfBookmarks.map(item=>item.page)).size!==file.pdfBookmarks.length))return false;
  if(!validPDFFormValues(file.pdfFormValues))return false;
  if(!validAnnotations(file.pdfAnnotations,file.pdfPageCount))return false;
  const rotations=file.pdfRotations||{};
  return typeof rotations==='object'&&!Array.isArray(rotations)&&
    Object.entries(rotations).every(([page,angle])=>/^[1-9]\d{0,2}$/.test(page)&&Number(page)<=file.pdfPageCount&&[0,90,180,270].includes(angle));
}
export function pdfOrder(file){return file.pdfPageOrder||Array.from({length:file.pdfPageCount},(_,i)=>i+1);}
export function parsePDFPages(value,count){
  if(typeof value!=='string'||value.length>3000||!Number.isInteger(count)||count<1||count>PDF_MAX_PAGES)throw Error('Enter source page numbers such as 1-3,5.');
  const pages=[];
  for(const part of value.split(',')){
    const m=/^\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?\s*$/.exec(part);if(!m)throw Error('Use page numbers and ranges, such as 3,1-2.');
    const first=Number(m[1]),last=Number(m[2]||m[1]);if(first<1||last<1||first>count||last>count)throw Error('Page numbers must be within the original PDF.');
    const step=first<=last?1:-1;for(let n=first;;n+=step){pages.push(n);if(pages.length>PDF_MAX_PAGES)throw Error('Keep at most 500 output pages.');if(n===last)break;}
  }
  return pages;
}
export function encodePDF(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length>PDF_MAX_BYTES)throw Error('PDF import limit is 8 MB.');
  const header=new TextDecoder().decode(bytes.subarray(0,1024));
  if(!header.includes('%PDF-'))throw Error('This file does not contain a valid PDF header.');
  let binary='';
  for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return btoa(binary);
}
export function decodePDF(data){
  if(typeof data!=='string'||data.length>Math.ceil(PDF_MAX_BYTES/3)*4)throw Error('PDF exceeds the supported size.');
  return Uint8Array.from(atob(data),c=>c.charCodeAt(0));
}
export function rotatePDFPage(file,page,amount){
  if(!validatePDFRecord(file)||!Number.isInteger(page)||page<1||page>file.pdfPageCount||![90,-90].includes(amount))throw Error('Choose a valid PDF page.');
  file.pdfRotations={...file.pdfRotations,[page]:((file.pdfRotations?.[page]||0)+amount+360)%360};
}
let enginePromise,writerPromise;
export async function pdfEngine(){
  if(!enginePromise)enginePromise=import('../vendor/pdfjs/pdf.min.mjs').then(engine=>{
    engine.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdfjs/pdf.worker.min.mjs',import.meta.url).href;
    return engine;
  }).catch(error=>{enginePromise=null;throw error;});
  return enginePromise;
}
export async function loadPDF(data){
  const engine=await pdfEngine();
  return engine.getDocument({data:decodePDF(data),isEvalSupported:false,useWasm:false,enableXfa:false,
    cMapUrl:new URL('../vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,
    standardFontDataUrl:new URL('../vendor/pdfjs/standard_fonts/',import.meta.url).href}).promise;
}
export async function closePDF(doc){await doc?.loadingTask?.destroy();}
export async function inspectPDF(bytes){
  const pdfData=encodePDF(bytes);
  let doc;
  try{
    doc=await loadPDF(pdfData);
    if(doc.numPages<1||doc.numPages>PDF_MAX_PAGES)throw Error('PDFs must have 1–500 pages.');
    const first=await doc.getPage(1);
    const text=await first.getTextContent();
    return {pdfData,pdfPageCount:doc.numPages,pdfRotations:{},pdfText:text.items.map(item=>item.str||'').join(' ').slice(0,100000)};
  }catch(error){
    if(error?.name==='PasswordException')throw Error('Password-protected PDFs are not supported yet.');
    throw error;
  }finally{await closePDF(doc);}
}
export function pdfStampOptions(input={}){
  const watermark=String(input.watermark??'').trim(),start=Number(input.startNumber??1);
  if(!/^[\x20-\x7e]{0,80}$/.test(watermark))throw Error('Use up to 80 printable English letters, numbers or punctuation for the watermark.');
  if(!Number.isInteger(start)||start<1||start>99999)throw Error('Start page numbering between 1 and 99999.');
  return {watermark,pageNumbers:input.pageNumbers===true,startNumber:start};
}
export async function exportPDF(file,options={}){
  if(!validatePDFRecord(file)||!file.pdfData)throw Error('Open a PDF first.');
  const stamp=pdfStampOptions(options),decorated=stamp.pageNumbers||!!stamp.watermark,crop=options.crop,hasFormEdits=Object.keys(file.pdfFormValues||{}).length>0,hasAnnotations=Boolean(file.pdfAnnotations?.length);
  if(crop)croppedBox({x:0,y:0,width:100,height:100},0,crop);
  const bytes=decodePDF(file.pdfData);
  const order=pdfOrder(file),originalOrder=order.length===file.pdfPageCount&&order.every((n,i)=>n===i+1);
  if(hasFormEdits&&!originalOrder)throw Error('Restore original page order before exporting interactive form edits.');
  if(originalOrder&&!Object.values(file.pdfRotations||{}).some(Boolean)&&!decorated&&!crop&&!hasFormEdits&&!hasAnnotations)return bytes;
  if(!writerPromise)writerPromise=import('../vendor/pdf-lib.min.js').then(module=>module.default?.PDFDocument?module.default:globalThis.PDFLib).catch(error=>{writerPromise=null;throw error;});
  const {PDFDocument,degrees,StandardFonts,rgb}=await writerPromise;
  const source=await PDFDocument.load(bytes),doc=hasFormEdits?source:await PDFDocument.create();
  if(hasFormEdits)applyPDFFormValues(source,file.pdfFormValues,await writerPromise);
  const pages=hasFormEdits?source.getPages():await doc.copyPages(source,order.map(n=>n-1));
  const font=decorated?await doc.embedFont(StandardFonts.Helvetica):null;
  pages.forEach((page,i)=>{const angle=file.pdfRotations?.[order[i]]||0;if(angle)page.setRotation(degrees((page.getRotation().angle+angle)%360));if(!hasFormEdits)doc.addPage(page);});
  if(crop)pages.forEach(page=>{const box=croppedBox(page.getCropBox(),page.getRotation().angle,crop);page.setCropBox(box.x,box.y,box.width,box.height);});
  if(decorated)pages.forEach((page,index)=>{
    const {x:ox,y:oy,width:w,height:h}=page.getCropBox(),rotation=((page.getRotation().angle%360)+360)%360,vw=rotation%180?h:w,vh=rotation%180?w:h;
    const point=(u,v)=>rotation===90?{x:ox+w-v,y:oy+u}:rotation===180?{x:ox+w-u,y:oy+h-v}:rotation===270?{x:ox+v,y:oy+h-u}:{x:ox+u,y:oy+v};
    if(stamp.pageNumbers){const text=String(stamp.startNumber+index),size=Math.min(10,vw/12,vh/12),width=font.widthOfTextAtSize(text,size);page.drawText(text,{...point((vw-width)/2,Math.min(18,vh*.05)),font,size,color:rgb(.25,.29,.36),rotate:degrees(rotation)});}
    if(stamp.watermark){const text=stamp.watermark,base=Math.min(42,vh*.11),size=Math.min(base,vw*.7/font.widthOfTextAtSize(text,1)),width=font.widthOfTextAtSize(text,size),r=Math.PI/6;page.drawText(text,{...point(vw/2-width*Math.cos(r)/2+size*Math.sin(r)/2,vh/2-width*Math.sin(r)/2-size*Math.cos(r)/2),font,size,color:rgb(.28,.35,.46),opacity:.17,rotate:degrees(rotation+30)});}
  });
  if(hasAnnotations)embedAnnotations(doc,pages,order,file.pdfAnnotations,await writerPromise);
  return doc.save();
}

// Merge output follows the current workspace page order, without changing source records.
export async function mergePDF(file,additions,{isCanceled=()=>false}={}){
  if(!validatePDFRecord(file)||!file.pdfData)throw Error('Open a PDF before merging.');
  if(file.pdfAnnotations?.length)throw Error('Merge would discard PDF annotations. Export them separately.');
  if(Object.keys(file.pdfFormValues||{}).length)throw Error('Merge would drop edited fillable form values; export the filled PDF separately.');
  if(!Array.isArray(additions)||!additions.length||additions.length>10)throw Error('Choose 1–10 PDFs to append.');
  if(additions.some(bytes=>!(bytes instanceof Uint8Array)||bytes.length>PDF_MAX_BYTES)||additions.reduce((sum,bytes)=>sum+bytes.length,decodePDF(file.pdfData).length)>32*1024*1024)throw Error('Use PDFs up to 8 MB each and 32 MB combined.');
  for(const bytes of additions)encodePDF(bytes);
  if(!writerPromise)writerPromise=import('../vendor/pdf-lib.min.js').then(()=>globalThis.PDFLib).catch(error=>{writerPromise=null;throw error;});
  const {PDFDocument}=await writerPromise,output=await PDFDocument.create(),sources=[await exportPDF(file),...additions];let count=0;
  for(const bytes of sources){
    if(isCanceled())throw Error('PDF merge canceled.');const source=await PDFDocument.load(bytes),pages=source.getPageCount();count+=pages;if(!pages||count>PDF_MAX_PAGES)throw Error('Keep 1–500 pages in the merged PDF.');
    const copies=await output.copyPages(source,source.getPageIndices());copies.forEach(page=>output.addPage(page));
  }
  if(isCanceled())throw Error('PDF merge canceled.');return output.save();
}

// Original-source-page bookmarks are internal MySoft metadata, not PDF outline objects.
export function setPDFBookmark(file,sourcePage,label){
  if(!validatePDFRecord(file)||!file.pdfData||!Number.isInteger(sourcePage)||
    sourcePage<1||sourcePage>file.pdfPageCount)throw Error('Choose a valid PDF source page.');
  const text=String(label??'').replace(/[\u0000-\u001f]/g,' ').trim();
  if(!text||text.length>80)throw Error('Bookmark name must be 1–80 characters.');
  const bookmarks=[...(file.pdfBookmarks||[])],index=bookmarks.findIndex(b=>b.page===sourcePage);
  if(index===-1&&bookmarks.length>=50)throw Error('Maximum 50 PDF bookmarks.');
  if(index<0)bookmarks.push({page:sourcePage,label:text});
  else bookmarks[index]={page:sourcePage,label:text};
  file.pdfBookmarks=bookmarks.sort((a,b)=>a.page-b.page);
  return {page:sourcePage,label:text};
}
export function removePDFBookmark(file,sourcePage){
  if(!Number.isInteger(sourcePage)||!Array.isArray(file?.pdfBookmarks))return false;
  const before=file.pdfBookmarks.length;
  file.pdfBookmarks=file.pdfBookmarks.filter(b=>b.page!==sourcePage);
  return before!==file.pdfBookmarks.length;
}
