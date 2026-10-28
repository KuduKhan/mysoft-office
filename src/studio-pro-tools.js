import {parseRange} from './sheet-range.js';
import {displayCell} from './formulas.js';

export function readableEditorText(root){
  const copy=root.cloneNode(true),doc=root.ownerDocument;
  for(const node of copy.querySelectorAll('br,p,div,h1,h2,h3,h4,h5,h6,li,blockquote,tr,td,th'))node.after(doc.createTextNode('\n'));
  return (copy.textContent||'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}

export function summarizeTable(cells,range,{group='A',value='B',operation='sum',header=true}={}){
  const bounds=parseRange(range),column=key=>{if(!/^[A-Z]$/.test(key))throw Error('Choose a column from A to Z.');const index=key.charCodeAt(0)-65;if(index<bounds.left||index>bounds.right)throw Error('Both columns must be inside the source range.');return index;};
  column(group);column(value);
  if(!['sum','average','min','max','count'].includes(operation))throw Error('Choose a supported summary.');
  const groups=new Map();let rows=0;
  for(let row=bounds.top+(header?1:0);row<=bounds.bottom;row++){
    const key=String(displayCell(group+row,cells)??'').trim(),raw=displayCell(value+row,cells);
    if(!key&&String(raw??'').trim()==='')continue;
    if(/^#(?:ERROR|REF|DIV|CYCLE|VALUE|NAME|NUM|N\/A)/i.test(key)||/^#(?:ERROR|REF|DIV|CYCLE|VALUE|NAME|NUM|N\/A)/i.test(String(raw)))throw Error('Resolve the formula error in source row '+row+' first.');
    const label=key||'(Blank)';if(/^\s*=/.test(label)||label.length>20000)throw Error('A group label cannot be safely written as cell text. Source cells were kept.');
    if(!groups.has(label))groups.set(label,{rows:0,count:0,sum:0,min:Infinity,max:-Infinity});
    const item=groups.get(label);item.rows++;rows++;
    if(operation!=='count'&&String(raw??'').trim()!==''){
      const number=Number(raw);if(!Number.isFinite(number))throw Error('Expected a numeric value in '+value+row+'. Use Count for text.');
      item.count++;item.sum+=number;item.min=Math.min(item.min,number);item.max=Math.max(item.max,number);
      if(!Number.isFinite(item.sum))throw Error('Summary exceeds the supported numeric range.');
    }
  }
  if(!groups.size)throw Error('Choose a range with data rows.');if(groups.size>999)throw Error('Use fewer than 1000 distinct groups.');
  const result={A1:header?String(displayCell(group+bounds.top,cells)||'Group'):'Group',B1:operation.charAt(0).toUpperCase()+operation.slice(1)};
  if(/^\s*=/.test(result.A1))result.A1='Group';
  [...groups].forEach(([label,item],index)=>{result['A'+(index+2)]=label;result['B'+(index+2)]=operation==='count'?item.rows:operation==='sum'?item.sum:!item.count?'':operation==='average'?item.sum/item.count:item[operation];});
  return {cells:result,groups:groups.size,rows};
}

export function preciseObjectPatch(object,input){
  if(!object)throw Error('Select an object first.');const next={...object};
  for(const key of ['x','y','w','h','fontSize','rotation']){
    if(String(input[key]??'').trim()==='')throw Error('Fill in every geometry field.');const value=Number(input[key]);if(!Number.isFinite(value))throw Error('Use finite numbers for object geometry.');next[key]=value;
  }
  if(next.x<0||next.y<0||next.w<5||next.h<5||next.x+next.w>100||next.y+next.h>100)throw Error('Keep the object inside the slide; minimum width and height are 5%.');
  if(![0,90,180,270].includes(next.rotation))throw Error('Choose a quarter-turn rotation.');
  if(!Number.isInteger(next.fontSize)||next.fontSize<10||next.fontSize>56)throw Error('Text size must be 10–56.');
  for(const key of ['fill','color']){if(!/^#[0-9a-f]{6}$/i.test(input[key]))throw Error('Choose valid fill and text colors.');next[key]=input[key];}
  next.text=String(input.text??'');if(next.text.length>600)throw Error('Use at most 600 characters for the label.');
  return next;
}

export function taskCaptureHTML(text){
  const lines=String(text??'').split(/\r?\n/).map(line=>line.trim().replace(/^(?:[-*]|☐|☑)\s*/,'')).filter(Boolean);
  if(!lines.length||lines.length>30||lines.some(line=>line.length>200))throw Error('Enter 1–30 tasks, up to 200 characters each.');
  const esc=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return '<ul>'+lines.map(line=>'<li>☐ '+esc(line)+'</li>').join('')+'</ul>';
}

export function writingReview(root){
  const text=readableEditorText(root);
  const words=(text.match(/[\\p{L}\\p{N}]+(?:['’_-][\\p{L}\\p{N}]+)*/gu)||[]).length;
  const issues=[],add=(node,label)=>{if(issues.length<100)issues.push({node,label});};
  const headings=[...root.querySelectorAll('h1,h2,h3,h4,h5,h6')];
  if(text.trim()&&!headings.length)add(root,'No headings found: use headings to organize a longer document');
  let previous=0;
  for(const node of headings){
    const level=Number(node.tagName[1]);
    if(level>previous+1)add(node,'Heading level jumps to '+node.tagName.toUpperCase()+': '+node.textContent.trim().slice(0,70));
    if(!node.textContent.trim())add(node,'Empty heading');
    previous=level;
  }
  for(const node of root.querySelectorAll('img')){
    const alt=node.getAttribute('alt');
    // Empty alt is legitimate for purely decorative images; missing alt is not.
    if(alt===null||/^(inserted picture|image|picture)$/i.test((alt||'').trim()))
      add(node,'Image needs descriptive alt text, or an intentionally empty alt for decoration');
  }
  const anchorIds=new Set();
  for(const node of root.querySelectorAll('[id]')){
    const id=node.getAttribute('id');
    if(!id)continue;
    if(anchorIds.has(id))add(node,'Duplicate bookmark / element ID: '+id.slice(0,80));
    anchorIds.add(id);
  }
  for(const node of root.querySelectorAll('a')){
    const label=node.textContent.trim();
    if(!label||/^(click here|here|read more|link)$/i.test(label))
      add(node,'Give this link a descriptive label');
    const href=node.getAttribute('href')||'';
    if(href.startsWith('#')&&href.length>1){
      let target=href.slice(1);
      try{target=decodeURIComponent(target);}catch{}
      if(!anchorIds.has(target))add(node,'Broken internal bookmark / reference: '+target.slice(0,80));
    }
  }
  for(const node of root.querySelectorAll('table')){
    if(!node.querySelector('th'))add(node,'Table has no header cells');
  }
  // Production placeholders are exact {{field.name}} tokens. Warn only on
  // supported field syntax; never mutate original document content here.
  for(const node of root.querySelectorAll('p,li,h1,h2,h3,h4,h5,h6,td,th')){
    // Direct text nodes include placeholders next to inline formatting.
    for(const child of node.childNodes){
      if(child.nodeType!==3)continue;
      const match=(child.textContent||'').match(/\\{\\{[A-Za-z][A-Za-z0-9_.-]{0,39}\\}\\}/);
      if(match)add(node,'Unfilled mail-merge or template field: '+match[0]);
    }
  }
  return {words,characters:text.length,minutes:Math.max(1,Math.ceil(words/200)),headings:headings.length,
    issues:issues.slice(0,100),truncated:issues.length>=100};
}
