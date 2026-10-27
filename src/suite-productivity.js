import {parseRange} from './sheet-range.js';
import {displayCell} from './formulas.js';
export function filteredSheetSnapshot(cells,styles,range,{column='A',operator='contains',value='',header=true,sort='none'}={}){
 const bounds=parseRange(range),index=String(column).toUpperCase().charCodeAt(0)-65;
 if(!/^[A-Z]$/i.test(column)||index<bounds.left||index>bounds.right)throw Error('Filter column must be inside the source range.');
 if(!['contains','equals','greater','less','blank','notblank'].includes(operator)||!['none','asc','desc'].includes(sort))throw Error('Choose supported filtering and sorting.');
 if(['greater','less'].includes(operator)&&(!String(value).trim()||!Number.isFinite(Number(value))))throw Error('Enter a finite numeric comparison value.');
 const rows=[];let heading=null;
 for(let r=bounds.top;r<=bounds.bottom;r++){
  const values=Array.from({length:bounds.right-bounds.left+1},(_,c)=>displayCell(String.fromCharCode(65+bounds.left+c)+r,cells));
  if(values.some(v=>/^#(?:ERROR!?|REF!|DIV\/0!|CYCLE!|VALUE!|NAME\?|NUM!|N\/A)$/i.test(v)))throw Error('Resolve formula errors in the source range first.');
  const entry={row:r,values};if(header&&r===bounds.top){heading=entry;continue;}if(values.every(v=>!String(v).trim()))continue;
  const current=String(values[index-bounds.left]??'').trim(),match=String(value).trim().toLocaleLowerCase();
  const include=operator==='contains'?current.toLocaleLowerCase().includes(match):operator==='equals'?current.toLocaleLowerCase()===match:operator==='blank'?!current:operator==='notblank'?!!current:!!current&&Number.isFinite(Number(current))&&(operator==='greater'?Number(current)>Number(value):Number(current)<Number(value));
  if(include)rows.push(entry);
 }
 if(sort!=='none'){const collator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});rows.sort((a,b)=>{const av=String(a.values[index-bounds.left]).trim(),bv=String(b.values[index-bounds.left]).trim();if(!av||!bv)return !av&&!bv?a.row-b.row:!av?1:-1;const comparison=Number.isFinite(Number(av))&&Number.isFinite(Number(bv))?Number(av)-Number(bv):collator.compare(av,bv);return comparison*(sort==='asc'?1:-1)||a.row-b.row;});}
 const output={},format={},selected=heading?[heading,...rows]:rows;
 selected.forEach((entry,r)=>entry.values.forEach((value,c)=>{const ref=String.fromCharCode(65+c)+(r+1),text=String(value);if(text.startsWith('=')&&text.length>900)throw Error('Formula-like text is too long to safely snapshot.');if(text!=='')output[ref]=text.startsWith('=')?'="'+text.replace(/"/g,'""')+'"':text;const style=styles?.[String.fromCharCode(65+bounds.left+c)+entry.row];if(style)format[ref]=structuredClone(style);}));
 return {cells:output,styles:format,matched:rows.length,total:bounds.bottom-bounds.top+(header?0:1),preview:selected.slice(0,8).map(e=>e.values)};
}
export function organizedSlides(slides,order){
 const terms=String(order??'').split(',').map(s=>s.trim());if(!Array.isArray(slides)||!slides.length||terms.some(s=>!/^\d+$/.test(s))||terms.length>200)throw Error('Enter up to 200 slide positions separated by commas.');
 const indices=terms.map(Number);if(indices.some(i=>i<1||i>slides.length)||new Set(indices).size!==slides.length)throw Error('Include every source slide at least once; positions must exist.');
 return indices.map(i=>structuredClone(slides[i-1]));
}
export const NOTE_STATES=['inbox','active','done'];
export function setNoteState(note,state){if(note?.type!=='notes'||!NOTE_STATES.includes(state))throw Error('Choose a valid note progress state.');note.progressState=state;return note;}
export function notebookBoardCSV(notes,notebook){
 const quote=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
 return [['Title','Section','State'],...notes.filter(n=>n.type==='notes'&&(n.notebook||'Personal')===notebook).map(n=>[n.title,n.section||'General',NOTE_STATES.includes(n.progressState)?n.progressState:'inbox'])].map(row=>row.map(quote).join(',')).join('\r\n');
}
