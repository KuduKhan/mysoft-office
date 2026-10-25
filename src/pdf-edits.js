const state=file=>structuredClone({pdfRotations:file.pdfRotations||{},pdfBookmarks:file.pdfBookmarks||[],pdfPageOrder:file.pdfPageOrder||null,pdfFormValues:file.pdfFormValues||{},pdfAnnotations:file.pdfAnnotations||[]});
const apply=(file,value)=>{file.pdfRotations=structuredClone(value.pdfRotations);file.pdfBookmarks=structuredClone(value.pdfBookmarks);file.pdfFormValues=structuredClone(value.pdfFormValues||{});file.pdfAnnotations=structuredClone(value.pdfAnnotations||[]);if(value.pdfPageOrder)file.pdfPageOrder=structuredClone(value.pdfPageOrder);else delete file.pdfPageOrder;};
export class PDFEditHistory{
  constructor(file){this.last=state(file);this.past=[];this.future=[];}
  checkpoint(file){const next=state(file);if(JSON.stringify(next)===JSON.stringify(this.last))return false;this.past.push(this.last);if(this.past.length>30)this.past.shift();this.last=next;this.future=[];return true;}
  undo(file){if(!this.past.length)return false;this.future.push(this.last);this.last=this.past.pop();apply(file,this.last);return true;}
  redo(file){if(!this.future.length)return false;this.past.push(this.last);this.last=this.future.pop();apply(file,this.last);return true;}
  get canUndo(){return this.past.length>0;}
  get canRedo(){return this.future.length>0;}
}
export async function orderedPDFText(doc,order,{isCanceled=()=>false,maxCharacters=1000000}={}){
  if(!Array.isArray(order)||!order.length||order.length>500||order.some(n=>!Number.isInteger(n)||n<1||n>doc.numPages))throw Error('Choose a valid PDF page order.');
  const cache=new Map(),parts=[];let length=0;
  for(const [i,n] of order.entries()){
    if(isCanceled())throw new DOMException('Text export canceled','AbortError');
    if(!cache.has(n)){const page=await doc.getPage(n),content=await page.getTextContent();if(isCanceled())throw new DOMException('Text export canceled','AbortError');cache.set(n,content.items.map(item=>(item.str||'')+(item.hasEOL?'\n':' ')).join('').trim());}
    const part='Page '+(i+1)+' (source '+n+')\n\n'+(cache.get(n)||'[No extractable text on this page]');length+=part.length+2;if(length>maxCharacters)throw Error('Text export exceeds one million characters. Extract fewer pages first.');parts.push(part);
  }
  return parts.join('\n\n')+'\n';
}
