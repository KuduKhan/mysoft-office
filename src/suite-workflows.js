import {parseRange} from './sheet-range.js';
import {displayCell} from './formulas.js';
export function paragraphDifferences(before,after){
 if(!Array.isArray(before)||!Array.isArray(after)||before.length>300||after.length>300||[...before,...after].some(s=>typeof s!=='string'||s.length>20000))throw Error('Compare up to 300 text blocks per document, each within 20,000 characters.');
 const width=after.length+1,table=new Uint16Array((before.length+1)*width);
 for(let a=before.length-1;a>=0;a--)for(let b=after.length-1;b>=0;b--)table[a*width+b]=before[a]===after[b]?1+table[(a+1)*width+b+1]:Math.max(table[(a+1)*width+b],table[a*width+b+1]);
 const result=[];let a=0,b=0;while(a<before.length||b<after.length){if(a<before.length&&b<after.length&&before[a]===after[b]){result.push({kind:'same',text:before[a]});a++;b++;}else if(b<after.length&&(a===before.length||table[a*width+b+1]>table[(a+1)*width+b]))result.push({kind:'added',text:after[b++]});else result.push({kind:'removed',text:before[a++]});}
 return result;
}
function rows(cells,range){const bounds=parseRange(range),result=[];for(let r=bounds.top;r<=bounds.bottom;r++){const values=Array.from({length:bounds.right-bounds.left+1},(_,i)=>displayCell(String.fromCharCode(65+bounds.left+i)+r,cells));if(values.some(v=>/^#(?:ERROR!?|REF!|DIV\/0!|CYCLE!|VALUE!|NAME\?|NUM!|N\/A)$/i.test(v)))throw Error('Resolve source formula errors before joining.');result.push({sourceRow:r,values});}return {bounds,rows:result};}
const literal=value=>{const text=String(value);if(text.startsWith('=')&&text.length>900)throw Error('Formula-like text is too long to safely copy.');return text.startsWith('=')?'="'+text.replace(/"/g,'""')+'"':text;};
export function joinedWorksheet(left,right,{leftRange='A1:B10',rightRange='A1:B10',leftKey='A',rightKey='A',mode='left',matchCase=false}={}){
 const a=rows(left.cells,leftRange),b=rows(right.cells,rightRange),column=(key,bounds)=>{key=String(key).toUpperCase();const index=key.charCodeAt(0)-65;if(!/^[A-Z]$/.test(key)||index<bounds.left||index>bounds.right)throw Error('Each key column must be inside its source range.');return index-bounds.left;},ai=column(leftKey,a.bounds),bi=column(rightKey,b.bounds);
 if(!['left','inner'].includes(mode)||typeof matchCase!=='boolean')throw Error('Choose a supported join type and key matching.');
 const key=value=>{const text=String(value).trim();return matchCase?text:text.toLocaleLowerCase();},lookup=new Map();
 for(const row of b.rows.slice(1)){const k=key(row.values[bi]);if(!k)continue;if(lookup.has(k))throw Error('Lookup keys must be unique. Resolve duplicate keys first.');lookup.set(k,row);}
 const rightColumns=b.rows[0].values.map((_,i)=>i).filter(i=>i!==bi),width=a.rows[0].values.length+rightColumns.length;if(width>26)throw Error('Joined output must stay within 26 columns.');
 const selected=[{values:[...a.rows[0].values,...rightColumns.map(i=>b.rows[0].values[i])],left:a.rows[0],right:b.rows[0]}];let matched=0,unmatched=0;
 for(const row of a.rows.slice(1)){if(row.values.every(v=>!String(v).trim()))continue;const found=lookup.get(key(row.values[ai]));if(found)matched++;else unmatched++;if(mode==='inner'&&!found)continue;selected.push({values:[...row.values,...rightColumns.map(i=>found?.values[i]||'')],left:row,right:found});}
 if(selected.length*width>2600)throw Error('Keep joined output within 2,600 cells. Use a smaller source range.');
 const cells={},styles={};selected.forEach((row,r)=>row.values.forEach((value,c)=>{const dest=String.fromCharCode(65+c)+(r+1);if(String(value)!=='')cells[dest]=literal(value);const fromLeft=c<a.rows[0].values.length,source=fromLeft?left:right,sourceRow=fromLeft?row.left:row.right,sourceColumn=fromLeft?a.bounds.left+c:b.bounds.left+rightColumns[c-a.rows[0].values.length];const style=sourceRow&&source.styles?.[String.fromCharCode(65+sourceColumn)+sourceRow.sourceRow];if(style)styles[dest]=structuredClone(style);}));
 return {cells,styles,matched,unmatched,rows:selected.length-1,preview:selected.slice(0,8).map(r=>r.values)};
}
export function noteAsDocument(note,title,includeHeading=false){if(note?.type!=='notes')throw Error('Choose a note.');title=String(title??'').trim();if(!title||title.length>120)throw Error('Use a document title of 1–120 characters.');const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const body=(includeHeading?'<h1>'+esc(note.title)+'</h1>':'')+(note.body||'');if(body.length>1000000)throw Error('Keep the copied document within one million characters.');return {type:'docs',title,body,...(note.linkedFileIds?{linkedFileIds:[...note.linkedFileIds]}:{})};}
export function rehearsalCSV(session){const quote=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';return [['Slide','Title','Seconds'],...(session.slides||[]).map((s,i)=>[i+1,s.title,Number(s.seconds||0).toFixed(1)])].map(r=>r.map(quote).join(',')).join('\r\n');}
