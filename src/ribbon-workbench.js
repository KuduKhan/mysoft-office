import {icon} from './icons.js';
import {parseRange} from './sheet-range.js';
export function aggregateFormula(cells,ref,operation,range){
 if(!['SUM','AVERAGE','MIN','MAX','COUNT'].includes(operation)||!/^([A-Z])([1-9]\d{0,3})$/.test(ref))throw Error('Choose a supported function and result cell.');const target=parseRange(ref),source=parseRange(range);
 if(String(cells[ref]??'')!=='')throw Error('Choose an empty result cell first.');if(target.left>=source.left&&target.left<=source.right&&target.top>=source.top&&target.top<=source.bottom)throw Error('The result cell cannot be inside its source range.');return '='+operation+'('+String.fromCharCode(65+source.left)+source.top+':'+String.fromCharCode(65+source.right)+source.bottom+')';
}
function toolbarCategory(node,type){
 const action=node.dataset.pdfAction||node.dataset.mediaAction||node.querySelector('[data-pdf-action],[data-media-action]')?.dataset.pdfAction||'';
 if(type==='pdf'){
  if(node.querySelector('#pdf-page-number')||['previous','next','first','last'].includes(action))return 'Page navigation';
  if(node.querySelector('#pdf-zoom')||/^zoom-/.test(action))return 'Page view';
  if(['undo','redo'].includes(action))return 'History';
  if(/rotate|^reset$/.test(action))return 'Page rotation';
  if(action==='import')return 'Source';return 'Publish & export';
 }
 if(['open','original'].includes(action))return 'Source';if(['undo','redo'].includes(action))return 'History';
 if(['frame','storyboard','preview-png'].includes(action))return 'Capture & export';if(action==='compare')return 'Compare';return 'Canvas view';
}
export function initializeRibbonWorkbench(){
 let density='compact';try{density=localStorage.getItem('mysoft-office-ribbon-density')==='comfortable'?'comfortable':'compact';}catch{}
 document.documentElement.dataset.ribbonDensity=density;
 const app=document.getElementById('app');let scheduled=false;
 function update(stage,nav){
  const max=stage.scrollWidth-stage.clientWidth,left=stage.scrollLeft;nav.querySelector('[data-ribbon-move="back"]').disabled=left<2;nav.querySelector('[data-ribbon-move="next"]').disabled=left>=max-2;
  nav.classList.toggle('has-overflow',max>2);const groups=[...stage.querySelectorAll(':scope > .mo-ribbon-group')],closest=groups.reduce((best,group,index)=>Math.abs(group.getBoundingClientRect().left-stage.getBoundingClientRect().left)<best.distance?{index,distance:Math.abs(group.getBoundingClientRect().left-stage.getBoundingClientRect().left)}:best,{index:0,distance:Infinity});nav.querySelector('[data-ribbon-group]').value=String(closest.index);
 }
 function install(stage,type){
  if(stage.dataset.ribbonReady)return;stage.dataset.ribbonReady='true';
  if(type!=='office'){
   if(type==='pdf')for(const node of [...stage.querySelectorAll(':scope > .pdf-tool-group')])if(!node.querySelector('#pdf-page-number'))node.replaceWith(...node.childNodes);
   const groups=new Map();for(const node of [...stage.children]){const name=toolbarCategory(node,type);if(!groups.has(name))groups.set(name,[]);groups.get(name).push(node);}
   for(const [name,nodes]of groups){const group=document.createElement('section');group.className='mo-ribbon-group mo-action-group native-tool-group';group.setAttribute('aria-label',name);group.tabIndex=-1;const heading=document.createElement('h3');heading.textContent=name;const controls=document.createElement('div');controls.className='mo-control-grid';group.append(heading,controls);for(const node of nodes){if(type==='pdf'&&node.matches('button[aria-label]')&&!node.textContent.trim()){const span=document.createElement('span');span.textContent=node.getAttribute('aria-label');node.append(span);}controls.append(node);}if(controls.querySelector('input,select')){group.classList.remove('mo-action-group');group.classList.add('mo-field-group');if(nodes.length>=5)group.classList.add('mo-wide-fields');}else if(nodes.length<=2)group.classList.add('mo-few-actions');stage.append(group);}
   const wrapper=document.createElement('div');wrapper.className='ribbon-workbench';stage.before(wrapper);wrapper.append(stage);stage.classList.add('native-ribbon-stage');stage.tabIndex=0;stage.setAttribute('aria-label',type==='pdf'?'PDF ribbon tools':'Media ribbon tools');
  }
  const groups=[...stage.querySelectorAll(':scope > .mo-ribbon-group')];if(!groups.length)return;
  groups.forEach(group=>group.tabIndex=-1);
  const nav=document.createElement('div');nav.className='ribbon-navigation';nav.setAttribute('aria-label','Ribbon navigation');
  nav.innerHTML='<button type="button" data-ribbon-move="back" aria-label="Previous tool group">'+icon('arrow-left',14)+'</button><select data-ribbon-group aria-label="Jump to tool group"></select><button type="button" data-ribbon-move="next" aria-label="Next tool group">'+icon('arrow-right',14)+'</button><span class="ribbon-scroll-hint">More tools</span><label class="ribbon-density-label"><span>Tools</span><select data-ribbon-density aria-label="Ribbon density"><option value="compact">Compact</option><option value="comfortable">Comfortable</option></select></label>';
  const select=nav.querySelector('[data-ribbon-group]');groups.forEach((group,index)=>{const option=document.createElement('option');option.value=index;option.textContent=group.querySelector('h3')?.textContent||group.getAttribute('aria-label');select.append(option);});nav.querySelector('[data-ribbon-density]').value=density;stage.after(nav);
  if(type!=='office'){const toggle=document.createElement('button');toggle.type='button';toggle.dataset.ribbonToggle='';nav.append(toggle);let collapsed=false;try{collapsed=localStorage.getItem('mysoft-office-native-ribbon-'+type)==='collapsed';}catch{}const apply=()=>{stage.hidden=collapsed;toggle.setAttribute('aria-label',collapsed?'Show ribbon tools':'Hide ribbon tools');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.innerHTML=icon(collapsed?'arrow-down':'arrow-up',14);select.disabled=collapsed;};toggle.addEventListener('click',()=>{collapsed=!collapsed;try{localStorage.setItem('mysoft-office-native-ribbon-'+type,collapsed?'collapsed':'open');}catch{}apply();});apply();}
  const move=index=>{const group=groups[Math.max(0,Math.min(groups.length-1,index))];stage.scrollTo({left:Math.max(0,group.getBoundingClientRect().left-stage.getBoundingClientRect().left+stage.scrollLeft),top:0,behavior:'instant'});group.focus({preventScroll:true});update(stage,nav);};
  nav.addEventListener('click',event=>{const button=event.target.closest('[data-ribbon-move]');if(!button)return;const index=Number(select.value);move(index+(button.dataset.ribbonMove==='next'?1:-1));});
  select.addEventListener('change',()=>move(Number(select.value)));
  nav.querySelector('[data-ribbon-density]').addEventListener('change',event=>{density=event.target.value;document.documentElement.dataset.ribbonDensity=density;try{localStorage.setItem('mysoft-office-ribbon-density',density);}catch{}document.querySelectorAll('[data-ribbon-density]').forEach(el=>el.value=density);});
  stage.addEventListener('scroll',()=>update(stage,nav),{passive:true});const observer=new ResizeObserver(()=>{if(stage.isConnected)update(stage,nav);else observer.disconnect();});observer.observe(stage);requestAnimationFrame(()=>update(stage,nav));
 }
 function synchronize(){scheduled=false;document.querySelectorAll('.ot-ribbon-tools,.pdf-toolbar,.media-toolbar').forEach(stage=>install(stage,stage.classList.contains('pdf-toolbar')?'pdf':stage.classList.contains('media-toolbar')?'media':'office'));updateTextState();}
 new MutationObserver(()=>{if(!scheduled){scheduled=true;queueMicrotask(synchronize);}}).observe(app,{childList:true,subtree:true});
 document.addEventListener('keydown',event=>{if(event.altKey&&event.key.toLowerCase()==='r'&&!document.querySelector('.modal-backdrop')){const target=document.querySelector('.ot-tab.active')||document.querySelector('[data-ribbon-group]');if(target){event.preventDefault();target.focus();}}});
 function updateTextState(){
  const root=document.getElementById('rich-content'),selection=getSelection();if(!root||!selection?.anchorNode||!root.contains(selection.anchorNode))return;
  for(const [action,command]of Object.entries({'text-bold':'bold','text-italic':'italic','text-underline':'underline',strike:'strikeThrough','bullet-list':'insertUnorderedList','numbered-list':'insertOrderedList'})){const button=document.querySelector('[data-ot-action="'+action+'"]');if(button)button.setAttribute('aria-pressed',String(document.queryCommandState(command)));}
 }
 document.addEventListener('selectionchange',updateTextState);
 synchronize();
}
