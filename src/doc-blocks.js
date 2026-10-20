// Incremental semantic block operations for the browser's current contenteditable document.
// This is a stepping stone to a transactional rich-text engine, not full document pagination.
const BLOCKS=new Set(['P','DIV','H1','H2','H3','UL','OL','BLOCKQUOTE','TABLE','HR']);
const ACTIONS=new Set(['move-up','move-down','heading-up','heading-down','new-section','page-break']);
export function editableBlocks(root){return [...(root?.children||[])].filter(el=>BLOCKS.has(el.tagName));}
export function blockIndexFromSelection(root,selection){
  if(!root||!selection?.anchorNode||!root.contains(selection.anchorNode))return null;
  let node=selection.anchorNode;
  while(node&&node.parentNode!==root)node=node.parentNode;
  const index=editableBlocks(root).indexOf(node);
  return index<0?null:index;
}
export function applyDocumentBlockAction(root,action,index=0){
  if(!ACTIONS.has(action)||!root)throw Error('Unsupported document operation.');
  const blocks=editableBlocks(root);
  if(!blocks.length){
    const para=root.ownerDocument.createElement('p');
    para.textContent='';root.appendChild(para);blocks.push(para);
  }
  if(!Number.isInteger(index)||index<0||index>=blocks.length)
    throw Error('Select a document paragraph first.');
  const current=blocks[index];
  if(action==='move-up'||action==='move-down'){
    const other=blocks[index+(action==='move-up'?-1:1)];
    if(!other)return {changed:false,index};
    if(action==='move-up')root.insertBefore(current,other);
    else root.insertBefore(other,current);
    return {changed:true,index:index+(action==='move-up'?-1:1)};
  }
  if(action==='heading-up'||action==='heading-down'){
    const tags=['P','H3','H2','H1'];
    const level=tags.indexOf(current.tagName),old=level<0?0:level;
    const updated=action==='heading-up'?Math.min(old+1,3):Math.max(old-1,0);
    if(updated===old)return {changed:false,index};
    const replacement=root.ownerDocument.createElement(tags[updated].toLowerCase());
    while(current.firstChild)replacement.appendChild(current.firstChild);
    root.replaceChild(replacement,current);
    return {changed:true,index};
  }
  if(action==='new-section'){
    const heading=root.ownerDocument.createElement('h2');
    heading.textContent='New section';
    const para=root.ownerDocument.createElement('p');para.textContent='Start writing…';
    current.after(heading,para);
    return {changed:true,index:index+1};
  }
  if(action==='page-break'){
    const divider=root.ownerDocument.createElement('hr');
    divider.setAttribute('data-mysoft-page-break','true');
    current.after(divider);
    return {changed:true,index:index+1};
  }
  return {changed:false,index};
}
