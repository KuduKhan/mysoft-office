import {mergeDocuments,pivotMatrix,slidesFromWorksheet,splitNoteSections} from './production-tools.js';
import {htmlEscape as esc} from './workflow-studio.js';
import {ensureWorkbook,addSheet} from './office-model.js';
import {noteLocation} from './note-structure.js';
import {icon} from './icons.js';
export function productionTools(type){const tools={docs:['merge','Combine documents','copy'],sheets:['matrix','Pivot matrix','table'],slides:['worksheet','Slides from worksheet','presentation'],notes:['split','Split note into sections','notebook']},tool=tools[type];return tool?'<button type="button" class="ot-btn" data-capability-action="production-'+tool[0]+'">'+icon(tool[2],16)+'<span>'+tool[1]+'</span></button>':'';}
export function initializeProductionTools(ctx){
 let pending=null;const $=id=>document.getElementById(id),close=()=>{$('modal-root').innerHTML='';pending=null;};
 const input=(key,label,value='',type='text',extra='')=>'<label class="cap-field">'+label+'<input id="production-'+key+'" aria-label="'+label+'" type="'+type+'" value="'+esc(value)+'" '+extra+'></label>';
 const select=(key,label,options)=>'<label class="cap-field">'+label+'<select id="production-'+key+'" aria-label="'+label+'">'+options.map(([value,text])=>'<option value="'+esc(value)+'">'+esc(text)+'</option>').join('')+'</select></label>';
 function dialog(title,description,body,action,label){$('modal-root').innerHTML='<div class="modal-backdrop"><section class="modal cap-modal workflow-dialog production-dialog"><div class="workflow-kicker">MYSOFT / PRODUCTION STUDIO</div><h2>'+title+'</h2><p>'+description+'</p>'+body+'<div class="modal-actions"><button class="btn btn-light" data-capability-action="production-close">Cancel</button><button class="btn btn-primary" data-capability-action="production-'+action+'">'+label+'</button></div></section></div>';}
 const commit=file=>{ctx.touch(file);void ctx.persist();ctx.render();};
 document.addEventListener('click',async event=>{
  const target=event.target.closest('[data-capability-action]'),action=target?.dataset.capabilityAction;if(!action?.startsWith('production-'))return;if(action==='production-close'){close();return;}const file=ctx.getFile();if(!file)return;
  try{
   if(action==='production-merge'){
    if(file.type!=='docs')return;const sources=ctx.getFiles().filter(f=>f.type==='docs');if(sources.length<2)throw Error('Create or import a second document before combining files.');pending={id:file.id,sources:sources.map(f=>f.id)};dialog('Combine documents','Create a separate document from 2–10 files in the listed order. Body content is retained; page setup comes from the first source. Review page-specific settings after combining.',input('title','Combined document title','Combined document','text','maxlength="120"')+'<div class="production-source-list" aria-label="Document sources">'+sources.map(f=>'<label><input type="checkbox" data-production-source="'+esc(f.id)+'" '+(f.id===file.id?'checked':'')+'><span>'+esc(f.title)+'</span></label>').join('')+'</div>'+select('headings','Source titles',[['yes','Add headings between documents'],['no','Combine body content only']]),'merge-apply','Create combined document');return;
   }
   if(action==='production-matrix'){
    if(file.type!=='sheets')return;ensureWorkbook(file);pending={id:file.id,sheet:file.activeSheetIndex};dialog('Pivot matrix','Summarize two categories across rows and columns. Totals use all observations; averages are weighted. Results are a separate snapshot worksheet.',input('range','Source range','A1:C10')+'<div class="cap-form">'+input('row','Row category column','A','text','maxlength="1"')+input('column','Column category column','B','text','maxlength="1"')+input('value','Value column','C','text','maxlength="1"')+select('operation','Aggregation',[['sum','Sum'],['count','Count'],['average','Average']])+select('header','First row',[['yes','Contains headers'],['no','Contains data']])+'</div>','matrix-apply','Create matrix sheet');return;
   }
   if(action==='production-worksheet'){
    if(file.type!=='slides')return;const sources=ctx.getFiles().filter(f=>f.type==='sheets');if(!sources.length)throw Error('Create or import a spreadsheet first.');pending={id:file.id};dialog('Slides from worksheet','Append one editable slide per populated row, up to 30. Values come from the source file’s active worksheet. The source workbook remains intact.',select('source','Spreadsheet',sources.map(f=>[f.id,f.title]))+input('range','Source range','A1:B6')+'<div class="cap-form">'+input('title-column','Title column','A','text','maxlength="1"')+input('body-column','Body column','B','text','maxlength="1"')+select('header','First row',[['yes','Contains headers'],['no','Contains data']])+'</div>','worksheet-apply','Append slides');return;
   }
   if(action==='production-split'){
    if(file.type!=='notes')return;const sections=splitNoteSections(file);pending={id:file.id};dialog('Split note into sections','Create '+sections.length+' separate notes from top-level Heading 1 and Heading 2 sections. The original note stays intact. New notes retain the notebook, section, tags and canvas design.','<ol class="production-section-list">'+sections.map(s=>'<li>'+esc(s.title)+'</li>').join('')+'</ol>','split-apply','Create section notes');return;
   }
   if(pending?.id!==file.id)throw Error('Reopen this tool for the current file.');
   if(action==='production-merge-apply'&&file.type==='docs'){
    const ids=[...document.querySelectorAll('[data-production-source]:checked')].map(el=>el.dataset.productionSource),sources=ids.map(id=>ctx.getFiles().find(f=>f.id===id));if(sources.some(f=>!f))throw Error('A selected source is unavailable. Reopen the tool.');const result=mergeDocuments(sources,{title:$('production-title').value,headings:$('production-headings').value==='yes'});target.disabled=true;await ctx.createProductionFiles([{type:'docs',...result}]);close();ctx.toast('Combined document saved; source files retained.');return;
   }
   if(action==='production-matrix-apply'&&file.type==='sheets'){
    if(pending.sheet!==file.activeSheetIndex)throw Error('Reopen the tool for this worksheet.');const result=pivotMatrix(file.cells,$('production-range').value,{row:$('production-row').value,column:$('production-column').value,value:$('production-value').value,operation:$('production-operation').value,header:$('production-header').value==='yes'});addSheet(file);Object.assign(file.cells,result.cells);close();commit(file);ctx.toast(result.rowCategories+' × '+result.columnCategories+' matrix created.');return;
   }
   if(action==='production-worksheet-apply'&&file.type==='slides'){
    const source=ctx.getFiles().find(f=>f.id===$('production-source').value&&f.type==='sheets');if(!source)throw Error('Choose an available spreadsheet.');const slides=slidesFromWorksheet(source.cells||source.worksheets?.[source.activeSheetIndex||0]?.cells||{},$('production-range').value,{titleColumn:$('production-title-column').value,bodyColumn:$('production-body-column').value,header:$('production-header').value==='yes',base:file.slides[ctx.getSlideIndex()]||{}});if(file.slides.length+slides.length>200)throw Error('Keep the deck within 200 slides.');const first=file.slides.length;file.slides.push(...slides);ctx.setSlideIndex(first);close();commit(file);ctx.toast(slides.length+' editable slides appended.');return;
   }
   if(action==='production-split-apply'&&file.type==='notes'){
    const sections=splitNoteSections(file),location=noteLocation(file);target.disabled=true;await ctx.createProductionFiles(sections.map(section=>({type:'notes',...section,...location,tags:structuredClone(file.tags||[]),...(file.noteCanvas?{noteCanvas:structuredClone(file.noteCanvas)}:{})})));close();ctx.toast(sections.length+' section notes saved; original retained.');return;
   }
  }catch(error){ctx.toast(String(error.message||error).slice(0,200));if(target?.isConnected)target.disabled=false;}
 });
}
