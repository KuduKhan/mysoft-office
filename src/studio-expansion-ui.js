import {filteredSnapshot,repeatObjectGrid,tableDesign,importMarkdown,exportMarkdown,escapeMarkup as esc} from './studio-expansion.js';
import {icon} from './icons.js';
import {addSheet,ensureWorkbook} from './office-model.js';
export function expansionTools(type){
  const actions={docs:[['table-design','Table designer','table']],sheets:[['filter-extract','Filter to new sheet','list-filter']],slides:[['object-grid','Repeat object grid','grid']],notes:[['markdown-import','Import Markdown','upload'],['markdown-export','Export Markdown','download']]};
  return (actions[type]||[]).map(([action,label,glyph])=>'<button class="ot-btn" type="button" data-capability-action="suite-'+action+'">'+icon(glyph,16)+'<span>'+label+'</span></button>').join('');
}
export function initializeExpansionTools(ctx){
  let pending=null;
  const $=id=>document.getElementById(id),root=()=>$('rich-content');
  const close=()=>{$('modal-root').innerHTML='';pending=null;};
  const field=(id,label,value,type='text',extra='')=>'<label class="cap-field" for="exp-'+id+'">'+label+'<input id="exp-'+id+'" aria-label="'+label+'" type="'+type+'" value="'+esc(value)+'" '+extra+'></label>';
  const select=(id,label,choices)=>'<label class="cap-field">'+label+'<select id="exp-'+id+'" aria-label="'+label+'">'+choices.map(([value,text])=>'<option value="'+value+'">'+text+'</option>').join('')+'</select></label>';
  function dialog(title,content,action){$('modal-root').innerHTML='<div class="modal-backdrop"><section class="modal cap-modal"><h2>'+title+'</h2>'+content+'<div class="modal-actions"><button class="btn btn-light" data-capability-action="suite-close">Cancel</button><button class="btn btn-primary" data-capability-action="suite-'+action+'">Apply</button></div></section></div>';}
  function changed(file){ctx.touch(file);void ctx.persist();ctx.render();}
  document.addEventListener('click',event=>{
    const action=event.target.closest('[data-capability-action]')?.dataset.capabilityAction;if(!action?.startsWith('suite-'))return;
    if(action==='suite-close'){close();return;}const file=ctx.getFile();if(!file)return;
    try{
      if(action==='suite-table-design'){
        if(file.type!=='docs')return;const tables=[...root().querySelectorAll('table')];if(!tables.length)throw Error('Insert a table before opening Table designer.');pending={id:file.id,tables};
        dialog('Table designer','<p>Style an existing table while retaining its cells, merged cells and content.</p>'+select('table','Table',tables.map((table,index)=>[index,'Table '+(index+1)+' · '+table.rows.length+' rows']))+'<div class="cap-form">'+field('accent','Header color','#176db3','color')+select('alignment','Cell alignment',[['left','Left'],['center','Center'],['right','Right']])+'</div><label class="cap-field"><span>First row is a header</span><input id="exp-header" type="checkbox" checked></label><label class="cap-field"><span>Alternate row colors</span><input id="exp-striped" type="checkbox" checked></label>','table-design-apply');return;
      }
      if(action==='suite-table-design-apply'){
        if(file.type!=='docs'||pending?.id!==file.id)throw Error('Reopen the table designer.');const table=pending.tables[Number($('exp-table').value)];if(!table?.isConnected)throw Error('This table is no longer available.');const result=tableDesign(table,{accent:$('exp-accent').value,striped:$('exp-striped').checked,header:$('exp-header').checked,align:$('exp-alignment').value});table.replaceWith(result);file.body=ctx.sanitize(root().innerHTML);close();changed(file);ctx.toast('Table design applied.');return;
      }
      if(action==='suite-filter-extract'){
        if(file.type!=='sheets')return;ensureWorkbook(file);pending={id:file.id,sheet:file.activeSheetIndex};
        dialog('Filter to new sheet','<p>Copy matching rows as a snapshot into a new worksheet. Source cells stay intact; numeric comparisons skip blank or nonnumeric values.</p>'+field('range','Source range','A1:C10')+'<div class="cap-form">'+field('column','Filter column','A','text','maxlength="1"')+select('operator','Condition',[['contains','Contains text'],['equals','Equals'],['not-equals','Does not equal'],['greater','Greater than'],['less','Less than'],['blank','Is blank'],['not-blank','Is not blank']])+'</div>'+field('query','Comparison value','')+'<label class="cap-field"><span>First row contains headers</span><input id="exp-header" type="checkbox" checked></label>','filter-extract-apply');return;
      }
      if(action==='suite-filter-extract-apply'){
        if(file.type!=='sheets'||pending?.id!==file.id||pending.sheet!==file.activeSheetIndex)throw Error('Reopen the filter for this worksheet.');const result=filteredSnapshot(file.cells,$('exp-range').value,{column:$('exp-column').value,operator:$('exp-operator').value,query:$('exp-query').value,header:$('exp-header').checked});addSheet(file);Object.assign(file.cells,result.cells);close();changed(file);ctx.toast(result.matches+' matching rows copied.');return;
      }
      if(action==='suite-object-grid'){
        if(file.type!=='slides')return;const slide=file.slides[ctx.getSlideIndex()],id=ctx.getSlideObjectId();if(!slide.objects?.some(object=>object.id===id))throw Error('Select a slide object first.');pending={id:file.id,slide:ctx.getSlideIndex(),object:id};
        dialog('Repeat object grid','<p>Repeat the selected object to the right and below. The source is the first object; gaps are percentages of the slide. The whole grid must fit.</p><div class="cap-form">'+field('columns','Columns',2,'number','min="1" max="6" step="1"')+field('rows','Rows',2,'number','min="1" max="6" step="1"')+field('gap-x','Horizontal gap (%)',2,'number','min="0" max="30" step="any"')+field('gap-y','Vertical gap (%)',2,'number','min="0" max="30" step="any"')+'</div>','object-grid-apply');return;
      }
      if(action==='suite-object-grid-apply'){
        if(file.type!=='slides'||pending?.id!==file.id||pending.slide!==ctx.getSlideIndex())throw Error('Reopen the grid tool for this slide.');const count=repeatObjectGrid(file.slides[pending.slide],pending.object,{columns:$('exp-columns').value,rows:$('exp-rows').value,gapX:$('exp-gap-x').value,gapY:$('exp-gap-y').value});close();changed(file);ctx.toast(count+' editable objects added.');return;
      }
      if(action==='suite-markdown-import'){
        if(file.type!=='notes')return;pending={id:file.id};dialog('Import Markdown','<p>Append headings, paragraphs, lists, tasks, bold, italics and web links. Existing note content stays intact. Raw HTML is treated as text.</p><label class="cap-field">Markdown<textarea id="exp-markdown" aria-label="Markdown" maxlength="20000" rows="8" placeholder="# Meeting notes&#10;- [ ] Next action"></textarea></label>','markdown-import-apply');return;
      }
      if(action==='suite-markdown-import-apply'){
        if(file.type!=='notes'||pending?.id!==file.id)throw Error('Reopen Markdown import for this note.');const html=importMarkdown($('exp-markdown').value);root().insertAdjacentHTML('beforeend',html);file.body=ctx.sanitize(root().innerHTML);close();changed(file);ctx.toast('Markdown appended to this note.');return;
      }
      if(action==='suite-markdown-export'){
        if(file.type!=='notes')return;ctx.download(exportMarkdown(root()),(file.title.replace(/[^a-z0-9_-]+/gi,'-')||'note')+'.md','text/markdown;charset=utf-8');ctx.toast('Markdown note exported.');return;
      }
    }catch(error){ctx.toast(String(error.message||error).slice(0,180));}
  });
}
