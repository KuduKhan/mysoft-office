// MySoft 0.6.0: bounded editor productivity operations independent of DOM.
const cleanText=value=>String(value??'');
const escape=value=>cleanText(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

export function documentContents(headings){
  if(!Array.isArray(headings))throw Error('Headings must be a list');
  const items=headings.slice(0,80)
    .filter(item=>item&&[1,2,3].includes(Number(item.level)))
    .map(item=>({text:cleanText(item.text).trim().slice(0,250),level:Number(item.level)}))
    .filter(item=>item.text&&item.text.toLowerCase()!=='contents');
  if(!items.length)return '';
  // Editable snapshot. Automatic clickable anchors require persistent heading IDs.
  return '<h2>Contents</h2><ol>'+items.map(item=>'<li>'+escape(item.text)+'</li>').join('')+'</ol><p></p>';
}

export function replacePresentationText(slides,find,replacement){
  if(!Array.isArray(slides)||slides.length>200)throw Error('Unsupported presentation');
  const needle=cleanText(find),next=cleanText(replacement);
  if(!needle||needle.length>100||next.length>500)throw Error('Find must be 1–100 characters; replacement at most 500');
  const edits=[];let occurrences=0;
  const pattern=new RegExp(needle.replace(/[.*+?^$()|[\]\\]/g,'\\$&'),'gi');
  for(const slide of slides){
    if(!slide||typeof slide!=='object')throw Error('Invalid slide');
    const updated={};
    for(const field of ['title','body','notes']){
      if(typeof slide[field]!=='string')continue;
      let count=0;
      const value=slide[field].replace(pattern,()=>{count++;return next;});
      if(value.length>25000)throw Error('Replacement makes a slide too large');
      if(count){updated[field]=value;occurrences+=count;}
    }
    edits.push(updated);
  }
  edits.forEach((edit,i)=>Object.assign(slides[i],edit));
  return occurrences;
}

export function noteInsertTemplate(kind,dateString){
  const date=cleanText(dateString);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Use an ISO date');
  if(kind==='meeting')return '<h2>Meeting notes — '+date+'</h2><p><strong>Attendees:</strong> </p><h3>Agenda</h3><ul><li>Topic</li></ul><h3>Decisions</h3><ul><li>Decision</li></ul><h3>Action items</h3><ul><li>☐ Owner — task — due date</li></ul><p></p>';
  if(kind==='daily')return '<h2>Daily plan — '+date+'</h2><h3>Top priorities</h3><ol><li>Priority one</li><li>Priority two</li><li>Priority three</li></ol><h3>Tasks</h3><ul><li>☐ Task</li></ul><h3>Notes and reflection</h3><p></p>';
  throw Error('Unknown note template');
}

// Updates an existing manually inserted contents snapshot without touching the rest of the document.
export function refreshDocumentContents(editor){
  if(!editor)return 0;
  const title=[...editor.querySelectorAll('h2')].find(node=>node.textContent.trim().toLowerCase()==='contents');
  const list=title?.nextElementSibling;
  if(!list||list.tagName!=='OL')return 0;
  const headings=[...editor.querySelectorAll('h1,h2,h3')].filter(node=>node!==title)
    .map(node=>node.textContent.trim().slice(0,250)).filter(Boolean).slice(0,80);
  if(!headings.length)return 0;
  list.replaceChildren(...headings.map(text=>{const li=editor.ownerDocument.createElement('li');li.textContent=text;return li;}));
  return headings.length;
}
