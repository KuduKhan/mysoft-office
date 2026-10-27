import {icon} from './icons.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const groups={
 Home:['Text transformations',[['sentence','Sentence case','type'],['title','Capitalize words','type']]],
 Insert:['Document building blocks',[['signature','Signature block','file-text'],['timestamp','Date & time','clock'],['nbsp','Nonbreaking space','type']]],
 Structure:['Paragraph workflow',[['split','Split paragraph','pilcrow'],['join','Join next paragraph','pilcrow'],['select','Select paragraph','type'],['outline','Download heading outline','download']]],
 Table:['Table structure',[['row-before','Row above','table'],['column-before','Column left','table'],['duplicate-row','Duplicate row','copy'],['header','Toggle header row','table-properties']]],
 Layout:['Print flow',[['keep','Keep paragraph together','file-text'],['next','Keep with next paragraph','file-text']]],
 Review:['Document insights',[['stats','Document statistics','file-check-2'],['links','Check document links','link'],['repeated','Find repeated paragraphs','search']]],
 Tools:['Portable copies',[['html','Download HTML copy','download'],['text','Download plain text','download']]]
};
export function documentRibbonExtras(file,tab){
 if(file.type!=='docs'||!groups[tab])return '';
 const [name,tools]=groups[tab];return '<section class="mo-ribbon-group mo-action-group" aria-label="'+name+'" tabindex="-1"><h3>'+name+'</h3><div class="mo-control-grid">'+tools.map(([action,label,glyph])=>'<button type="button" class="ot-btn" data-ot-action="docplus-'+action+'" aria-label="'+label+'" title="'+label+'">'+icon(glyph,15)+'<span>'+label+'</span></button>').join('')+'</div></section>';
}
function selectedBlock(root,range){
 let node=range?.startContainer;if(node?.nodeType===3)node=node.parentElement;
 const block=node?.closest('p,h1,h2,h3,blockquote,li');return block&&root.contains(block)?block:null;
}
export function changeTextCase(root,range,kind){
 const block=selectedBlock(root,range);if(!range||!root.contains(range.commonAncestorContainer))throw Error('Select text or place the cursor in a paragraph.');
 const scope=range.collapsed?block:root;if(!scope)throw Error('Place the cursor in a paragraph first.');
 const walker=root.ownerDocument.createTreeWalker(scope,NodeFilter.SHOW_TEXT),edits=[];let node,started=false;
 while((node=walker.nextNode())){
  if(!range.collapsed&&!range.intersectsNode(node))continue;
  const start=!range.collapsed&&node===range.startContainer?range.startOffset:0,end=!range.collapsed&&node===range.endContainer?range.endOffset:node.length;
  const text=node.data.slice(start,end);if(!text)continue;
  let value='';for(const character of text){
   if(/\p{L}/u.test(character)){value+=!started?character.toLocaleUpperCase():character.toLocaleLowerCase();started=true;}
   else {value+=character;if(kind==='title'?!/[\p{M}'’]/u.test(character):/[.!?]/.test(character))started=false;}
  }
  edits.push({node,start,end,value});
 }
 for(const edit of edits)edit.node.replaceData(edit.start,edit.end-edit.start,edit.value);
 return edits.length;
}
export function editDocumentTable(table,cell,action){
 if(!table||!cell)throw Error('Place your cursor inside a table cell first.');
 if(table.querySelector('table')||[...table.querySelectorAll('td,th')].some(c=>c.colSpan!==1||c.rowSpan!==1))throw Error('Use a simple table without merged cells or nested tables.');
 const rows=[...table.rows];if(rows.some(row=>row.cells.length!==rows[0].cells.length))throw Error('Use a table with the same number of cells in each row.');
 const row=cell.parentElement;
 if(action==='header'){
  const header=rows[0],tag=[...header.cells].every(c=>c.tagName==='TH')?'td':'th';
  for(const old of [...header.cells]){const replacement=table.ownerDocument.createElement(tag);if(old.hasAttribute('style'))replacement.setAttribute('style',old.getAttribute('style'));if(tag==='th')replacement.setAttribute('scope','col');while(old.firstChild)replacement.append(old.firstChild);old.replaceWith(replacement);}return;
 }
 if(action==='column-before'){
  if(row.cells.length>=26)throw Error('Keep tables within 26 columns.');const index=cell.cellIndex;
  for(const r of rows){const added=table.ownerDocument.createElement(r.cells[index].tagName.toLowerCase());added.textContent='Cell';r.cells[index].before(added);}return;
 }
 if(rows.length>=200)throw Error('Keep tables within 200 rows.');
 const copy=row.cloneNode(true);for(const n of [copy,...copy.querySelectorAll('*')])n.removeAttribute('id');
 if(action==='row-before')for(const c of copy.cells)c.textContent='Cell';
 if(action==='row-before')row.before(copy);else row.after(copy);
}
export function handleDocumentRibbonAction(ctx,action,savedRange){
 const file=ctx.getFile(),root=document.getElementById('rich-content');if(file?.type!=='docs'||!root)return;
 const kind=action.replace('docplus-','');let range=savedRange&&root.contains(savedRange.commonAncestorContainer)?savedRange.cloneRange():null;
 if(!range){const selection=getSelection();if(selection?.rangeCount&&root.contains(selection.anchorNode))range=selection.getRangeAt(0).cloneRange();}
 const block=selectedBlock(root,range);
 const report=(title,body)=>{document.getElementById('modal-root').innerHTML='<div class="modal-backdrop"><section class="modal cap-modal" role="dialog" aria-modal="true" aria-label="'+title+'"><h2>'+title+'</h2><div class="advanced-preview">'+body+'</div><div class="modal-actions"><button type="button" class="btn btn-light" data-ot-action="settings-close">Done</button></div></section></div>';};
 const commit=()=>{ctx.sealHistory?.(file);file.body=ctx.sanitize(root.innerHTML);ctx.sealHistory?.(file);ctx.touch(file);void ctx.persist();ctx.render();ctx.toast('Document updated');};
 const insert=html=>{root.focus();const selection=getSelection();if(range){selection.removeAllRanges();selection.addRange(range);}else{const end=document.createRange();end.selectNodeContents(root);end.collapse(false);selection.removeAllRanges();selection.addRange(end);}document.execCommand('insertHTML',false,html);commit();};
 const download=(body,extension,mime)=>ctx.download(body,(file.title.replace(/[^a-z0-9_-]+/gi,'-')||'document')+'.'+extension,mime);
 try{
  if(kind==='stats'){
   const text=root.innerText||'',words=text.trim()?text.trim().split(/\s+/u).length:0;
   report('Document statistics','<p><strong>'+esc(file.title)+'</strong></p><p>'+words+' words · '+text.length+' characters</p><p>'+root.querySelectorAll('p').length+' paragraphs · '+root.querySelectorAll('h1,h2,h3').length+' headings</p><p>'+root.querySelectorAll('table').length+' tables · '+root.querySelectorAll('img').length+' images · '+root.querySelectorAll('a').length+' links</p><p>Estimated reading time: '+Math.max(1,Math.ceil(words/200))+' minute(s)</p>');return;
  }
  if(kind==='links'){
   const known=new Set(ctx.getFiles().map(f=>f.id)),links=[...root.querySelectorAll('a')];
   report('Document link check','<p>Checks link structure and local file targets. Website availability is not checked.</p>'+(links.length?links.map(a=>{const href=a.getAttribute('href')||'',local=href.startsWith('#/file/'),status=local?(known.has(href.slice(7))?'Local file available':'Local file missing'):/^https?:\/\//i.test(href)?'Website link':'Unsupported address';return '<p><strong>'+esc(a.textContent||'(No link text)')+'</strong><br>'+esc(status)+' · '+esc(href)+'</p>';}).join(''):'<p>No links in this document.</p>'));return;
  }
  if(kind==='repeated'){
   const seen=new Map();for(const p of root.querySelectorAll('p')){const value=p.textContent.trim().replace(/\s+/g,' ');if(value) {const key=value.toLocaleLowerCase();const entry=seen.get(key)||{value,count:0};entry.count++;seen.set(key,entry);}}
   const repeated=[...seen.values()].filter(e=>e.count>1);report('Repeated paragraphs',repeated.length?repeated.map(e=>'<p><strong>'+e.count+' occurrences</strong><br>'+esc(e.value.slice(0,500))+'</p>').join(''):'<p>No repeated paragraphs found. Matching ignores case and repeated spaces.</p>');return;
  }
  if(kind==='outline'){download([...root.querySelectorAll('h1,h2,h3')].map(h=>'#'.repeat(Number(h.tagName[1]))+' '+h.textContent).join('\n\n'),'md','text/markdown;charset=utf-8');return;}
  if(kind==='text'){download(root.innerText,'txt','text/plain;charset=utf-8');return;}
  if(kind==='html'){download('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(file.title)+'</title><style>body{max-width:800px;margin:40px auto;padding:0 24px;font:16px/1.6 Arial,sans-serif;color:#26343e}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #cbd2da;padding:8px}th{background:#eef2f6}blockquote{border-left:3px solid #ccd4df;padding-left:16px}hr[data-mysoft-page-break]{break-after:page}</style><body>'+ctx.sanitize(root.innerHTML)+'</body></html>','html','text/html;charset=utf-8');return;}
  if(kind==='timestamp'){insert(esc(new Date().toLocaleString()));return;}
  if(kind==='nbsp'){insert('&nbsp;');return;}
  if(kind==='signature'){const name=prompt('Signature name (editable after insertion):','');if(name===null)return;const role=prompt('Role or title (optional):','');if(role===null)return;insert('<p><strong>'+esc(name.trim().slice(0,120)||'Your name')+'</strong><br>'+esc(role.trim().slice(0,120))+'<br>'+esc(new Date().toLocaleDateString())+'</p><p></p>');return;}
  if(['sentence','title'].includes(kind)){changeTextCase(root,range,kind);commit();return;}
  if(['row-before','column-before','duplicate-row','header'].includes(kind)){
   let anchor=range?.startContainer;if(anchor?.nodeType===3)anchor=anchor.parentElement;const cell=anchor?.closest('td,th');editDocumentTable(cell?.closest('table'),cell,kind);commit();return;
  }
  if(!block)throw Error('Place the cursor in a paragraph first.');
  if(kind==='select'){const selected=document.createRange();selected.selectNodeContents(block);root.focus();getSelection().removeAllRanges();getSelection().addRange(selected);return;}
  if(kind==='keep'||kind==='next'){const prop=kind==='keep'?'breakInside':'breakAfter';block.style[prop]=block.style[prop]==='avoid'?'':'avoid';commit();return;}
  if(kind==='split'){
   if(!range.collapsed||!['P','H1','H2','H3'].includes(block.tagName))throw Error('Place the cursor within one paragraph or heading to split it.');
   const tail=range.cloneRange();tail.setEnd(block,block.childNodes.length);const next=block.cloneNode(false);next.removeAttribute('id');next.append(tail.extractContents());if(!next.childNodes.length)next.append(document.createElement('br'));if(!block.childNodes.length)block.append(document.createElement('br'));block.after(next);commit();return;
  }
  if(kind==='join'){
   const next=block.nextElementSibling;if(block.tagName!=='P'||next?.tagName!=='P')throw Error('Select a paragraph followed immediately by another paragraph.');
   if(block.textContent&&!/\s$/.test(block.textContent)&&next.textContent&&!/^\s/.test(next.textContent))block.append(document.createTextNode(' '));while(next.firstChild)block.append(next.firstChild);next.remove();commit();return;
  }
 }catch(error){ctx.toast(String(error.message||error).slice(0,180));}
}
