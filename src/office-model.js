// v0.3 editing models. Backward compatible with v0.1/v0.2 browser workspaces.
import { displayCell } from './formulas.js';

export const PAGE_SIZES={A4:[210,297],Letter:[216,279],Legal:[216,356]};
export const FONT_FAMILIES=['Arial','Calibri','Georgia','Garamond','Tahoma','Times New Roman','Verdana'];
export const ACCENT_COLORS=['#6555e8','#176db3','#129b83','#c2579b','#dc772f','#364a6b'];

export function wordStatistics(content=''){
  const text=String(content).replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').trim();
  const words=text.match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu)||[];
  return {words:words.length,characters:text.length,readMinutes:Math.max(1,Math.ceil(words.length/220))};
}
const clone=value=>structuredClone(value);
export function ensureWorkbook(file){
  if(file.type!=='sheets')throw new Error('Not a spreadsheet');
  if(!Array.isArray(file.worksheets)||!file.worksheets.length){
    file.worksheets=[{name:'Sheet 1',cells:clone(file.cells||{}),styles:clone(file.cellStyles||{})}];
    file.activeSheetIndex=0;
  }
  if(!Number.isInteger(file.activeSheetIndex)||file.activeSheetIndex<0||file.activeSheetIndex>=file.worksheets.length)file.activeSheetIndex=0;
  const active=file.worksheets[file.activeSheetIndex];
  if(!active.cells||typeof active.cells!=='object')active.cells={};
  if(!active.styles||typeof active.styles!=='object')active.styles={};
  // The active-sheet copy is authoritative when reopening a saved workbook.
  file.cells=active.cells;
  file.cellStyles=active.styles;
  return file;
}
export function switchSheet(file,index){
  ensureWorkbook(file);
  if(!Number.isInteger(index)||index<0||index>=file.worksheets.length)throw new Error('Invalid worksheet');
  file.worksheets[file.activeSheetIndex].cells=file.cells;
  file.worksheets[file.activeSheetIndex].styles=file.cellStyles;
  file.activeSheetIndex=index;
  file.cells=file.worksheets[index].cells;
  file.cellStyles=file.worksheets[index].styles;
  return file;
}
export function addSheet(file){
  ensureWorkbook(file);
  if(file.worksheets.length>=20)throw new Error('Maximum of 20 sheets in v0.3');
  const taken=new Set(file.worksheets.map(s=>s.name));
  let n=1;while(taken.has('Sheet '+n))n++;
  file.worksheets.push({name:'Sheet '+n,cells:{},styles:{}});
  return switchSheet(file,file.worksheets.length-1);
}
export function renameSheet(file,name){
  ensureWorkbook(file);
  const title=String(name??'').trim();
  if(!title||title.length>31||/[\\/?*:[\]]/.test(title))throw new Error('Sheet name must be 1–31 characters without : \\ / ? * [ ]');
  if(file.worksheets.some((s,i)=>i!==file.activeSheetIndex&&s.name.toLowerCase()===title.toLowerCase()))throw new Error('Sheet name already exists');
  file.worksheets[file.activeSheetIndex].name=title;return file;
}
export function duplicateSheet(file){
  ensureWorkbook(file);
  if(file.worksheets.length>=20)throw new Error('Maximum of 20 sheets in v0.3');
  const active=file.worksheets[file.activeSheetIndex];
  const copy=clone(active);
  const base=active.name.slice(0,23);
  let suffix=1;while(file.worksheets.some(s=>s.name===base+' ('+suffix+')'))suffix++;
  copy.name=base+' ('+suffix+')';
  file.worksheets.splice(file.activeSheetIndex+1,0,copy);
  return switchSheet(file,file.activeSheetIndex+1);
}
export function deleteSheet(file){
  ensureWorkbook(file);
  if(file.worksheets.length===1)throw new Error('Cannot delete the last sheet');
  file.worksheets.splice(file.activeSheetIndex,1);
  file.activeSheetIndex=0;
  return switchSheet(file,0);
}
export function setCellStyle(file,reference,property,value){
  ensureWorkbook(file);
  if(!/^[A-L](?:[1-9]|[12][0-9]|30)$/.test(reference))throw new Error('Invalid cell');
  if(!['bold','italic','align','color','background','format'].includes(property))throw new Error('Unsupported style');
  const style=file.cellStyles[reference]||{};
  style[property]=value;file.cellStyles[reference]=style;return file;
}
export function sheetChartData(file){
  ensureWorkbook(file);
  const data=[];
  for(let row=2;row<=30;row++){
    const label=String(displayCell('A'+row,file.cells)).trim();
    const raw=displayCell('B'+row,file.cells);
    const value=Number(raw);
    if(label&&raw!==''&&Number.isFinite(value))data.push({label:label.slice(0,32),value});
  }
  return data.slice(0,20);
}
export function sortSheet(file,column='A',direction='asc'){
  ensureWorkbook(file);
  if(!/^[A-L]$/.test(column))throw new Error('Unsupported column');
  // Sorting formulas would change relative references; refuse instead of corrupting them.
  if(Object.values(file.cells).some(value=>String(value).startsWith('=')))
    throw new Error('Sorting is disabled when formulas are present, to protect references.');
  const rows=[];
  for(let row=2;row<=30;row++){
    const values={};
    for(const c of 'ABCDEFGHIJKL'){
      const key=c+row;
      if(Object.prototype.hasOwnProperty.call(file.cells,key))values[c]=file.cells[key];
    }
    if(Object.keys(values).length)rows.push(values);
  }
  rows.sort((a,b)=>{
    const va=a[column]??'',vb=b[column]??'';
    return String(va).localeCompare(String(vb),undefined,{numeric:true,sensitivity:'base'})*(direction==='desc'?-1:1);
  });
  for(const key of Object.keys(file.cells))if(Number(key.match(/\d+$/)?.[0])>=2)delete file.cells[key];
  rows.forEach((values,i)=>{for(const [c,value] of Object.entries(values))file.cells[c+(i+2)]=value;});
  file.cellStyles={};
  file.worksheets[file.activeSheetIndex].styles=file.cellStyles;
  return file;
}
