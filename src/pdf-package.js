import {exportPDF,pdfOrder} from './pdf-model.js';
import {inspectPDFForms} from './pdf-forms.js';
import {makeZip} from './ooxml-zip.js';
const quote=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
export function pdfInventoryCSV(file){return [['Output page','Source page','Added rotation','Bookmark','MySoft annotations'],...pdfOrder(file).map((page,i)=>[i+1,page,file.pdfRotations?.[page]||0,(file.pdfBookmarks||[]).filter(b=>b.page===page).map(b=>b.label).join(' / '),(file.pdfAnnotations||[]).filter(a=>a.page===page).length])].map(r=>r.map(quote).join(',')).join('\r\n');}
export function pdfChunkOrders(file,size){const order=pdfOrder(file),count=Number(size);if(!Number.isInteger(count)||count<1||count>200||!order.length||order.length>200)throw Error('Split up to 200 output pages, with 1–200 pages per file.');const groups=[];for(let i=0;i<order.length;i+=count)groups.push(order.slice(i,i+count));if(groups.length>50)throw Error('Use larger chunks to create at most 50 PDFs.');return groups;}
export async function splitPDFPackage(file,size){
 const groups=pdfChunkOrders(file,size);if((await inspectPDFForms(file)).length)throw Error('Splitting interactive forms is not supported; export the complete filled PDF instead.');
 const entries={'page-inventory.csv':pdfInventoryCSV(file)};for(let i=0;i<groups.length;i++){entries['part-'+String(i+1).padStart(3,'0')+'.pdf']=await exportPDF({...file,pdfPageOrder:groups[i]});}
 entries['README.txt']='MySoft PDF split package\nParts follow the current output order. Added rotations and MySoft annotations are retained. Original source is unchanged.\nSee page-inventory.csv for source-page mapping.';
 return makeZip(entries);
}
