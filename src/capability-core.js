import {parseRange,forEachRange} from './sheet-range.js';
import {displayCell} from './formulas.js';
export function cleanCellWhitespace(cells,range){
  const edits=[];forEachRange(parseRange(range),ref=>{const value=cells[ref];if(typeof value==='string'&&!value.startsWith('=')){const next=value.replace(/\s+/g,' ').trim();if(next.startsWith('='))throw Error('Whitespace cleanup would turn text into a formula. Source cells were kept.');if(next!==value)edits.push([ref,next]);}});
  for(const [ref,value] of edits)cells[ref]=value;return edits.length;
}
export function transformedTable(cells,range,mode,{header=true,delimiter=','}={}){
  const p=parseRange(range),rows=[];
  for(let r=p.top;r<=p.bottom;r++)rows.push(Array.from({length:p.right-p.left+1},(_,i)=>String(displayCell(String.fromCharCode(65+p.left+i)+r,cells)??'')));
  let output;
  if(mode==='unique'){const seen=new Set();output=rows.filter((row,index)=>{if(header&&index===0)return true;const key=JSON.stringify(row);if(seen.has(key))return false;seen.add(key);return true;});}
  else if(mode==='split'){
    if(p.left!==p.right||![';',',','|','\t',' '].includes(delimiter))throw Error('Choose one source column and a supported separator.');
    output=rows.map(row=>row[0].split(delimiter).map(value=>value.trim()));
  }else throw Error('Unknown table operation.');
  if(output.length>1000||output.some(row=>row.length>26||row.some(value=>value.length>20000||/^\s*=/.test(value))))throw Error('Output exceeds the worksheet bounds or would turn text into a formula. Source cells were kept.');
  const result={};output.forEach((row,r)=>row.forEach((value,c)=>{if(value!=='')result[String.fromCharCode(65+c)+(r+1)]=value;}));
  return {cells:result,rows:output.length,columns:Math.max(...output.map(row=>row.length),0)};
}
export function slidesFromOutline(text,base={}){
  if(typeof text!=='string'||text.length>100000)throw Error('Outline limit is 100,000 characters.');
  const groups=text.trim().split(/\r?\n\s*\r?\n/).filter(Boolean);
  if(!groups.length||groups.length>200)throw Error('Enter 1–200 slides separated by blank lines.');
  return groups.map(group=>{const [title,...body]=group.split(/\r?\n/);if(title.length>500||body.join('\n').length>20000)throw Error('A slide exceeds its text limit.');return {title:title.replace(/^#{1,3}\s*/,''),body:body.join('\n').replace(/^[-*]\s*/gm,''),theme:base.theme||'violet',studioPreset:base.studioPreset||'ivory',layout:base.layout||'title',transition:base.transition||'none',notes:''};});
}
export function slideOutline(slides){return slides.map((s,i)=>'## '+(i+1)+'. '+s.title+'\n\n'+s.body+(s.notes?'\n\nSpeaker notes:\n'+s.notes:'')).join('\n\n---\n\n');}
export const NOTE_TEMPLATES={
  project:'<h2>Project brief</h2><p>Goal:</p><p>Success measures:</p><h3>Milestones</h3><ul><li>☐ Define scope</li><li>☐ Review progress</li><li>☐ Deliver and reflect</li></ul><h3>Decisions &amp; risks</h3><p></p>',
  research:'<h2>Research notebook</h2><p>Question:</p><h3>Sources</h3><p>Title · Author · Date · Link</p><h3>Evidence &amp; observations</h3><p></p><h3>Conclusions</h3><p></p><h3>Next steps</h3><ul><li>☐ Verify sources</li></ul>'
};
export function noteLinkIds(html){return [...String(html).matchAll(/href=["']#\/file\/([a-zA-Z0-9_-]{1,200})["']/g)].map(m=>m[1]);}
export function paragraphOptions(input){
  const out={};for(const [key,max] of [['before',80],['after',80],['indent',96]]){const n=Number(input[key]);if(!Number.isFinite(n)||n<0||n>max)throw Error('Paragraph values are outside the supported range.');out[key]=n;}
  const line=Number(input.line);if(![1,1.2,1.5,1.6,2,2.5,3].includes(line))throw Error('Choose a supported line spacing.');return {...out,line};
}
