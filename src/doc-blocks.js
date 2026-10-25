// Incremental semantic block operations for the browser's current contenteditable document.
// This is a stepping stone to a transactional rich-text engine, not full document pagination.
const BLOCKS=new Set(['P','DIV','H1','H2','H3','UL','OL','BLOCKQUOTE','TABLE','HR']);
const ACTIONS=new Set(['move-up','move-down','heading-up','heading-down','new-section','page-break','duplicate']);
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
  // Validate the target before wrapping orphan text nodes. Invalid selection
  // must not mutate the authoring DOM.
  if(!blocks.length&&index!==0)throw Error('Select a document paragraph first.');
  if(!blocks.length){
    const para=root.ownerDocument.createElement('p');
    // Browsers can create plain text nodes at the root of a contenteditable;
    // wrap those nodes instead of silently acting on a separate empty paragraph.
    while(root.firstChild)para.appendChild(root.firstChild);
    root.appendChild(para);blocks.push(para);
  }
  if(!Number.isInteger(index)||index<0||index>=blocks.length)
    throw Error('Select a document paragraph first.');
  const current=blocks[index];
  if(action==='duplicate'){
    if(blocks.length>=300)throw Error('This document has too many blocks to duplicate.');
    if(!['P','DIV','H1','H2','H3','BLOCKQUOTE'].includes(current.tagName))
      throw Error('Duplicate a paragraph, heading or quote. Tables and lists are not supported.');
    if(current.outerHTML.length>100000)throw Error('This block is too large to duplicate.');
    const copy=current.cloneNode(true);
    // DOM ids must remain unique after duplication; strip executable attributes.
    for(const element of [copy,...copy.querySelectorAll('*')]){
      element.removeAttribute('id');
      for(const {name} of [...element.attributes])if(name.toLowerCase().startsWith('on'))element.removeAttribute(name);
    }
    current.after(copy);
    return {changed:true,index:index+1};
  }
  if(action==='move-up'||action==='move-down'){
    const other=blocks[index+(action==='move-up'?-1:1)];
    if(!other)return {changed:false,index};
    if(action==='move-up')root.insertBefore(current,other);
    else root.insertBefore(other,current);
    return {changed:true,index:index+(action==='move-up'?-1:1)};
  }
  if(action==='heading-up'||action==='heading-down'){
    const tags=['P','H3','H2','H1'];
    const old=tags.indexOf(current.tagName);
    if(old<0)throw Error('Select a paragraph or heading; tables and lists cannot become headings.');
    const updated=action==='heading-up'?Math.min(old+1,3):Math.max(old-1,0);
    if(updated===old)return {changed:false,index};
    const replacement=root.ownerDocument.createElement(tags[updated].toLowerCase());
    // Retain the supported paragraph-level presentation and accessibility
    // attributes; do not carry event handlers or arbitrary DOM attributes.
    for(const attr of ['style','class','id','dir','lang','title']){
      if(current.hasAttribute(attr))replacement.setAttribute(attr,current.getAttribute(attr));
    }
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
