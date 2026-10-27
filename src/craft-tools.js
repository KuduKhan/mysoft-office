import {parseRange} from './sheet-range.js';
import {displayCell} from './formulas.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sortedRichTable(table,{column=1,numeric=false,direction='asc',header=true}={}){
 const copy=table.cloneNode(true),col=Number(column)-1;
 if(!Number.isInteger(col)||col<0||col>25||!['asc','desc'].includes(direction))throw Error('Choose a column from 1–26 and a valid direction.');
 if(copy.querySelector('table')||copy.tBodies.length!==1||[...copy.rows].some(r=>[...r.cells].some(c=>c.colSpan!==1||c.rowSpan!==1)))throw Error('Use one table body without merged cells or nested tables.');
 const rows=[...copy.tBodies[0].rows],width=rows[0]?.cells.length||0;
 if(rows.length>500||width>26||col>=width||rows.some(r=>r.cells.length!==width||[...r.cells].some(c=>c.colSpan!==1||c.rowSpan!==1)))throw Error('Use a rectangular table with up to 500 rows and no merged cells.');
 const keep=header&&!copy.tHead?rows.slice(0,1):[],data=rows.slice(keep.length),collator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
 if(data.length<2)throw Error('Use at least two data rows.');
 const values=data.map((row,index)=>{const text=row.cells[col].textContent.trim(),value=numeric&&text?Number(text):text;if(numeric&&text&&!Number.isFinite(value))throw Error('The numeric sort column contains nonnumeric text.');return {row,index,text,value};});
 values.sort((a,b)=>!a.text&&!b.text?a.index-b.index:!a.text?1:!b.text?-1:((numeric?a.value-b.value:collator.compare(a.value,b.value))*(direction==='asc'?1:-1)||a.index-b.index));
 copy.tBodies[0].replaceChildren(...keep,...values.map(x=>x.row));return copy;
}
export function duplicateCellGroups(cells,range,{matchCase=false,trim=true,header=false}={}){
 const bounds=parseRange(range),groups=new Map(),errors=[];
 for(let r=bounds.top+(header?1:0);r<=bounds.bottom;r++)for(let c=bounds.left;c<=bounds.right;c++){
  const ref=String.fromCharCode(65+c)+r;let value=String(displayCell(ref,cells)??'');
  if(/^#(?:DIV\/0!|REF!|VALUE!|CYCLE!|NAME\?|ERROR!|NUM!)$/.test(value)){errors.push(ref);continue;}
  if(trim)value=value.trim();if(!value.trim())continue;const key=matchCase?value:value.toLocaleLowerCase();
  if(!groups.has(key))groups.set(key,{value,refs:[]});groups.get(key).refs.push(ref);
 }
 const duplicates=[...groups.values()].filter(g=>g.refs.length>1);return {groups:duplicates,refs:duplicates.flatMap(g=>g.refs),errors};
}
export function duplicatedSlideRange(slides,start,end,copies=1){
 const a=Number(start),b=Number(end),n=Number(copies);
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<a||b>slides.length||b-a>=50||!Number.isInteger(n)||n<1||n>5)throw Error('Choose 1–50 source slides and 1–5 copies.');
 if(slides.length+(b-a+1)*n>200)throw Error('The resulting deck must stay within 200 slides.');
 const added=[];for(let i=0;i<n;i++)for(const source of slides.slice(a-1,b)){const copy=structuredClone(source);if(copy.id)copy.id=crypto.randomUUID();for(const object of copy.objects||[])object.id='sh-'+crypto.randomUUID();added.push(copy);}
 return {slides:[...slides.slice(0,b),...added,...slides.slice(b)],first:b,count:added.length};
}
export function notebookHTML(notes,notebook,sanitize){
 if(typeof sanitize!=='function')throw Error('A content sanitizer is required.');
 const selected=notes.filter(n=>n.type==='notes'&&(n.notebook||'Personal')===notebook);
 if(!selected.length||selected.length>100)throw Error('Export a notebook containing 1–100 notes.');
 let size=0;const chapters=selected.map((note,index)=>{const body=sanitize(note.body||'');size+=body.length;if(size>8000000)throw Error('Keep notebook writing within 8 million characters for this export.');return '<section id="note-'+index+'"><p class="location">'+esc(note.section||'General')+'</p><h2>'+esc(note.title)+'</h2>'+body+'</section>';});
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(notebook)+' · MySoft Notes</title><style>body{font:16px/1.75 system-ui,sans-serif;color:#26343e;background:#f5f7fa;margin:0}main{max-width:850px;margin:auto;padding:32px 22px}h1,h2{line-height:1.3}nav{padding:20px;background:white;border:1px solid #dfe5ec;border-radius:12px}nav a{display:block;color:#503dc8}section{background:white;border:1px solid #dfe5ec;border-radius:12px;padding:28px;margin:24px 0;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{border-collapse:collapse;max-width:100%;display:block;overflow:auto}td,th{border:1px solid #cad3dc;padding:7px}.location{font-size:12px;color:#667785}@media print{body{background:white}nav{display:none}section{border:0;break-before:page;padding:0}}</style></head><body><main><h1>'+esc(notebook)+'</h1><p>Exported from MySoft Notes · '+selected.length+' notes</p><nav aria-label="Notebook contents">'+selected.map((n,i)=>'<a href="#note-'+i+'">'+esc(n.title)+'</a>').join('')+'</nav>'+chapters.join('')+'</main></body></html>';
}
export function alignedDrawingLayers(file,alignment){
 if(file.mediaKind!=='drawing'||!['left','center','right','top','middle','bottom'].includes(alignment))throw Error('Choose a supported drawing alignment.');
 const layers=structuredClone(file.mediaLayers||[]),axis=['left','center','right'].includes(alignment)?0:1;
 const items=layers.filter(l=>!l.hidden&&l.kind!=='erase'&&l.points?.length).map(layer=>{if(layer.points.some(p=>p.length!==2||p.some(v=>!Number.isFinite(v)||v<0||v>1)))throw Error('A layer has invalid coordinates.');const values=layer.points.map(p=>p[axis]);return {layer,start:Math.min(...values),end:Math.max(...values)};});
 if(items.length<2)throw Error('Use at least two visible drawing layers.');const low=Math.min(...items.map(i=>i.start)),high=Math.max(...items.map(i=>i.end));
 for(const item of items){const delta=['left','top'].includes(alignment)?low-item.start:['right','bottom'].includes(alignment)?high-item.end:(low+high-item.start-item.end)/2;for(const point of item.layer.points)point[axis]=Math.max(0,Math.min(1,point[axis]+delta));}
 return {layers,count:items.length};
}

export function duplicateHighlightInk(color){
 if(!/^#[0-9a-f]{6}$/i.test(color))throw Error('Choose a valid highlight color.');
 const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.179?'#000000':'#ffffff';
}
