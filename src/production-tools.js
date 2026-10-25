import {parseRange} from './sheet-range.js';
import {displayCell} from './formulas.js';
import {htmlEscape as esc} from './workflow-studio.js';

export function mergeDocuments(documents,{title='Combined document',headings=true}={}){
 if(!Array.isArray(documents)||documents.length<2||documents.length>10||documents.some(f=>f.type!=='docs')||new Set(documents.map(f=>f.id)).size!==documents.length)throw Error('Select 2–10 different documents.');
 title=String(title).trim();if(!title||title.length>120)throw Error('Use a title of 1–120 characters.');
 const body=documents.map((file,index)=>(index?'<hr>':'')+(headings?'<h1>'+esc(file.title)+'</h1>':'')+(file.body||'')).join('');if(body.length>1000000)throw Error('The combined document exceeds one million characters. Combine fewer files.');
 return {title,body,pageSettings:structuredClone(documents[0].pageSettings||{})};
}
const readRows=(cells,range)=>{const bounds=parseRange(range);return {bounds,rows:Array.from({length:bounds.bottom-bounds.top+1},(_,r)=>Array.from({length:bounds.right-bounds.left+1},(_,c)=>displayCell(String.fromCharCode(65+bounds.left+c)+(bounds.top+r),cells)))};};
export function pivotMatrix(cells,range,{row='A',column='B',value='C',operation='sum',header=true}={}){
 const {bounds,rows}=readRows(cells,range),col=key=>{key=String(key).trim().toUpperCase();const i=key.charCodeAt(0)-65;if(!/^[A-Z]$/.test(key)||i<bounds.left||i>bounds.right)throw Error('All summary columns must be inside the range.');return i-bounds.left;};
 const ri=col(row),ci=col(column),vi=col(value);if(ri===ci)throw Error('Row and column categories must be different.');if(!['sum','count','average'].includes(operation))throw Error('Choose Sum, Count or Average.');const names=header?rows.shift():null,groups=new Map(),columns=[],rowTotals=new Map(),columnTotals=new Map(),grand={sum:0,count:0};
 const add=(state,number)=>{state.sum+=number;state.count++;if(!Number.isFinite(state.sum))throw Error('Summary exceeds the numeric limit.');};
 for(const values of rows){if(values.every(v=>String(v??'').trim()===''))continue;const label=v=>{const text=String(v??'').trim()||'(Blank)';if(/^\s*=|^#(?:ERROR|REF|DIV|CYCLE|VALUE|NAME|NUM|N\/A)/i.test(text)||text.length>20000)throw Error('Resolve invalid source labels before summarizing.');return text;},r=label(values[ri]),c=label(values[ci]);
  if(!groups.has(r)){if(groups.size>=200)throw Error('Use up to 200 row categories.');groups.set(r,new Map());rowTotals.set(r,{sum:0,count:0});}if(!columns.includes(c)){if(columns.length>=24)throw Error('Use up to 24 column categories.');columns.push(c);columnTotals.set(c,{sum:0,count:0});}
  const raw=String(values[vi]??'').trim();if(operation!=='count'&&!raw)continue;const number=operation==='count'?1:Number(raw);if(!Number.isFinite(number))throw Error('The value column must contain numeric values. Use Count for text.');
  if(!groups.get(r).has(c))groups.get(r).set(c,{sum:0,count:0});for(const state of [groups.get(r).get(c),rowTotals.get(r),columnTotals.get(c),grand])add(state,number);
 }
 if(!grand.count)throw Error('No values to summarize.');const result={},write=(r,c,v)=>{result[String.fromCharCode(65+c)+r]=v;},resultOf=state=>!state?.count?'':operation==='count'?state.count:operation==='average'?state.sum/state.count:state.sum;
 const heading=String(names?.[ri]||'Category');write(1,0,/^\s*=|^#(?:ERROR|REF|DIV|CYCLE|VALUE|NAME|NUM|N\/A)/i.test(heading)?'Category':heading);columns.forEach((c,i)=>write(1,i+1,c));write(1,columns.length+1,'Total');let r=2;
 for(const [name,group]of groups){write(r,0,name);columns.forEach((c,i)=>write(r,i+1,resultOf(group.get(c))));write(r,columns.length+1,resultOf(rowTotals.get(name)));r++;}
 write(r,0,'Total');columns.forEach((c,i)=>write(r,i+1,resultOf(columnTotals.get(c))));write(r,columns.length+1,resultOf(grand));return {cells:result,rowCategories:groups.size,columnCategories:columns.length,observations:grand.count};
}
export function slidesFromWorksheet(cells,range,{titleColumn='A',bodyColumn='B',header=true,base={}}={}){
 const {bounds,rows}=readRows(cells,range),col=key=>{key=String(key).trim().toUpperCase();const i=key.charCodeAt(0)-65;if(!/^[A-Z]$/.test(key)||i<bounds.left||i>bounds.right)throw Error('Slide columns must be inside the source range.');return i-bounds.left;},ti=col(titleColumn),bi=col(bodyColumn);if(ti===bi)throw Error('Use different title and body columns.');if(header)rows.shift();const populated=rows.filter(row=>String(row[ti]??'').trim()||String(row[bi]??'').trim());if(!populated.length||populated.length>30)throw Error('Choose 1–30 populated data rows.');
 return populated.map(row=>{const title=String(row[ti]??'').trim(),body=String(row[bi]??'');if(!title||title.length>500||body.length>20000||/^#(?:ERROR|REF|DIV|CYCLE|VALUE|NAME|NUM|N\/A)/i.test(title)||/^#(?:ERROR|REF|DIV|CYCLE|VALUE|NAME|NUM|N\/A)/i.test(body))throw Error('Each row needs a title of 1–500 characters and valid cell results.');return {title,body,theme:base.theme||'violet',studioPreset:base.studioPreset||'ivory',layout:'title',transition:'none',notes:'Created from worksheet values. This slide is an editable snapshot.',objects:[]};});
}
export function splitNoteSections(file){
 if(file.type!=='notes')throw Error('Open a note first.');const doc=new DOMParser().parseFromString(file.body||'','text/html'),sections=[];let current=null;
 for(const node of [...doc.body.childNodes]){if(node.nodeType===1&&/^H[12]$/.test(node.tagName)){current={title:node.textContent.trim().slice(0,120)||'Untitled section',body:''};sections.push(current);}else if(!current&&(node.textContent.trim()||node.nodeType===1&&(node.matches('img,table,hr')||node.querySelector('img,table,hr')))){current={title:(file.title||'Note')+' · Introduction',body:''};sections.push(current);}if(current)current.body+=node.nodeType===1?node.outerHTML:esc(node.textContent);}
 const output=sections.filter(section=>section.body.trim());if(output.length<2||output.length>20)throw Error('Use 2–20 sections, starting with top-level Heading 1 or Heading 2 blocks.');return output;
}
export function compressionSettings(input={}){
 const values={audioCompression:input.audioCompression===true,compressionThreshold:Number(input.compressionThreshold??-18),compressionRatio:Number(input.compressionRatio??4),compressionAttack:Number(input.compressionAttack??10),compressionRelease:Number(input.compressionRelease??150)};
 for(const [key,min,max]of [['compressionThreshold',-48,0],['compressionRatio',1,12],['compressionAttack',1,100],['compressionRelease',10,1000]])if(!Number.isFinite(values[key])||values[key]<min||values[key]>max)throw Error('Choose supported compressor threshold, ratio, attack and release values.');return values;
}
export function compressPCM(channels,sampleRate,input){
 const settings=compressionSettings(input);if(!Array.isArray(channels)||!channels.length||channels.length>2||!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>96000||channels.some(c=>!(c instanceof Float32Array)||c.length!==channels[0].length))throw Error('Choose a valid mono or stereo audio buffer.');
 const output=channels.map(channel=>new Float32Array(channel));if(!settings.audioCompression)return output;const threshold=10**(settings.compressionThreshold/20),attack=Math.exp(-1/(sampleRate*settings.compressionAttack/1000)),release=Math.exp(-1/(sampleRate*settings.compressionRelease/1000));let envelope=0;
 for(let i=0;i<output[0].length;i++){let level=0;for(const channel of output)level=Math.max(level,Math.abs(channel[i]));const coefficient=level>envelope?attack:release;envelope=coefficient*envelope+(1-coefficient)*level;const gain=envelope>threshold?(envelope/threshold)**(1/settings.compressionRatio-1):1;for(const channel of output)channel[i]*=gain;}return output;
}
export function handoutPlacement(width,height,rotation,cell){
 const angle=((rotation%360)+360)%360;if(![0,90,180,270].includes(angle)||![width,height,cell.width,cell.height].every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid handout geometry.');const vw=angle%180?height:width,vh=angle%180?width:height,scale=Math.min(cell.width/vw,cell.height/vh),x=cell.x+(cell.width-vw*scale)/2,y=cell.y+(cell.height-vh*scale)/2;
 return {x:x+(angle===180?width*scale:angle===270?height*scale:0),y:y+(angle===90?width*scale:angle===180?height*scale:0),scale,rotation:-angle};
}
