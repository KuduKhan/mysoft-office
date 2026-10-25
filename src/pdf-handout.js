import {exportPDF} from './pdf-model.js';
import {handoutPlacement} from './production-tools.js';
export async function exportPDFHandout(file,{perSheet=2,paper='A4',margin=24,gap=12,orientation='auto'}={}){
 perSheet=Number(perSheet);margin=Number(margin);gap=Number(gap);if(![1,2,4].includes(perSheet)||!['A4','Letter'].includes(paper)||!['auto','portrait','landscape'].includes(orientation)||!Number.isFinite(margin)||margin<12||margin>60||!Number.isFinite(gap)||gap<0||gap>36)throw Error('Choose 1, 2 or 4 pages, A4 or Letter, margins 12–60 pt and gaps 0–36 pt.');
 const bytes=await exportPDF(file);await import('../vendor/pdf-lib.min.js');const {PDFDocument,degrees}=globalThis.PDFLib,source=await PDFDocument.load(bytes),output=await PDFDocument.create(),pages=source.getPages();if(!pages.length||pages.length>200)throw Error('Use up to 200 output pages for page-layout export.');
 // Embedded page content stays vector-based. Interactive annotations and fields are not copied.
 // A transparent empty mark also gives completely blank pages an embeddable content stream.
 const boxes=pages.map(page=>{page.drawRectangle({x:0,y:0,width:0,height:0,opacity:0});const b=page.getCropBox();return {left:b.x,bottom:b.y,right:b.x+b.width,top:b.y+b.height};}),embedded=await output.embedPages(pages,boxes),dimensions=paper==='A4'?[595.28,841.89]:[612,792],size=orientation==='landscape'||orientation==='auto'&&perSheet===2?[dimensions[1],dimensions[0]]:dimensions,cols=perSheet===1?1:2,rows=perSheet/cols,cw=(size[0]-2*margin-gap*(cols-1))/cols,ch=(size[1]-2*margin-gap*(rows-1))/rows;
 for(let i=0;i<pages.length;i++){
  const slot=i%perSheet,sheet=slot===0?output.addPage(size):output.getPage(output.getPageCount()-1),cell={x:margin+(slot%cols)*(cw+gap),y:size[1]-margin-ch-Math.floor(slot/cols)*(ch+gap),width:cw,height:ch},page=embedded[i],placement=handoutPlacement(page.width,page.height,pages[i].getRotation().angle,cell);
  sheet.drawPage(page,{x:placement.x,y:placement.y,xScale:placement.scale,yScale:placement.scale,rotate:degrees(placement.rotation)});
 }
 output.setTitle((file.title||'PDF')+(perSheet===1?' · Standard pages':' · Handout'));output.setCreator('MySoft Office');return output.save();
}

export function exportResizedPDF(file,options={}){return exportPDFHandout(file,{...options,perSheet:1,gap:0});}
