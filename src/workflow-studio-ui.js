import {templateFields,fillTemplate,sortedSnapshot,agendaSlides,notebookDigest,htmlEscape as esc} from './workflow-studio.js';
import {addSheet,ensureWorkbook} from './office-model.js';
import {noteLocation} from './note-structure.js';
import {icon} from './icons.js';
export function workflowTools(type){
 const tools={docs:['fields','Fill template fields','file-text'],sheets:['sort','Multi-column sort','list-filter'],slides:['agenda','Build agenda slides','list-tree'],notes:['digest','Notebook digest','notebook']};const tool=tools[type];
 return tool?'<button type="button" class="ot-btn" data-capability-action="workflow-'+tool[0]+'">'+icon(tool[2],16)+'<span>'+tool[1]+'</span></button>':'';
}
export function initializeWorkflowStudio(ctx){
 let pending=null;const $=id=>document.getElementById(id),close=()=>{$('modal-root').innerHTML='';pending=null;};
 const input=(key,label,value='',type='text',extra='')=>'<label class="cap-field">'+label+'<input id="workflow-'+key+'" aria-label="'+label+'" type="'+type+'" value="'+esc(value)+'" '+extra+'></label>';
 const select=(key,label,options)=>'<label class="cap-field">'+label+'<select id="workflow-'+key+'" aria-label="'+label+'">'+options.map(([value,text])=>'<option value="'+esc(value)+'">'+esc(text)+'</option>').join('')+'</select></label>';
 function dialog(title,description,content,action,label='Apply'){$('modal-root').innerHTML='<div class="modal-backdrop"><section class="modal cap-modal workflow-dialog"><div class="workflow-kicker">MYSOFT / WORKFLOW STUDIO</div><h2>'+title+'</h2><p>'+description+'</p>'+content+'<div class="modal-actions"><button class="btn btn-light" data-capability-action="workflow-close">Cancel</button><button class="btn btn-primary" data-capability-action="workflow-'+action+'">'+label+'</button></div></section></div>';}
 const commit=file=>{ctx.touch(file);ctx.sealHistory(file);void ctx.persist();ctx.render();};
 document.addEventListener('click',async event=>{
  const target=event.target.closest('[data-capability-action]'),action=target?.dataset.capabilityAction;if(!action?.startsWith('workflow-'))return;if(action==='workflow-close'){close();return;}const file=ctx.getFile();if(!file)return;
  try{
   if(action==='workflow-fields'){
    if(file.type!=='docs')return;const fields=templateFields($('rich-content'));if(!fields.length)throw Error('Type fields such as {{client}} and {{project}} in your document, then reopen this tool.');pending={id:file.id,fields};dialog('Fill template fields','Replace every occurrence of each field. Values are inserted as text, retaining surrounding formatting. Use a copy of your document to retain its template.','<div class="cap-form">'+fields.map((name,index)=>input('field-'+index,name,'','text','maxlength="2000"')).join('')+'</div>','fields-apply','Fill fields');return;
   }
   if(action==='workflow-sort'){
    if(file.type!=='sheets')return;ensureWorkbook(file);pending={id:file.id,sheet:file.activeSheetIndex};const orders=[['asc','Ascending'],['desc','Descending']];dialog('Multi-column sort','Create a sorted snapshot in a new worksheet. Source formulas and formatting remain in their original sheet. Empty values sort last.',input('range','Source range','A1:C10')+'<div class="cap-form">'+input('primary','Primary column','A','text','maxlength="1"')+select('direction','Primary order',orders)+input('secondary','Then by column (optional)','','text','maxlength="1"')+select('secondary-order','Secondary order',orders)+select('numeric','Primary comparison',[['text','Text / natural order'],['number','Numeric values']])+select('header','First row',[['yes','Contains headers'],['no','Contains data']])+'</div>','sort-apply','Create sorted sheet');return;
   }
   if(action==='workflow-agenda'){
    if(file.type!=='slides')return;pending={id:file.id};const count=file.slides.filter(s=>!s.workflowAgenda).length;dialog('Build agenda slides',count+' content slides. Add up to eight titles per agenda slide, using this deck’s first design. Regenerating replaces earlier generated agendas; all content slides remain.',input('title','Agenda title','Agenda','text','maxlength="120"'),'agenda-apply','Build agenda');return;
   }
   if(action==='workflow-digest'){
    if(file.type!=='notes')return;pending={id:file.id,notebook:noteLocation(file).notebook};dialog('Notebook digest','Compile a separate note with excerpts and links from '+esc(pending.notebook)+'. Source notes remain intact. Earlier generated digests are excluded.',input('excerpt','Characters per note',240,'number','min="80" max="1000" step="1"'),'digest-apply','Create digest note');return;
   }
   if(!pending||pending.id!==file.id)throw Error('Reopen this tool for the current file.');
   if(action==='workflow-fields-apply'&&file.type==='docs'){
    const result=fillTemplate($('rich-content'),Object.fromEntries(pending.fields.map((name,i)=>[name,$('workflow-field-'+i).value])));ctx.sealHistory(file);file.body=ctx.sanitize(result.html);close();commit(file);ctx.toast(result.count+' template fields filled.');return;
   }
   if(action==='workflow-sort-apply'&&file.type==='sheets'){
    if(file.activeSheetIndex!==pending.sheet)throw Error('Reopen the sort tool for this worksheet.');const result=sortedSnapshot(file.cells,$('workflow-range').value,{primary:$('workflow-primary').value,secondary:$('workflow-secondary').value,direction:$('workflow-direction').value,secondaryDirection:$('workflow-secondary-order').value,numeric:$('workflow-numeric').value==='number',header:$('workflow-header').value==='yes'});addSheet(file);Object.assign(file.cells,result.cells);close();commit(file);ctx.toast(result.rows+' rows sorted into a new worksheet.');return;
   }
   if(action==='workflow-agenda-apply'&&file.type==='slides'){
    const content=file.slides.filter(slide=>!slide.workflowAgenda),pages=agendaSlides(content,$('workflow-title').value);file.slides=[...pages,...content];ctx.setSlideIndex(0);close();commit(file);ctx.toast(pages.length+' editable agenda slides created.');return;
   }
   if(action==='workflow-digest-apply'&&file.type==='notes'){
    const notebook=pending.notebook,html=notebookDigest(ctx.getFiles(),notebook,{excerpt:Number($('workflow-excerpt').value)});target.disabled=true;const saved=await ctx.createDigestNote(notebook,html);close();ctx.toast(saved?'Notebook digest saved as a separate note.':'Digest created. Saving failed; export a backup before leaving.');
   }
  }catch(error){ctx.toast(String(error.message||error).slice(0,200));if(target?.isConnected)target.disabled=false;}
 });
}
