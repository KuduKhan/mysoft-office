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
export async function exportPDF(file){
  if(!validatePDFRecord(file)||!file.pdfData)throw Error('Open a PDF first.');
  const bytes=decodePDF(file.pdfData);
  const order=pdfOrder(file),originalOrder=order.length===file.pdfPageCount&&order.every((n,i)=>n===i+1);
  if(originalOrder&&!Object.values(file.pdfRotations||{}).some(Boolean))return bytes;
  if(!writerPromise)writerPromise=import('../vendor/pdf-lib.min.js').then(()=>globalThis.PDFLib).catch(error=>{writerPromise=null;throw error;});
  const {PDFDocument,degrees}=await writerPromise;
  const source=await PDFDocument.load(bytes),doc=await PDFDocument.create();
  const pages=await doc.copyPages(source,order.map(n=>n-1));
  pages.forEach((page,i)=>{const angle=file.pdfRotations?.[order[i]]||0;if(angle)page.setRotation(degrees((page.getRotation().angle+angle)%360));doc.addPage(page);});
  return doc.save();
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
