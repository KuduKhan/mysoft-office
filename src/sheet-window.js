// Windowed 1,000-row spreadsheet utilities, independent from rendering.
export const VISIBLE_ROWS=48;
export const ROW_HEIGHT=30;
export const HEADER_HEIGHT=31;
export const COLS=26;
export const ROWS=1000;

export function parseAddress(value) {
  const match=/^([A-Z])([1-9]\d{0,2}|1000)$/.exec(String(value||'').trim().toUpperCase());
  if(!match)return null;
  const col=match[1].charCodeAt(0)-65,row=Number(match[2]);
  if(col<0||col>=COLS||row>ROWS)return null;
  return {col,row,address:match[1]+row};
}
export function reference(col,row){
  return String.fromCharCode(65+Math.max(0,Math.min(25,col)))+Math.max(1,Math.min(ROWS,row));
}
export function viewportStart(scrollTop=0,windowSize=VISIBLE_ROWS){
  const visible=Math.max(1,Math.floor(Math.max(0,scrollTop-HEADER_HEIGHT)/ROW_HEIGHT)+1);
  return Math.max(1,Math.min(ROWS-windowSize+1,visible-5));
}
export function moveAddress(address,deltaRow,deltaCol){
  const point=parseAddress(address);
  if(!point)return 'A1';
  return reference(point.col+deltaCol,point.row+deltaRow);
}
export function parseTSV(input,maxRows=ROWS,maxCols=COLS){
  const lines=String(input||'').replace(/\r\n?/g,'\n').replace(/\n$/,'').split('\n').slice(0,maxRows);
  return lines.map(line=>line.split('\t').slice(0,maxCols));
}
export function pasteGrid(cells,start,raw){
  const at=parseAddress(start);
  if(!at)throw Error('Invalid destination');
  const rows=parseTSV(raw,ROWS-at.row+1,COLS-at.col);
  let count=0;
  for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].length;c++){
    const key=reference(at.col+c,at.row+r);
    const value=rows[r][c];
    if(value==='')delete cells[key];
    else cells[key]=value;
    count++;
  }
  return count;
}
export function populatedBounds(cells={}){
  let maxRow=1,maxCol=1;
  for(const key of Object.keys(cells)){
    const p=parseAddress(key);
    if(p){maxRow=Math.max(maxRow,p.row);maxCol=Math.max(maxCol,p.col+1);}
  }
  return {maxRow,maxCol};
}
