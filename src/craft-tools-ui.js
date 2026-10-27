import {sortedRichTable,duplicateCellGroups,duplicatedSlideRange,notebookHTML,duplicateHighlightInk} from './craft-tools.js';
import {ensureWorkbook} from './office-model.js';
import {htmlEscape as esc} from './workflow-studio.js';
import {icon} from './icons.js';
export function craftTools(type){const options={docs:['table','Sort table rows','table'],sheets:['duplicates','Review duplicate values','search'],slides:['slides','Duplicate slide range','copy'],notes:['notebook','Export notebook book','download']},item=options[type];return item?'<button type="button" class="ot-btn" data-capability-action="craft-'+item[0]+'">'+icon(item[2],15)+'<span>'+item[1]+'</span></button>':'';}
export function initializeCraftTools(ctx){
 let pending=null;const $=id=>document.getElementById(id),close=()=>{$('modal-root').innerHTML='';pending=null;};
 const input=(key,label,value,type='text',attrs='')=>'<label class="cap-field">'+label+'<input id="craft-'+key+'" aria-label="'+label+'" type="'+type+'" value="'+esc(value)+'" '+attrs+'></label>';
 const choice=(key,label,options)=>'<label class="cap-field">'+label+'<select id="craft-'+key+'" aria-label="'+label+'">'+options.map(([v,t])=>'<option value="'+esc(v)+'">'+esc(t)+'</option>').join('')+'</select></label>';
 const button=(action,label,disabled=false)=>'<button type="button" class="btn '+(action==='review'?'btn-light':'btn-primary')+'" data-capability-action="craft-'+action+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
 const dialog=(title,description,body,actions)=>{$('modal-root').innerHTML='<div class="modal-backdrop"><section class="modal cap-modal craft-dialog"><div class="workflow-kicker">MYSOFT / CRAFT TOOLS</div><h2>'+title+'</h2><p>'+description+'</p>'+body+'<div class="modal-actions"><button class="btn btn-light" data-capability-action="craft-close">Cancel</button>'+actions+'</div></section></div>';};
 const commit=file=>{ctx.touch(file);void ctx.persist();ctx.render();};
 const duplicateOptions=()=>({matchCase:$('craft-case').value==='yes',trim:$('craft-trim').value==='yes',header:$('craft-header').value==='yes'});
 const fingerprint=file=>JSON.stringify([file.cells,$('craft-range').value,duplicateOptions()]);
 document.addEventListener('input',event=>{if(!event.target.closest('.craft-dialog')||!pending)return;pending.preview=null;const apply=document.querySelector('[data-capability-action="craft-highlight"]');if(apply)apply.disabled=true;});
 document.addEventListener('change',event=>{if(event.target.closest('.craft-dialog'))event.target.dispatchEvent(new Event('input',{bubbles:true}));});
 document.addEventListener('click',event=>{
  const target=event.target.closest('[data-capability-action]'),action=target?.dataset.capabilityAction;if(!action?.startsWith('craft-'))return;if(action==='craft-close'){close();return;}
  const file=ctx.getFile();if(!file)return;
  try{
   if(action==='craft-table'&&file.type==='docs'){
    const root=$('rich-content'),tables=[...root.querySelectorAll('table')];if(!tables.length)throw Error('Insert a table first.');pending={id:file.id,body:root.innerHTML};
    dialog('Sort table rows','Sort a complete table while retaining cell formatting, links and images. Merged cells and nested tables are refused. Empty values stay last.','<div class="cap-form">'+choice('table','Document table',tables.map((t,i)=>[i,'Table '+(i+1)+' · '+t.rows.length+' rows']))+input('column','Sort column',1,'number','min="1" max="26"')+choice('numeric','Sort values',[['text','Text'],['number','Numbers']])+choice('direction','Sort direction',[['asc','Ascending'],['desc','Descending']])+choice('header','First row',[['yes','Keep header row'],['no','Sort all body rows']])+'</div>',button('table-apply','Sort rows'));return;
   }
   if(action==='craft-duplicates'&&file.type==='sheets'){
    ensureWorkbook(file);pending={id:file.id,sheet:file.activeSheetIndex};dialog('Review duplicate values','Review matching displayed values before highlighting. Blank cells are ignored; formula errors are listed separately. Highlight changes background and ink only.','<div class="cap-form">'+input('range','Review range',ctx.getSelectedCell(),'text','maxlength="12"')+choice('case','Match case',[['no','Ignore case'],['yes','Match case']])+choice('trim','Outer whitespace',[['yes','Ignore outer whitespace'],['no','Keep whitespace']])+choice('header','First range row',[['no','Include in review'],['yes','Skip header row']])+input('color','Highlight color','#fff0a8','color')+'</div><div id="craft-preview" class="advanced-preview" role="status">Review to see matching cells.</div>',button('review','Review values')+button('highlight','Highlight matching cells',true));return;
   }
   if(action==='craft-slides'&&file.type==='slides'){
    pending={id:file.id,slides:JSON.stringify(file.slides)};const selected=ctx.getSlideIndex()+1;dialog('Duplicate slide range','Insert independent copies immediately after the chosen range, retaining design, notes and editable objects. Up to 50 source slides, 5 copies and 200 total slides.','<div class="cap-form">'+input('start','First source slide',selected,'number','min="1" max="200"')+input('end','Last source slide',selected,'number','min="1" max="200"')+input('copies','Number of copies',1,'number','min="1" max="5"')+'</div>',button('slides-apply','Create slide copies'));return;
   }
   if(action==='craft-notebook'&&file.type==='notes'){
    pending={id:file.id};const notebooks=[...new Set(ctx.getFiles().filter(f=>f.type==='notes').map(f=>f.notebook||'Personal'))];const current=file.notebook||'Personal';notebooks.sort((a,b)=>a===current?-1:b===current?1:a.localeCompare(b));dialog('Export notebook book','Download one portable HTML book with full writing, tables, inline images and a linked contents list. Up to 100 notes. Workspace layout is omitted; MySoft file links remain references.',choice('notebook','Notebook to export',notebooks.map(n=>[n,n])),button('notebook-export','Download notebook'));return;
   }
   if(!pending||pending.id!==file.id)throw Error('Reopen the tool for this file.');
   if(action==='craft-table-apply'&&file.type==='docs'){
    const root=$('rich-content');if(root.innerHTML!==pending.body)throw Error('The document changed. Reopen the table tool.');const clone=root.cloneNode(true),table=clone.querySelectorAll('table')[Number($('craft-table').value)];if(!table)throw Error('Choose an available table.');
    table.replaceWith(sortedRichTable(table,{column:$('craft-column').value,numeric:$('craft-numeric').value==='number',direction:$('craft-direction').value,header:$('craft-header').value==='yes'}));const body=ctx.sanitize(clone.innerHTML);ctx.sealHistory?.(file);file.body=body;ctx.sealHistory?.(file);close();commit(file);ctx.toast('Table rows sorted; formatting retained.');return;
   }
   if(['craft-review','craft-highlight'].includes(action)&&file.type==='sheets'){
    if(file.activeSheetIndex!==pending.sheet)throw Error('Reopen the review for this worksheet.');
    if(action==='craft-review'){
     const result=duplicateCellGroups(file.cells,$('craft-range').value,duplicateOptions());pending.preview={...result,fingerprint:fingerprint(file)};
     $('craft-preview').innerHTML='<strong>'+result.refs.length+' matching cells in '+result.groups.length+' duplicate '+(result.groups.length===1?'group':'groups')+'</strong>'+result.groups.slice(0,30).map(g=>'<p>'+esc(g.value.slice(0,80))+' — '+esc(g.refs.join(', '))+'</p>').join('')+(result.groups.length>30?'<p>Showing the first 30 groups; highlighting includes all matches.</p>':'')+(result.errors.length?'<p>Formula errors skipped: '+esc(result.errors.join(', '))+'</p>':'');document.querySelector('[data-capability-action="craft-highlight"]').disabled=!result.refs.length;return;
    }
    if(!pending.preview||pending.preview.fingerprint!==fingerprint(file))throw Error('Review the current range again before highlighting.');const color=$('craft-color').value;if(!/^#[0-9a-f]{6}$/i.test(color))throw Error('Choose a valid highlight color.');
    const styles=structuredClone(file.cellStyles||{});for(const ref of pending.preview.refs)styles[ref]={...styles[ref],background:color,color:duplicateHighlightInk(color)};file.cellStyles=styles;file.worksheets[file.activeSheetIndex].styles=styles;const count=pending.preview.refs.length;close();commit(file);ctx.toast(count+' duplicate cells highlighted.');return;
   }
   if(action==='craft-slides-apply'&&file.type==='slides'){
    if(JSON.stringify(file.slides)!==pending.slides)throw Error('The deck changed. Reopen the range tool.');const result=duplicatedSlideRange(file.slides,$('craft-start').value,$('craft-end').value,$('craft-copies').value);file.slides=result.slides;ctx.setSlideIndex(result.first);close();commit(file);ctx.toast(result.count+' independent slides inserted.');return;
   }
   if(action==='craft-notebook-export'&&file.type==='notes'){
    const notebook=$('craft-notebook').value,html=notebookHTML(ctx.getFiles(),notebook,ctx.sanitize);ctx.download(html,(notebook.replace(/[^a-z0-9_-]+/gi,'-')||'notebook')+'.html','text/html;charset=utf-8');close();ctx.toast('Notebook book exported; source notes retained.');return;
   }
  }catch(error){ctx.toast(String(error.message||error).slice(0,180));}
 });
}
