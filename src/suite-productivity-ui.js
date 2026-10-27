import {filteredSheetSnapshot,organizedSlides,setNoteState,notebookBoardCSV,NOTE_STATES} from './suite-productivity.js';
import {ensureWorkbook,addSheet} from './office-model.js';
import {icon} from './icons.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={docs:['snippets','Reusable snippets','copy'],sheets:['filter','Filter rows to new sheet','filter'],slides:['organize','Deck organizer','presentation'],notes:['board','Notebook board','notebook']};
export function suiteProductivityTools(type){const item=names[type];return item?'<button type="button" class="ot-btn" data-capability-action="enhance-'+item[0]+'" aria-label="'+item[1]+'">'+icon(item[2],15)+'<span>'+item[1]+'</span></button>':'';}
export function initializeSuiteProductivity(ctx){
 let pending=null,selection=null;
 const $=id=>document.getElementById(id),close=()=>{$('modal-root').innerHTML='';pending=null;};
 const field=(key,label,value='',type='text',extra='')=>'<label class="cap-field">'+label+'<input id="enhance-'+key+'" aria-label="'+label+'" type="'+type+'" value="'+esc(value)+'" '+extra+'></label>';
 const choice=(key,label,values,current='')=>'<label class="cap-field">'+label+'<select id="enhance-'+key+'" aria-label="'+label+'">'+values.map(([v,t])=>'<option value="'+esc(v)+'"'+(String(v)===String(current)?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>';
 const button=(action,label,disabled=false)=>'<button type="button" class="btn btn-primary" data-capability-action="enhance-'+action+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
 const dialog=(title,description,body,actions)=>{$('modal-root').innerHTML='<div class="modal-backdrop"><section class="modal cap-modal suite-productivity-dialog" role="dialog" aria-modal="true" aria-label="'+title+'"><h2>'+title+'</h2><p>'+description+'</p>'+body+'<p id="enhance-error" role="alert"></p><div class="modal-actions"><button class="btn btn-light" data-capability-action="enhance-close">Close</button>'+actions+'</div></section></div>';};
 const commit=file=>{ctx.touch(file);void ctx.persist();ctx.render();};
 document.addEventListener('selectionchange',()=>{const root=$('rich-content'),file=ctx.getFile(),s=getSelection();if(file?.type==='docs'&&s?.rangeCount&&root?.contains(s.anchorNode)&&root.contains(s.focusNode))selection={id:file.id,range:s.getRangeAt(0).cloneRange()};});
 const options=()=>({column:$('enhance-column').value.trim().toUpperCase(),operator:$('enhance-operator').value,value:$('enhance-value').value,header:$('enhance-header').value==='yes',sort:$('enhance-sort').value});
 const sourceKey=file=>JSON.stringify([file.activeSheetIndex,file.cells,file.cellStyles,$('enhance-range').value,options()]);
 function snippets(file){const sources=ctx.getFiles().filter(f=>f.type==='docs'&&f.reusableSnippet===true&&f.id!==file.id);pending={kind:'snippets',id:file.id,sources};dialog('Reusable snippets','Save selected rich text as a reusable document. Snippets are included in workspace backups. Insert an independent copy at the cursor, replacing any current selection.',field('snippet-name','Snippet name','','text','maxlength="120"')+button('snippet-save','Save selected text')+'<hr>'+choice('snippet','Saved snippet',sources.map(f=>[f.id,f.title]))+'<div id="enhance-preview" class="advanced-preview">'+(sources.length?ctx.sanitize(sources[0].body||''):'Select text and save your first snippet.')+'</div>',button('snippet-insert','Insert snippet',!sources.length)+button('snippet-remove','Remove from library',!sources.length));}
 function board(file,notebook=file.notebook||'Personal'){
  const notebooks=[...new Set(ctx.getFiles().filter(n=>n.type==='notes').map(n=>n.notebook||'Personal'))],notes=ctx.getFiles().filter(n=>n.type==='notes'&&(n.notebook||'Personal')===notebook);
  if(notes.length>100)throw Error('Use a notebook containing at most 100 notes for the board.');pending={kind:'board',id:file.id,notebook};
  const stateOf=n=>NOTE_STATES.includes(n.progressState)?n.progressState:'inbox';const labels={inbox:'Inbox',active:'In progress',done:'Done'};
  dialog('Notebook board','Track notes as work items. Progress updates leave all writing intact.',choice('notebook','Board notebook',notebooks.map(n=>[n,n]),notebook)+'<div class="notebook-board">'+Object.entries(labels).map(([state,label])=>'<section class="notebook-board-column"><h3>'+label+' <span>'+notes.filter(n=>stateOf(n)===state).length+'</span></h3>'+notes.filter(n=>stateOf(n)===state).map(n=>'<article class="notebook-board-card"><button class="notebook-board-open" data-capability-action="enhance-note-open" data-note-id="'+esc(n.id)+'">'+esc(n.title)+'</button><small>'+esc(n.section||'General')+'</small><label>Progress<select data-note-progress="'+esc(n.id)+'" aria-label="Progress for '+esc(n.title)+'">'+Object.entries(labels).map(([v,t])=>'<option value="'+v+'"'+(v===state?' selected':'')+'>'+t+'</option>').join('')+'</select></label></article>').join('')+'</section>').join('')+'</div>',button('board-export','Export board CSV'));
 }
 document.addEventListener('input',e=>{if(e.target.closest('.suite-productivity-dialog')&&pending?.kind==='organize'){pending.preview=null;const apply=document.querySelector('[data-capability-action="enhance-organize-apply"]');if(apply)apply.disabled=true;}if(e.target.closest('.suite-productivity-dialog')&&pending?.kind==='filter'){pending.result=null;const apply=document.querySelector('[data-capability-action="enhance-filter-apply"]');if(apply)apply.disabled=true;}});
 document.addEventListener('change',event=>{
  if(!event.target.closest('.suite-productivity-dialog'))return;const file=ctx.getFile();
  try{
   if(event.target.id==='enhance-snippet'){const snippet=ctx.getFiles().find(f=>f.id===event.target.value&&f.reusableSnippet);$('enhance-preview').innerHTML=snippet?ctx.sanitize(snippet.body||''):'';}
   if(event.target.id==='enhance-notebook'&&pending?.kind==='board')board(file,event.target.value);
   if(event.target.matches('[data-note-progress]')){const note=ctx.getFiles().find(n=>n.id===event.target.dataset.noteProgress);setNoteState(note,event.target.value);ctx.touch(note);void ctx.persist();board(file,pending.notebook);document.querySelector('[data-note-progress="'+CSS.escape(note.id)+'"]')?.focus({preventScroll:true});}
   if(pending?.kind==='filter')event.target.dispatchEvent(new Event('input',{bubbles:true}));
  }catch(error){$('enhance-error').textContent=error.message;}
 });
 document.addEventListener('click',async event=>{
  const target=event.target.closest('[data-capability-action]'),action=target?.dataset.capabilityAction;if(!action?.startsWith('enhance-'))return;if(action==='enhance-close'){close();return;}
  const file=ctx.getFile();if(!file)return;
  try{
   if(action==='enhance-snippets'&&file.type==='docs'){snippets(file);return;}
   if(action==='enhance-filter'&&file.type==='sheets'){
    ensureWorkbook(file);pending={kind:'filter',id:file.id,index:file.activeSheetIndex};dialog('Filter rows to new sheet','Create an evaluated snapshot of matching rows. Source formulas and formatting stay in the original worksheet. Fully empty rows are skipped. Preview before creating the result.',field('range','Source range','A1:C10')+'<div class="cap-form">'+field('column','Filter column','A','text','maxlength="1"')+choice('operator','Match rule',[['contains','Contains text'],['equals','Equals text'],['greater','Greater than'],['less','Less than'],['blank','Is blank'],['notblank','Is not blank']])+field('value','Comparison value')+choice('header','First row',[['yes','Keep header'],['no','Data only']])+choice('sort','Sort matches',[['none','Source order'],['asc','Ascending'],['desc','Descending']])+'</div><div id="enhance-preview" class="advanced-preview">Preview to inspect matching rows.</div>',button('filter-preview','Preview rows')+button('filter-apply','Create filtered worksheet',true));return;
   }
   if(action==='enhance-organize'&&file.type==='slides'){pending={kind:'organize',id:file.id,source:JSON.stringify(file.slides)};dialog('Deck organizer','Reorder or repeat slides using their current positions. Include every source slide at least once; repeated positions create independent copies.',field('order','Slide order',file.slides.map((_,i)=>i+1).join(','),'text','maxlength="1000"')+'<div id="enhance-preview" class="advanced-preview">'+file.slides.map((s,i)=>'<p>'+ (i+1)+'. '+esc(s.title)+'</p>').join('')+'</div>',button('organize-preview','Preview order')+button('organize-apply','Apply slide order',true));return;}
   if(action==='enhance-board'&&file.type==='notes'){board(file);return;}
   if(!pending||pending.id!==file.id)throw Error('Reopen this tool for the current file.');
   if(action==='enhance-snippet-save'){
    const root=$('rich-content'),range=selection?.id===file.id&&root.contains(selection.range.commonAncestorContainer)?selection.range:null,name=$('enhance-snippet-name').value.trim();if(!name)throw Error('Enter a snippet name.');if(!range||range.collapsed)throw Error('Select document text before opening the snippet library.');const wrapper=document.createElement('div');wrapper.append(range.cloneContents());const body=ctx.sanitize(wrapper.innerHTML);if(body.length>100000)throw Error('Keep snippets within 100,000 characters.');target.disabled=true;await ctx.createProductionFiles([{type:'docs',title:name,body,reusableSnippet:true}]);ctx.openFile(file.id);snippets(file);return;
   }
   if(action==='enhance-snippet-insert'||action==='enhance-snippet-remove'){
    const source=ctx.getFiles().find(s=>s.id===$('enhance-snippet').value&&s.reusableSnippet===true);if(!source)throw Error('Choose an available snippet.');
    if(action.endsWith('remove')){source.reusableSnippet=false;ctx.touch(source);void ctx.persist();snippets(file);return;}
    const root=$('rich-content'),range=selection?.id===file.id&&root.contains(selection.range.commonAncestorContainer)?selection.range.cloneRange():null,markup=ctx.sanitize(source.body||'');close();await Promise.resolve();root.focus();const s=getSelection();if(range){s.removeAllRanges();s.addRange(range);}else{const end=document.createRange();end.selectNodeContents(root);end.collapse(false);s.removeAllRanges();s.addRange(end);}ctx.sealHistory?.(file);if(!document.execCommand('insertHTML',false,markup))throw Error('The snippet could not be inserted. Place the cursor in the document and try again.');file.body=ctx.sanitize(root.innerHTML);ctx.sealHistory?.(file);close();commit(file);return;
   }
   if(action==='enhance-filter-preview'){
    if(file.activeSheetIndex!==pending.index)throw Error('Reopen this tool for the current worksheet.');const result=filteredSheetSnapshot(file.cells,file.cellStyles,$('enhance-range').value,options());pending.result=result;pending.key=sourceKey(file);$('enhance-preview').innerHTML='<strong>'+result.matched+' matching rows</strong><table class="studio-audit-table"><tbody>'+result.preview.map(row=>'<tr>'+row.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';document.querySelector('[data-capability-action="enhance-filter-apply"]').disabled=!result.matched;return;
   }
   if(action==='enhance-filter-apply'){
    if(!pending.result||pending.key!==sourceKey(file))throw Error('Preview the current worksheet and options again.');const result=pending.result;addSheet(file);Object.assign(file.cells,result.cells);Object.assign(file.cellStyles,result.styles);close();commit(file);ctx.toast(result.matched+' rows copied to a new worksheet');return;
   }
   if(action==='enhance-organize-preview'){
    const order=$('enhance-order').value,result=organizedSlides(file.slides,order);pending.preview={order,source:JSON.stringify(file.slides)};$('enhance-preview').innerHTML=result.map((s,i)=>'<p>'+ (i+1)+'. '+esc(s.title)+'</p>').join('');document.querySelector('[data-capability-action="enhance-organize-apply"]').disabled=false;return;
   }
   if(action==='enhance-organize-apply'){
    if(!pending.preview||pending.preview.order!==$('enhance-order').value||pending.preview.source!==JSON.stringify(file.slides))throw Error('Preview the current slide order again.');file.slides=organizedSlides(file.slides,$('enhance-order').value);ctx.setSlideIndex(0);close();commit(file);return;
   }
   if(action==='enhance-board-export'){ctx.download(notebookBoardCSV(ctx.getFiles(),pending.notebook),'notebook-board.csv','text/csv;charset=utf-8');return;}
   if(action==='enhance-note-open'){const id=target.dataset.noteId;close();ctx.openFile(id);return;}
  }catch(error){if($('enhance-error'))$('enhance-error').textContent=error.message;else ctx.toast(error.message);target.disabled=false;}
 });
}
