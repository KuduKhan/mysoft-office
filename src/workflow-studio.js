import {parseRange} from './sheet-range.js';
import {displayCell} from './formulas.js';
export const htmlEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fieldPattern=()=>/\{\{([A-Za-z][A-Za-z0-9_.-]{0,39})\}\}/g;
function templateBlocks(root){const blocks=[...root.querySelectorAll('p,h1,h2,h3,li,blockquote,td,th')].filter(el=>!el.querySelector('p,h1,h2,h3,li,blockquote,td,th'));return blocks.length?blocks:[root];}
export function templateFields(root){const keys=[...new Set(templateBlocks(root).flatMap(el=>[...el.textContent.matchAll(fieldPattern())].map(match=>match[1])))];if(keys.length>30)throw Error('Use up to 30 distinct template fields.');return keys;}
export function fillTemplate(root,values){
 const keys=templateFields(root);if(!keys.length)throw Error('Add a field such as {{client}} to your document first.');
 for(const key of keys)if(!Object.hasOwn(values,key)||typeof values[key]!=='string'||values[key].length>2000)throw Error('Complete every field with up to 2,000 characters.');
 const occurrences=templateBlocks(root).flatMap(el=>[...el.textContent.matchAll(fieldPattern())]);if(occurrences.length>300||occurrences.reduce((n,match)=>n+values[match[1]].length,0)>200000)throw Error('Fill up to 300 occurrences and 200,000 replacement characters at a time.');
 const copy=root.cloneNode(true);let count=0;
 for(const block of templateBlocks(copy)){
  const matches=[...block.textContent.matchAll(fieldPattern())],walker=block.ownerDocument.createTreeWalker(block,4),nodes=[];let node,offset=0;
  while((node=walker.nextNode())){nodes.push({node,start:offset,end:offset+node.length});offset+=node.length;}
  for(const match of matches.reverse()){
   const start=nodes.find(n=>n.start<=match.index&&n.end>match.index),end=nodes.find(n=>n.start<match.index+match[0].length&&n.end>=match.index+match[0].length);if(!start||!end)throw Error('This field cannot be replaced safely.');
   const range=block.ownerDocument.createRange(),startOffset=match.index-start.start;range.setStart(start.node,startOffset);range.setEnd(end.node,match.index+match[0].length-end.start);range.deleteContents();start.node.insertData(startOffset,values[match[1]]);count++;
  }
 }
 return {html:copy.innerHTML,count};
}
export function sortedSnapshot(cells,range,{primary='A',secondary='',direction='asc',secondaryDirection='asc',numeric=false,header=true}={}){
 const bounds=parseRange(range),column=value=>{const col=String(value).trim().toUpperCase();if(!/^[A-Z]$/.test(col)||col.charCodeAt(0)-65<bounds.left||col.charCodeAt(0)-65>bounds.right)throw Error('Sort columns must be inside the source range.');return col.charCodeAt(0)-65-bounds.left;};
 const first=column(primary),second=secondary.trim()?column(secondary):null;if(second===first)throw Error('Choose two different sort columns.');if(!['asc','desc'].includes(direction)||!['asc','desc'].includes(secondaryDirection))throw Error('Choose a supported sort direction.');
 const rows=[];for(let r=bounds.top;r<=bounds.bottom;r++)rows.push(Array.from({length:bounds.right-bounds.left+1},(_,i)=>displayCell(String.fromCharCode(65+bounds.left+i)+r,cells)));
 const heading=header?rows.shift():null;if(!rows.length)throw Error('Include at least one data row.');
 const compare=(a,b,index,order)=>{const x=String(a[index]??'').trim(),y=String(b[index]??'').trim();if(!x||!y)return x===y?0:!x?1:-1;let result;if(numeric&&index===first){if(!Number.isFinite(Number(x))||!Number.isFinite(Number(y)))throw Error('The numeric sort column contains nonnumeric data.');result=Number(x)-Number(y);}else result=x.localeCompare(y,undefined,{numeric:true,sensitivity:'base'});return order==='desc'?-result:result;};
 // Validate numeric values before sorting; comparators need not visit every row.
 if(numeric&&rows.some(row=>String(row[first]??'').trim()&&!Number.isFinite(Number(row[first]))))throw Error('The numeric sort column contains nonnumeric data.');
 const sorted=rows.map((row,index)=>({row,index})).sort((a,b)=>compare(a.row,b.row,first,direction)||(second!==null?compare(a.row,b.row,second,secondaryDirection):0)||a.index-b.index).map(item=>item.row);
 if(heading)sorted.unshift(heading);const output={};sorted.forEach((row,r)=>row.forEach((value,c)=>{const text=String(value??'');if(text.length>20000||/^\s*=/.test(text))throw Error('A result cannot be safely stored as cell text.');if(text!=='')output[String.fromCharCode(65+c)+(r+1)]=value;}));return {cells:output,rows:rows.length};
}
export function agendaSlides(slides,title='Agenda'){
 if(!Array.isArray(slides)||!slides.length)throw Error('Add slides first.');title=String(title).trim();if(!title||title.length>120)throw Error('Use an agenda title of 1–120 characters.');
 const items=slides.filter(s=>!s.workflowAgenda).map(s=>String(s.title||'Untitled slide').slice(0,160));if(!items.length)throw Error('Add a content slide first.');const pages=Math.ceil(items.length/8);if(slides.length+pages>200)throw Error('The agenda would exceed the 200-slide limit.');
 const base=slides[0];return Array.from({length:pages},(_,i)=>({title:title+(pages>1?' · '+(i+1)+' / '+pages:''),body:items.slice(i*8,i*8+8).map((text,j)=>(i*8+j+1)+'. '+text).join('\n'),theme:base.theme||'violet',studioPreset:base.studioPreset||'ivory',layout:'title',textScale:'small',transition:'none',notes:'Agenda generated from slide titles. Regenerate after changing the deck.',workflowAgenda:true,objects:[]}));
}
export function notebookDigest(notes,notebook,{excerpt=240}={}){
 if(!Number.isInteger(excerpt)||excerpt<80||excerpt>1000)throw Error('Use an excerpt length of 80–1,000 characters.');
 const selected=notes.filter(n=>n.type==='notes'&&(n.notebook||'Personal')===notebook&&!n.workflowDigest);if(!selected.length)throw Error('No source notes in this notebook.');if(selected.length>100)throw Error('Compile up to 100 notes at a time.');
 return '<h1>'+htmlEscape(notebook)+' · Notebook digest</h1><p>'+selected.length+' source notes. This is a snapshot; follow each link for the current note.</p>'+selected.map(note=>{const doc=new DOMParser().parseFromString(note.body||'','text/html'),text=doc.body.textContent.replace(/\s+/g,' ').trim();return '<h2><a href="#/file/'+encodeURIComponent(note.id)+'">'+htmlEscape(note.title)+'</a></h2><p>'+htmlEscape(text.slice(0,excerpt))+(text.length>excerpt?'…':'')+'</p>';}).join('');
}
export const ART_PALETTES={aurora:['#123047','#14b8a6','#a78bfa','#f0abfc'],ember:['#422c35','#e76f51','#f4a261','#e9c46a'],ocean:['#0b2545','#176b87','#64ccc5','#dafffb'],mono:['#15202b','#52616b','#9ba8b2','#e5eaf0']};
export function recolorArtwork(file,palette){
 if(!Object.hasOwn(ART_PALETTES,palette))throw Error('Choose a supported palette.');if(!file.mediaLayers?.length)throw Error('Add drawing layers first.');
 const colors=new Map(),swatches=ART_PALETTES[palette];const layers=file.mediaLayers.map(layer=>{if(!/^#[0-9a-f]{6}$/i.test(layer.color))return {...layer};const key=layer.color.toLowerCase();if(!colors.has(key))colors.set(key,swatches[colors.size%swatches.length]);return {...layer,color:colors.get(key)};});if(!colors.size)throw Error('No editable layer colors were found.');return {layers,colors:colors.size};
}
export function croppedBox(box,rotation,margins){
 const values=['top','right','bottom','left'].map(key=>Number(margins[key]??0));if(values.some(v=>!Number.isFinite(v)||v<0||v>40)||values[0]+values[2]>80||values[1]+values[3]>80)throw Error('Use crop margins from 0–40%, retaining at least 20% of each dimension.');
 const angle=((rotation%360)+360)%360;if(![0,90,180,270].includes(angle))throw Error('Unsupported page rotation.');const [top,right,bottom,left]=values.map(v=>v/100),{x,y,width:w,height:h}=box;
 const raw=angle===90?[right,bottom,left,top]:angle===180?[bottom,left,top,right]:angle===270?[left,top,right,bottom]:[top,right,bottom,left];
 const [t,r,b,l]=raw;return {x:x+w*l,y:y+h*b,width:w*(1-l-r),height:h*(1-t-b)};
}
