import {COLUMNS,ROW_COUNT,displayCell} from './formulas.js';
import {ROW_HEIGHT,HEADER_HEIGHT,VISIBLE_ROWS,viewportStart,parseAddress} from './sheet-window.js';
import {sheetCellAppearance} from './office-ui.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,character=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[character]));
const width=46+124*COLUMNS.length;

export function sheetRows(file,start=1,selectedCell='A1'){
  let rows='';
  const end=Math.min(ROW_COUNT,start+VISIBLE_ROWS-1);
  for(let r=start;r<=end;r++){
    rows+='<tr><td class="sheet-row-number">'+r+'</td>';
    for(const col of COLUMNS){
      const ref=col+r;
      const appearance=sheetCellAppearance(file,ref,displayCell(ref,file.cells));
      rows+='<td class="'+(selectedCell===ref?'selected':'')+'"><input class="sheet-cell '+
        (String(file.cells[ref]??'').startsWith('=')?'formula-result':'')+
        '" data-cell="'+ref+'" title="'+ref+'" aria-label="Cell '+ref+
        '" style="'+escape(appearance.style)+'" value="'+escape(appearance.value)+'"></td>';
    }
    rows+='</tr>';
  }
  return '<table class="sheet-table" aria-label="Spreadsheet cells"><tbody>'+rows+'</tbody></table>';
}
export function sheetGrid(file,selectedCell='A1'){
  const point=parseAddress(selectedCell)||{row:1};
  const first=viewportStart((point.row-1)*ROW_HEIGHT+HEADER_HEIGHT);
  const header='<table class="sheet-head" aria-label="Spreadsheet columns"><thead><tr><th scope="col"></th>'+
    COLUMNS.map(col=>'<th scope="col">'+col+'</th>').join('')+'</tr></thead></table>';
  return '<div class="sheet-scroll" id="sheet-scroll"><div class="sheet-virtual-grid" style="height:'+
    (HEADER_HEIGHT+ROW_COUNT*ROW_HEIGHT)+'px;min-width:'+width+'px">'+header+
    '<div id="sheet-window" class="sheet-window" data-first-row="'+first+'" style="top:'+
    (HEADER_HEIGHT+(first-1)*ROW_HEIGHT)+'px">'+sheetRows(file,first,selectedCell)+'</div></div></div>';
}
export function repaintGrid(scroll,file,selectedCell,force=false){
  if(!scroll||!file)return;
  const window=scroll.querySelector('#sheet-window');
  if(!window)return;
  const first=viewportStart(scroll.scrollTop);
  if(!force&&Number(window.dataset.firstRow)===first)return;
  window.dataset.firstRow=String(first);
  window.style.top=(HEADER_HEIGHT+(first-1)*ROW_HEIGHT)+'px';
  window.innerHTML=sheetRows(file,first,selectedCell);
}
