export function validAnnotations(items,count){
 if(items===undefined)return true;
 return Array.isArray(items)&&items.length<=150&&new Set(items.map(a=>a?.id)).size===items.length&&items.every(a=>a&&
 typeof a.id==='string'&&/^[\w-]{1,100}$/.test(a.id)&&['note','highlight'].includes(a.kind)&&
 Number.isInteger(a.page)&&a.page>0&&a.page<=count&&Array.isArray(a.rect)&&a.rect.length===4&&
 a.rect.every(n=>Number.isFinite(n)&&n>=0&&n<=32768)&&a.rect[2]-a.rect[0]>=1&&a.rect[3]-a.rect[1]>=1&&
 typeof a.text==='string'&&a.text.length<=1000&&!/[\u0000-\u001f]/.test(a.text));
}
export function addAnnotation(file,a){
 if(!validAnnotations([a],file.pdfPageCount))throw Error('Invalid annotation data.');
 const next=[...(file.pdfAnnotations||[]),structuredClone(a)];
 if(!validAnnotations(next,file.pdfPageCount))throw Error('Duplicate annotation or 150-annotation limit.');
 file.pdfAnnotations=next;return a;
}
export function deleteAnnotation(file,id){
 const prev=file.pdfAnnotations||[];file.pdfAnnotations=prev.filter(a=>a.id!==id);
 return prev.length!==file.pdfAnnotations.length;
}
export function embedAnnotations(doc,pages,order,all,lib){
 if(!validAnnotations(all,Math.max(...order)))throw Error('Invalid exported annotations.');
 const {PDFName,PDFArray,PDFHexString}=lib;
 for(const [index,sourcePage] of order.entries()){
  const items=all.filter(a=>a.page===sourcePage),page=pages[index];
  if(!items.length)continue;
  const key=PDFName.of('Annots');
  let list=page.node.lookupMaybe(key,PDFArray);
  if(!list){list=doc.context.obj([]);page.node.set(key,list);}
  for(const a of items){
   const [x1,y1,x2,y2]=a.rect;
   const val={Type:PDFName.of('Annot'),Subtype:PDFName.of(a.kind==='note'?'Text':'Highlight'),
    Rect:[x1,y1,x2,y2],Contents:PDFHexString.fromText(a.text),F:4,
    C:a.kind==='note'?[1,.7,.1]:[1,.87,.18]};
   if(a.kind==='highlight'){val.QuadPoints=[x1,y2,x2,y2,x1,y1,x2,y1];val.CA=.3;}
   else val.Name=PDFName.of('Comment');
   list.push(doc.context.register(doc.context.obj(val)));
  }
 }
}
