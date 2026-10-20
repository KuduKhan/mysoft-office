// v0.5.2 editable ranges for the bounded A1:Z1000 worksheet.
// All mutations validate the complete rectangle before editing any cell.
const LIMIT_ROWS=1000,LIMIT_COLS=26,MAX_EDIT_CELLS=2600;
const SINGLE=/^([A-Z])([1-9][0-9]{0,2}|1000)$/;
function address(ref){
  const m=SINGLE.exec(String(ref??'').trim().toUpperCase());
  if(!m)return null;
  const col=m[1].charCodeAt(0)-65,row=Number(m[2]);
  return col>=0&&col<LIMIT_COLS&&row<=LIMIT_ROWS?{col,row}:null;
}
export function parseRange(value){
  const source=String(value??'').trim().toUpperCase();
  const parts=source.split(':');
  if(parts.length>2||parts.length===0)throw Error('Use a range such as A1:C4.');
  const a=address(parts[0]),b=address(parts.at(-1));
  if(!a||!b)throw Error('Range must stay between A1 and Z1000.');
  const bounds={top:Math.min(a.row,b.row),bottom:Math.max(a.row,b.row),left:Math.min(a.col,b.col),right:Math.max(a.col,b.col)};
  const count=(bounds.bottom-bounds.top+1)*(bounds.right-bounds.left+1);
  if(count>MAX_EDIT_CELLS)throw Error('Range limit is 2,600 cells per operation.');
  return {...bounds,count};
}
function key(col,row){return String.fromCharCode(65+col)+row;}
export function forEachRange(range,callback){
  const p=typeof range==='string'?parseRange(range):range;
  for(let row=p.top;row<=p.bottom;row++)
    for(let col=p.left;col<=p.right;col++)
      callback(key(col,row),row,col);
}
export function formatRange(file,range,property,value){
  if(!['bold','italic','align','color','background','format'].includes(property))throw Error('Unknown format.');
  const p=parseRange(range),styles=file.cellStyles||{};
  forEachRange(p,ref=>{
    const before=styles[ref]||{};
    styles[ref]={...before,[property]:value};
  });
  file.cellStyles=styles;
  if(Array.isArray(file.worksheets)&&file.worksheets[file.activeSheetIndex])
    file.worksheets[file.activeSheetIndex].styles=file.cellStyles;
  return p.count;
}
export function clearRange(file,range,clearStyles=false){
  const p=parseRange(range);
  forEachRange(p,ref=>{
    delete file.cells[ref];
    if(clearStyles&&file.cellStyles)delete file.cellStyles[ref];
  });
  return p.count;
}
export function copyRangeTSV(file,range){
  const p=parseRange(range),lines=[];
  for(let row=p.top;row<=p.bottom;row++){
    const items=[];
    for(let col=p.left;col<=p.right;col++)items.push(String(file.cells[key(col,row)]??''));
    lines.push(items.join('\t'));
  }
  return lines.join('\n');
}
export function seriesFill(file,range,mode='linear'){
  const p=parseRange(range);
  if(p.right!==p.left||p.bottom===p.top)throw Error('Fill series requires a vertical range of at least two cells.');
  const first=String(file.cells[key(p.left,p.top)]??'');
  const number=Number(first);
  if(first.trim()===''||!Number.isFinite(number)||first.startsWith('='))
    throw Error('Enter a numeric starting value in the first cell.');
  const secondValue=String(file.cells[key(p.left,p.top+1)]??'');
  const parsedSecond=secondValue.trim()!==''?Number(secondValue):NaN;
  const step=Number.isFinite(parsedSecond)?parsedSecond-number:1;
  if(mode!=='linear')throw Error('Only linear series supported.');
  // Validate the whole series before any writes to avoid partial mutation.
  const values=[];
  for(let row=p.top;row<=p.bottom;row++){
    const value=number+(row-p.top)*step;
    if(!Number.isFinite(value)||Math.abs(value)>1e15)throw Error('Series value exceeds numeric limits.');
    values.push(value);
  }
  values.forEach((v,i)=>{file.cells[key(p.left,p.top+i)]=String(Number(v.toPrecision(14)));});
  return values.length;
}
export function rangeSummary(file,range){
  const p=parseRange(range),nums=[];let nonempty=0;
  forEachRange(p,ref=>{
    const raw=String(file.cells[ref]??'').trim();
    if(!raw)return;
    nonempty++;
    if(!raw.startsWith('=')&&Number.isFinite(Number(raw)))nums.push(Number(raw));
  });
  const sum=nums.reduce((a,b)=>a+b,0);
  return {cells:p.count,nonempty,numeric:nums.length,sum,average:nums.length?sum/nums.length:0,min:nums.length?Math.min(...nums):null,max:nums.length?Math.max(...nums):null};
}
