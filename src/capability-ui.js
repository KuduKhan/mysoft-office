import {debugFormula} from './sheet-audit.js';
import {workflowToolsV2,initializeWorkflowsV2} from './suite-workflows-ui.js';
import {suiteProductivityTools,initializeSuiteProductivity} from './suite-productivity-ui.js';
import {objectStyleFields,readObjectStyle} from './slide-customize-ui.js';
import {copySlideAppearance} from './studio-tools.js';
import {craftTools,initializeCraftTools} from './craft-tools-ui.js';
import {advancedTools,initializeAdvancedTools} from './advanced-tools-ui.js';
import {productionTools,initializeProductionTools} from './production-tools-ui.js';
import {workflowTools,initializeWorkflowStudio} from './workflow-studio-ui.js';
import {summarizeTable,preciseObjectPatch,taskCaptureHTML,writingReview} from './studio-pro-tools.js';
import {expansionTools,initializeExpansionTools} from './studio-expansion-ui.js';
import {getSlideObject} from './slide-objects.js';
import {icon} from './icons.js';
import {documentCallout,distributeSlideObjects,tasksMarkdown,buildTextFormula} from './editor-enhancements.js';
import {editableBlocks,blockIndexFromSelection} from './doc-blocks.js';
import {workspaceLinks} from './workspace-links.js';
import {ensureWorkbook,addSheet} from './office-model.js';
import {cleanCellWhitespace,transformedTable,slidesFromOutline,slideOutline,NOTE_TEMPLATES,noteLinkIds,paragraphOptions} from './capability-core.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(action,label,ic='plus')=>'<button type="button" class="ot-btn" data-capability-action="'+action+'">'+icon(ic,15)+'<span>'+label+'</span></button>';
export function capabilityToolbar(file,section='tools'){
  if(section==='insert')return file.type==='docs'?btn('callout','Callout','message-square-text'):'';
  const sets={docs:[['paragraph','Paragraph settings','align-left'],['uppercase','Uppercase block','type'],['lowercase','Lowercase block','type'],['cleanup','Clean empty paragraphs','file-text'],['workspace-link','Link a MySoft file','link'],['workspace-references','Linked files','list-tree']],sheets:[['trim-cells','Trim whitespace','table'],['unique','Unique rows to new sheet','table'],['split','Split text to new sheet','table']],slides:[['outline','Create from outline','presentation'],['reverse','Reverse slide order','rotate-ccw'],['copy-design','Copy current design to all','presentation'],['outline-export','Export speaker outline','download']],notes:[['note-link','Link another note','link'],['note-backlinks','Linked notes','link'],['note-tasks','Task dashboard','check'],['note-project','Project template','notebook'],['note-research','Research template','notebook'],['workspace-link','Link a MySoft file','link'],['workspace-references','Linked files','list-tree']]};
  if(file.type==='docs')sets.docs.push(['writing-review','Document inspector','file-check-2'],['image-descriptions','Image descriptions','image']);
  if(file.type==='sheets')sets.sheets.push(['summary-table','Summarize by group','table'],['formula-debugger','Formula debugger','git-branch']);
  if(file.type==='slides')sets.slides.push(['object-properties','Object properties','sliders-horizontal']);
  if(file.type==='notes')sets.notes.push(['capture-tasks','Capture tasks','square-check']);
  if(file.type==='sheets')sets.sheets.push(['text-formulas','Text tools','case-sensitive']);
  if(file.type==='slides')sets.slides.push(['distribute-horizontal','Distribute horizontally','align-horizontal-distribute-center'],['distribute-vertical','Distribute vertically','align-vertical-distribute-center']);
  if(file.type==='notes')sets.notes.push(['note-task-export','Export task list','download']);
  return (sets[file.type]||[]).map(args=>btn(...args)).join('')+expansionTools(file.type)+workflowTools(file.type)+productionTools(file.type)+advancedTools(file.type)+craftTools(file.type)+suiteProductivityTools(file.type)+workflowToolsV2(file.type);
}
export function initializeCapabilityTools(ctx){
  initializeExpansionTools(ctx);
  initializeWorkflowStudio(ctx);
  initializeProductionTools(ctx);
  initializeAdvancedTools(ctx);
  initializeCraftTools(ctx);
  initializeSuiteProductivity(ctx);
  initializeWorkflowsV2(ctx);
  let selected={id:'',index:0},pending=null,reviewTargets=[];
  const taskFilter={status:'all',query:'',scope:'all'};
  const root=()=>document.getElementById('rich-content'),modalRoot=()=>document.getElementById('modal-root');
  const close=()=>{modalRoot().innerHTML='';pending=null;};
  const input=(id,label,value='',type='text',extra='')=>'<label class="cap-field" for="'+id+'">'+label+'<input id="'+id+'" type="'+type+'" value="'+esc(value)+'" '+extra+'></label>';
  function dialog(title,content,action){modalRoot().innerHTML='<div class="modal-backdrop"><section class="modal cap-modal"><h2>'+title+'</h2>'+content+'<div class="modal-actions">'+btn('close',action?'Cancel':'Done','x')+(action?btn(action,'Apply','check'):'')+'</div></section></div>';}
  function save(file){ctx.touch(file);void ctx.persist();ctx.render();}
  document.addEventListener('selectionchange',()=>{const f=ctx.getFile();if(f?.type!=='docs')return;const index=blockIndexFromSelection(root(),getSelection());if(index!==null)selected={id:f.id,index};});
  function blocks(file){let list=editableBlocks(root());if(!list.length){const p=document.createElement('p');while(root().firstChild)p.appendChild(root().firstChild);root().appendChild(p);list=[p];}return list;}
  function updateBody(file){file.body=ctx.sanitize(root().innerHTML);save(file);}
  function notes(){return ctx.getFiles().filter(f=>f.type==='notes');}
  function taskList(file){const dom=new DOMParser().parseFromString(file.body||'','text/html'),walker=dom.createTreeWalker(dom.body,NodeFilter.SHOW_TEXT),nodes=[],tasks=[];let node;while((node=walker.nextNode())){const i=nodes.push(node)-1;for(const match of node.textContent.matchAll(/[☐☑]/g))tasks.push({node:i,offset:match.index,done:match[0]==='☑',label:node.textContent.slice(match.index+1).trim().slice(0,120)});}return {dom,nodes,tasks};}
  function filterTasks(){
    let shown=0;
    for(const row of document.querySelectorAll('[data-capability-task]')){
      const matches=(taskFilter.status==='all'||row.dataset.taskDone===String(taskFilter.status==='completed'))&&(taskFilter.scope==='all'||row.dataset.capabilityTask===ctx.getFile()?.id)&&row.textContent.toLocaleLowerCase().includes(taskFilter.query.toLocaleLowerCase());
      row.hidden=!matches;if(matches)shown++;
    }
    const empty=document.getElementById('pro-task-empty');if(empty)empty.hidden=shown>0;
  }
  function showTasks(){
    const items=notes().flatMap(f=>taskList(f).tasks.map((task,index)=>({file:f,index,task}))).slice(0,300),done=items.filter(item=>item.task.done).length;
    dialog('Task dashboard','<p>'+done+' of '+items.length+' tasks complete. Select a task to complete or reopen it.</p><div class="cap-form"><label class="cap-field">Task status<select id="pro-task-status" aria-label="Task status">'+['all','open','completed'].map(value=>'<option value="'+value+'" '+(taskFilter.status===value?'selected':'')+'>'+value+'</option>').join('')+'</select></label><label class="cap-field">Task scope<select id="pro-task-scope" aria-label="Task scope"><option value="all" '+(taskFilter.scope==='all'?'selected':'')+'>All notes</option><option value="current" '+(taskFilter.scope==='current'?'selected':'')+'>This note</option></select></label></div>'+input('pro-task-search','Search tasks',taskFilter.query,'search')+'<div class="cap-results">'+items.map(({file,index,task})=>'<button class="cap-result" data-capability-task="'+esc(file.id)+'" data-task-index="'+index+'" data-task-done="'+task.done+'" aria-label="'+(task.done?'Reopen':'Complete')+' task: '+esc(task.label)+'">'+icon(task.done?'square-check':'square',16)+esc(task.label||'Untitled task')+'<small>'+esc(file.title)+'</small></button>').join('')+'<p id="pro-task-empty" hidden>No matching tasks.</p></div>');filterTasks();
  }
  document.addEventListener('input',event=>{if(event.target.id==='pro-task-search'){taskFilter.query=event.target.value;filterTasks();}});
  document.addEventListener('change',event=>{if(event.target.id==='pro-task-status'||event.target.id==='pro-task-scope'){taskFilter[event.target.id.endsWith('status')?'status':'scope']=event.target.value;filterTasks();}});
  document.addEventListener('click',event=>{
    const internal=event.target.closest('a[href^="#/file/"]');if(internal){const id=internal.getAttribute('href').slice(7);event.preventDefault();if(ctx.getFiles().some(f=>f.id===id)){event.preventDefault();close();ctx.openFile(id);}else ctx.toast('This linked file is unavailable. It may be in the recycle bin.');return;}
    const open=event.target.closest('[data-capability-open]');if(open){const id=open.dataset.capabilityOpen;close();ctx.openFile(id);return;}
    const task=event.target.closest('[data-capability-task]');if(task){const f=notes().find(n=>n.id===task.dataset.capabilityTask);if(!f)return;const parsed=taskList(f),item=parsed.tasks[Number(task.dataset.taskIndex)];if(!item)return;const node=parsed.nodes[item.node];node.textContent=node.textContent.slice(0,item.offset)+(item.done?'☐':'☑')+node.textContent.slice(item.offset+1);f.body=ctx.sanitize(parsed.dom.body.innerHTML);ctx.touch(f);void ctx.persist();ctx.render();showTasks();return;}
    const issue=event.target.closest('[data-pro-review-target]');if(issue){const node=reviewTargets[Number(issue.dataset.proReviewTarget)];close();queueMicrotask(()=>{if(node?.isConnected){node.scrollIntoView({block:'center',behavior:'smooth'});root()?.focus({preventScroll:true});const range=document.createRange();range.selectNodeContents(node);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);}});return;}
    const target=event.target.closest('[data-capability-action]');if(!target)return;const action=target.dataset.capabilityAction;
    if(action==='close'){close();return;}const f=ctx.getFile();if(!f)return;
    try{
      if(action==='image-descriptions'){
        if(f.type!=='docs')return;const images=[...root().querySelectorAll('img')];if(!images.length)throw Error('Insert a picture before adding an image description.');pending={id:f.id,images};dialog('Image descriptions','<p>Describe what each image communicates. Descriptions are saved in this workspace and JSON backups.</p>'+images.slice(0,100).map((image,index)=>input('pro-image-alt-'+index,'Image '+(index+1),image.getAttribute('alt')||'','text','maxlength="100"')).join(''),'image-descriptions-apply');return;
      }
      if(action==='image-descriptions-apply'){
        if(f.type!=='docs'||pending?.id!==f.id)throw Error('Reopen descriptions for this document.');const images=pending.images.slice(0,100),values=images.map((image,index)=>document.getElementById('pro-image-alt-'+index).value.trim());if(values.some(text=>!text||text.length>100))throw Error('Describe each image in 1–100 characters.');images.forEach((image,index)=>image.setAttribute('alt',values[index]));close();updateBody(f);return;
      }
      if(action==='formula-debugger'){
        if(f.type!=='sheets')return;
        ensureWorkbook(f);
        const selected=ctx.getSelectedCell(),report=debugFormula(f.cells,selected,{maxDepth:6,maxNodes:36});
        const render=(entry,depth=0)=>{
          const value=entry.truncated?'Depth or node limit reached':entry.cycle?'Circular reference':String(entry.value??'(empty)');
          const name=esc(entry.cell),raw=entry.raw!==undefined?esc(String(entry.raw).slice(0,160)):'';
          return '<li style="margin-left:'+Math.min(depth,8)*10+'px"><strong>'+name+'</strong>: '+esc(value)+
            (entry.formula?'<span class="muted"> · '+raw+'</span>':entry.raw!==undefined?'<span class="muted"> · input '+raw+'</span>':'')+
            (entry.cycle?' <strong>Cycle</strong>':'')+'</li>'+
            (entry.dependencies||[]).map(child=>render(child,depth+1)).join('');
        };
        const count=report.dependents.length;
        dialog('Formula debugger','<p>Read-only calculation trace for <strong>'+esc(selected)+
          '</strong>. Input cells and intermediate results are shown below. The source worksheet is unchanged.</p>'+
          '<ul class="cap-results" aria-label="Formula dependency trace">'+render(report.root)+'</ul>'+
          '<p><strong>Direct dependents:</strong> '+(count?esc(report.dependents.slice(0,30).join(', ')):'None')+'</p>'+
          (report.truncated?'<p class="muted">Trace truncated to protect performance. Select an intermediate cell and inspect it separately.</p>':'')+
          '<p class="muted">Displayed results reflect the built-in formula evaluator. Unsupported formula types may report an error.</p>');
        return;
      }
      if(action==='writing-review'){
        if(f.type!=='docs')return;const report=writingReview(root());reviewTargets=report.issues.map(issue=>issue.node);
        dialog('Document inspector','<div class="pro-metrics"><div><strong>'+report.words+'</strong><span>Words</span></div><div><strong>'+report.minutes+' min</strong><span>Reading time</span></div><div><strong>'+report.headings+'</strong><span>Headings</span></div></div><p>Check headings, references, merge fields, images, tables and links before export. Select an issue to locate it in the document.</p><div class="cap-results">'+(report.issues.length?report.issues.map((issue,index)=>'<button class="cap-result" data-pro-review-target="'+index+'">'+icon('file-check-2',16)+esc(issue.label)+'</button>').join(''):'<p>No structural issues found by these checks.</p>')+'</div><p class="muted">Preflight does not prove print pagination, layout overflow, spelling, grammar or complete accessibility. Verify exported pages independently.</p>');return;
      }
      if(action==='summary-table'){
        if(f.type!=='sheets')return;ensureWorkbook(f);pending={id:f.id,sheet:f.activeSheetIndex};dialog('Summarize by group','<p>Create a summary snapshot in a new worksheet. Source cells and formulas stay intact.</p>'+input('pro-summary-range','Source range','A1:B10')+'<div class="cap-form">'+input('pro-summary-group','Group column','A','text','maxlength="1"')+input('pro-summary-value','Value column','B','text','maxlength="1"')+'</div><label class="cap-field">Aggregation<select id="pro-summary-operation" aria-label="Aggregation">'+['sum','average','min','max','count'].map(value=>'<option>'+value+'</option>').join('')+'</select></label><label class="cap-field"><span>First row contains headers</span><input type="checkbox" id="pro-summary-header" checked></label>','summary-table-apply');return;
      }
      if(action==='summary-table-apply'){
        if(f.type!=='sheets'||pending?.id!==f.id||pending.sheet!==f.activeSheetIndex)throw Error('Reopen the summary for this worksheet.');
        const result=summarizeTable(f.cells,document.getElementById('pro-summary-range').value,{group:document.getElementById('pro-summary-group').value.trim().toUpperCase(),value:document.getElementById('pro-summary-value').value.trim().toUpperCase(),operation:document.getElementById('pro-summary-operation').value,header:document.getElementById('pro-summary-header').checked});addSheet(f);Object.assign(f.cells,result.cells);close();save(f);ctx.toast(result.rows+' rows summarized into '+result.groups+' groups.');return;
      }
      if(action==='object-properties'){
        if(f.type!=='slides')return;const object=getSlideObject(f.slides[ctx.getSlideIndex()],ctx.getSlideObjectId());if(!object)throw Error('Select a slide object first.');pending={id:f.id,objectId:object.id,slide:ctx.getSlideIndex()};
        dialog('Object properties','<p>Precise position and size as percentages of the slide.</p><div class="cap-form">'+[['x','Left (%)'],['y','Top (%)'],['w','Width (%)'],['h','Height (%)'],['fontSize','Label size']].map(([key,label])=>input('pro-object-'+key,label,object[key]??22,'number','step="any"')).join('')+'<label class="cap-field">Rotation<select id="pro-object-rotation" aria-label="Rotation">'+[0,90,180,270].map(value=>'<option '+(value===(object.rotation||0)?'selected':'')+'>'+value+'</option>').join('')+'</select></label>'+input('pro-object-fill','Object fill',object.fill,'color')+input('pro-object-color','Label color',object.color,'color')+'</div><label class="cap-field">Object label<textarea id="pro-object-text" aria-label="Object label" maxlength="600" rows="3">'+esc(object.text||'')+'</textarea></label>'+objectStyleFields(object),'object-properties-apply');return;
      }
      if(action==='object-properties-apply'){
        if(f.type!=='slides'||pending?.id!==f.id||pending.slide!==ctx.getSlideIndex())throw Error('Reopen properties for this object.');const object=getSlideObject(f.slides[pending.slide],pending.objectId),values=Object.fromEntries(['x','y','w','h','fontSize','rotation','fill','color','text'].map(key=>[key,document.getElementById('pro-object-'+key).value]));const geometry=preciseObjectPatch(object,values),style=readObjectStyle();Object.assign(object,geometry,style);close();save(f);return;
      }
      if(action==='capture-tasks'){
        if(f.type!=='notes')return;pending={id:f.id};dialog('Capture tasks','<p>Add one task per line to this note. Existing content stays intact.</p><label class="cap-field">New tasks<textarea id="pro-task-capture" aria-label="New tasks" rows="6" maxlength="6030" placeholder="Review the draft&#10;Prepare the presentation"></textarea></label>','capture-tasks-apply');return;
      }
      if(action==='capture-tasks-apply'){
        if(f.type!=='notes'||pending?.id!==f.id)throw Error('Reopen task capture for this note.');const html=taskCaptureHTML(document.getElementById('pro-task-capture').value);root().insertAdjacentHTML('beforeend',html);close();updateBody(f);ctx.toast('Tasks added to this note.');return;
      }
      if(action==='callout'){
        if(f.type!=='docs')return;pending={id:f.id,index:selected.id===f.id?selected.index:-1};
        dialog('Insert a callout','<p>Give a decision, insight or next action a clear place in your document.</p><label class="cap-field">Style<select id="enhance-callout-kind"><option value="insight">Insight</option><option value="decision">Decision</option><option value="action">Action</option><option value="important">Important</option></select></label>'+input('enhance-callout-title','Title (optional)','','text','maxlength="80"')+'<label class="cap-field">Callout text<textarea id="enhance-callout-body" aria-label="Callout text" rows="5" maxlength="3000" placeholder="Add the useful detail…"></textarea></label>','callout-apply');return;
      }
      if(action==='callout-apply'){
        if(f.type!=='docs'||pending?.id!==f.id)throw Error('Open the callout tool for this document again.');const html=documentCallout({kind:document.getElementById('enhance-callout-kind').value,title:document.getElementById('enhance-callout-title').value,body:document.getElementById('enhance-callout-body').value}),editor=root(),block=pending.index>=0?editableBlocks(editor)[pending.index]:null;
        if(block)block.insertAdjacentHTML('afterend',html);else editor.insertAdjacentHTML('beforeend',html);close();updateBody(f);root()?.focus({preventScroll:true});return;
      }
      if(action==='text-formulas'){
        if(f.type!=='sheets')return;pending={id:f.id};const source=ctx.getSelectedCell()||'A1',row=Number(source.slice(1)),destination=source[0]!=='Z'?String.fromCharCode(source.charCodeAt(0)+1)+row:row<1000?'Z'+(row+1):'Y1000';
        dialog('Text tools','<p>Create a formula in another cell. The source stays intact and the result updates when its source changes.</p><label class="cap-field">Operation<select id="enhance-text-operation"><option value="trim">Clean extra spaces</option><option value="upper">Uppercase</option><option value="lower">Lowercase</option><option value="length">Count characters</option><option value="combine">Combine two cells with a space</option></select></label>'+input('enhance-text-source','Source cell',source,'text','maxlength="5"')+input('enhance-text-second','Second cell (combine only)','B1','text','maxlength="5"')+input('enhance-text-result','Empty result cell',destination,'text','maxlength="5"'),'text-formulas-apply');return;
      }
      if(action==='text-formulas-apply'){
        if(f.type!=='sheets'||pending?.id!==f.id)throw Error('Open the text tool for this worksheet again.');ensureWorkbook(f);const destination=document.getElementById('enhance-text-result').value.trim().toUpperCase(),source=document.getElementById('enhance-text-source').value.trim().toUpperCase(),second=document.getElementById('enhance-text-second').value.trim().toUpperCase(),operation=document.getElementById('enhance-text-operation').value;
        if(!/^[A-Z](?:[1-9]\d{0,2}|1000)$/.test(destination))throw Error('Choose a result cell from A1 to Z1000.');if(destination===source||operation==='combine'&&destination===second)throw Error('Choose a different result cell to avoid a circular formula.');if(String(f.cells[destination]??'')!=='')throw Error('Choose an empty result cell to keep existing content intact.');const formula=buildTextFormula(operation,source,second);f.cells[destination]=formula;close();save(f);ctx.toast('Text formula created in '+destination);return;
      }
      if(action==='distribute-horizontal'||action==='distribute-vertical'){
        if(f.type!=='slides')return;const count=distributeSlideObjects(f.slides[ctx.getSlideIndex()],action.endsWith('horizontal')?'horizontal':'vertical');save(f);ctx.toast(count+' objects distributed evenly.');return;
      }
      if(action==='note-task-export'){
        if(f.type!=='notes')return;const markdown=tasksMarkdown(notes().map(n=>({title:n.title,tasks:taskList(n).tasks})));ctx.download(markdown,'mysoft-workspace-tasks.md','text/markdown;charset=utf-8');ctx.toast('Task list exported');return;
      }
      if(action==='paragraph'){pending={id:f.id,index:selected.id===f.id?selected.index:0};const current=editableBlocks(root())[pending.index],style=current?.style||{};dialog('Paragraph settings','<p>Apply spacing and indentation to the current block or all paragraphs. Values are in pixels.</p><label class="cap-field">Scope<select id="cap-scope"><option value="block">Current block</option><option value="all">All paragraphs</option></select></label><div class="cap-form">'+input('cap-before','Space before',parseFloat(style.marginTop)||0,'number','min="0" max="80"')+input('cap-after','Space after',style.marginBottom?parseFloat(style.marginBottom):12,'number','min="0" max="80"')+input('cap-indent','First-line indent',parseFloat(style.textIndent)||0,'number','min="0" max="96"')+'<label class="cap-field">Line spacing<select id="cap-line">'+[1,1.2,1.5,1.6,2,2.5,3].map(n=>'<option '+(n===Number(style.lineHeight||f.pageSettings?.lineHeight||1.6)?'selected':'')+'>'+n+'</option>').join('')+'</select></label></div>','paragraph-apply');return;}
      if(action==='paragraph-apply'){if(pending?.id!==f.id)throw Error('Reopen paragraph settings for this document.');const options=paragraphOptions(Object.fromEntries(['before','after','indent','line'].map(k=>[k,document.getElementById('cap-'+k).value]))),list=blocks(f),selector='p,div,h1,h2,h3,blockquote,li,td,th',scope=document.getElementById('cap-scope').value==='all'?root():list[pending.index]||list[0],candidates=scope.matches(selector)?[scope,...scope.querySelectorAll(selector)]:[...scope.querySelectorAll(selector)],chosen=candidates.filter(node=>!node.querySelector(selector));for(const p of chosen){p.style.marginTop=options.before+'px';p.style.marginBottom=options.after+'px';p.style.textIndent=options.indent+'px';p.style.lineHeight=String(options.line);}close();updateBody(f);return;}
      if(action==='uppercase'||action==='lowercase'){const list=blocks(f),block=list[selected.id===f.id?selected.index:0]||list[0],walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode()))node.textContent=action==='uppercase'?node.textContent.toLocaleUpperCase():node.textContent.toLocaleLowerCase();updateBody(f);return;}
      if(action==='cleanup'){let count=0;for(const node of [...root().querySelectorAll('p')])if(!node.textContent.trim()&&!node.querySelector('img,table,hr')){node.remove();count++;}updateBody(f);ctx.toast(count+' empty paragraphs removed');return;}
      if(['unique','split','trim-cells'].includes(action)){pending={id:f.id,action};dialog(action==='unique'?'Extract unique rows':action==='split'?'Split text into columns':'Trim cell whitespace','<p>'+(action==='trim-cells'?'Clean text values in place. Formulas are preserved.':'Results open in a new worksheet. Source cells are kept.')+'</p>'+input('cap-range','Cell range',ctx.getSelectedCell()||'A1')+(action==='unique'?'<label class="cap-field"><span>Keep first row as header</span><input id="cap-header" type="checkbox" checked></label>':'')+(action==='split'?'<label class="cap-field">Separator<select id="cap-delimiter"><option value=",">Comma</option><option value=";">Semicolon</option><option value="|">Vertical bar</option><option value="tab">Tab</option><option value=" ">Space</option></select></label>':''),'table-apply');return;}
      if(action==='table-apply'){if(pending?.id!==f.id)throw Error('Reopen the table tool.');ensureWorkbook(f);const range=document.getElementById('cap-range').value,mode=pending.action;if(mode==='trim-cells'){const n=cleanCellWhitespace(f.cells,range);close();save(f);ctx.toast(n+' cells cleaned');return;}let delimiter=document.getElementById('cap-delimiter')?.value||',';if(delimiter==='tab')delimiter='\t';const result=transformedTable(f.cells,range,mode,{header:document.getElementById('cap-header')?.checked??true,delimiter});addSheet(f);Object.assign(f.cells,result.cells);close();save(f);ctx.toast(result.rows+' rows created in a new worksheet');return;}
      if(action==='outline'){dialog('Create slides from outline','<p>One slide per paragraph: first line is the title, remaining lines are the body. New slides are appended using the current design.</p><label class="cap-field">Outline<textarea id="cap-outline" maxlength="100000" rows="10" placeholder="First slide title&#10;First point&#10;&#10;Second slide title&#10;Another point"></textarea></label>','outline-apply');return;}
      if(action==='outline-apply'){const slides=slidesFromOutline(document.getElementById('cap-outline').value,f.slides[ctx.getSlideIndex()]);if(f.slides.length+slides.length>200)throw Error('Maximum 200 slides per deck.');const start=f.slides.length;f.slides.push(...slides);ctx.setSlideIndex(start);close();save(f);return;}
      if(action==='reverse'){const current=f.slides[ctx.getSlideIndex()];f.slides.reverse();ctx.setSlideIndex(f.slides.indexOf(current));save(f);return;}
      if(action==='copy-design'){const source=f.slides[ctx.getSlideIndex()];for(const slide of f.slides){copySlideAppearance(source,slide);if(source.customization)slide.customization=structuredClone(source.customization);else delete slide.customization;for(const key of ['layout','textScale','transition'])if(source[key]!==undefined)slide[key]=source[key];}save(f);ctx.toast('Current design applied to all slides');return;}
      if(action==='outline-export'){ctx.download(slideOutline(f.slides),f.title.replace(/[^a-z0-9_-]+/gi,'-')+'-outline.md','text/markdown;charset=utf-8');return;}
      if(action==='workspace-link'){
        const choices=ctx.getFiles().filter(item=>item.id!==f.id).slice(0,500);
        dialog('Link a MySoft file','<p>References stay local to this workspace and resolve by stable file ID.</p><div class="cap-results">'+
          (choices.length?choices.map(item=>'<button class="cap-result" data-capability-action="workspace-link-insert" data-workspace-target="'+esc(item.id)+'">'+esc(item.title)+'<small>'+esc(item.type)+'</small></button>').join(''):'<p>Create another MySoft file to link it.</p>')+'</div>');return;
      }
      if(action==='workspace-link-insert'){
        if(!['docs','notes'].includes(f.type))throw Error('Open Docs or Notes to insert a link.');
        const linked=ctx.getFiles().find(item=>item.id===target.dataset.workspaceTarget&&item.id!==f.id);
        if(!linked)return;
        f.body=ctx.sanitize((f.body||'')+'<p><a href="#/file/'+esc(linked.id)+'">'+esc(linked.title)+'</a></p>');
        close();save(f);ctx.toast('Local file reference inserted');return;
      }
      if(action==='workspace-references'){
        const refs=workspaceLinks(ctx.getFiles(),f.id);
        const links=items=>items.length?items.map(item=>'<button class="cap-result" data-capability-open="'+esc(item.id)+'">'+esc(item.title)+'<small>'+esc(item.type)+'</small></button>').join(''):'<p>No references.</p>';
        dialog('Linked MySoft files','<h3>Links from this file</h3><div class="cap-results">'+links(refs.outgoing)+'</div>'+
          '<h3>Files linking here</h3><div class="cap-results">'+links(refs.incoming)+'</div>'+
          (refs.missing.length?'<p>'+refs.missing.length+' referenced file(s) are missing or in Trash.</p>':''));return;
      }
      if(action==='note-link'){dialog('Link another note','<div class="cap-results">'+notes().filter(n=>n.id!==f.id).map(n=>'<button class="cap-result" data-capability-action="note-link-insert" data-note-target="'+esc(n.id)+'">'+esc(n.title)+'</button>').join('')+'</div>');return;}
      if(action==='note-link-insert'){const note=notes().find(n=>n.id===target.dataset.noteTarget);if(!note)return;f.body=ctx.sanitize((f.body||'')+'<p><a href="#/file/'+esc(note.id)+'">'+esc(note.title)+'</a></p>');close();save(f);return;}
      if(action==='note-backlinks'){const ids=noteLinkIds(f.body),linked=notes().filter(n=>ids.includes(n.id)),back=notes().filter(n=>n.id!==f.id&&noteLinkIds(n.body).includes(f.id));const list=items=>items.length?items.map(n=>'<button class="cap-result" data-capability-open="'+esc(n.id)+'">'+esc(n.title)+'</button>').join(''):'<p>No linked notes yet.</p>';dialog('Linked notes','<h3>Links from this note</h3><div class="cap-results">'+list(linked)+'</div><h3>Notes linking here</h3><div class="cap-results">'+list(back)+'</div>');return;}
      if(action==='note-tasks'){showTasks();return;}
      if(action==='note-project'||action==='note-research'){f.body=ctx.sanitize((f.body||'')+NOTE_TEMPLATES[action.slice(5)]);save(f);return;}
    }catch(error){ctx.toast(error.message||'This tool could not complete the change.');}
  });
}
