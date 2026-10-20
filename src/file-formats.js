// Input/export utilities used by MySoft v0.2. No formulas are executed from imported CSV.
export function parseCSV(text, rowLimit=30, colLimit=12) {
  const rows=[];let row=[],value='',quoted=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(quoted){
      if(char==='"'&&text[i+1]==='"'){value+='"';i++;}
      else if(char==='"')quoted=false;
      else value+=char;
    } else if(char==='"'&&value==='')quoted=true;
    else if(char===','){row.push(value);value='';}
    else if(char==='\n'||char==='\r'){
      if(char==='\r'&&text[i+1]==='\n')i++;
      row.push(value);rows.push(row);row=[];value='';
      if(rows.length>=rowLimit)break;
    }else value+=char;
  }
  if(rows.length<rowLimit&&(value!==''||row.length)){row.push(value);rows.push(row);}
  const cells={};
  for(let r=0;r<Math.min(rowLimit,rows.length);r++)
    for(let c=0;c<Math.min(colLimit,rows[r].length);c++)
      if(rows[r][c]!=='') cells[String.fromCharCode(65+c)+(r+1)]=rows[r][c];
  return cells;
}

export function safeCSVCell(value){
  let text=String(value??'');
  // Guard values interpreted as formulas by Excel/LibreOffice when CSV is opened.
  if(/^[\u0000-\u0020]*[=+\-@]/.test(text))text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
}
export function makeCSV(rows){
  return rows.map(row=>row.map(safeCSVCell).join(',')).join('\r\n');
}
