const clean=value=>String(value??'').trim();
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function documentCallout({kind='insight',title='',body=''}={}){
  const names={insight:'Insight',decision:'Decision',action:'Action',important:'Important'};
  if(!Object.hasOwn(names,kind))throw Error('Choose a supported callout style.');
  const heading=clean(title),text=clean(body);if(!text||text.length>3000||heading.length>80)throw Error('Add up to 3,000 characters of callout text and a title up to 80 characters.');
  const colors={insight:['#edf5ff','#176db3'],decision:['#e8f8f2','#15846c'],action:['#fff0e9','#ad3c19'],important:['#f0edff','#6555e8']},[bg,fg]=colors[kind];
  return '<blockquote><p style="background-color:'+bg+';color:'+fg+'"><strong>'+names[kind]+(heading?' · '+escapeHTML(heading):'')+'</strong></p>'+text.split(/\n\s*\n/).map(p=>'<p>'+escapeHTML(p).replace(/\n/g,'<br>')+'</p>').join('')+'</blockquote>';
}
export function distributeSlideObjects(slide,axis){
  if(!['horizontal','vertical'].includes(axis))throw Error('Choose a distribution direction.');
  const objects=slide.objects||[];if(objects.length<3)throw Error('Add at least three objects to distribute them evenly.');
  if(objects.length>40)throw Error('Keep at most 40 objects on a slide.');
  if(objects.some(o=>o.rotation%180||!['x','y','w','h'].every(k=>Number.isFinite(o[k]))||o.x<0||o.y<0||o.w<=0||o.h<=0||o.x+o.w>100||o.y+o.h>100))throw Error('Keep objects inside the slide and use unrotated objects for distribution.');
  const coordinate=axis==='horizontal'?'x':'y',size=axis==='horizontal'?'w':'h',ordered=[...objects].sort((a,b)=>a[coordinate]-b[coordinate]),first=ordered[0][coordinate],last=Math.max(...ordered.map(o=>o[coordinate]+o[size])),occupied=ordered.reduce((n,o)=>n+o[size],0),gap=(last-first-occupied)/(objects.length-1);
  if(gap<-.000001)throw Error('Give these objects more room or reduce their size before distributing.');
  let position=first;const edits=ordered.map(o=>{const edit={object:o,value:position};position+=o[size]+Math.max(0,gap);return edit;});
  edits.forEach(({object,value})=>object[coordinate]=Math.max(0,Math.min(100-object[size],value)));
  return objects.length;
}
export function tasksMarkdown(groups){
  const escape=value=>String(value??'').replace(/\s+/g,' ').trim().replace(/[\\`*_{}\[\]<>#!|]/g,'\\$&');
  const included=groups.filter(g=>Array.isArray(g.tasks)&&g.tasks.length);if(!included.length)throw Error('Add checklist items to a note before exporting tasks.');
  if(included.reduce((n,g)=>n+g.tasks.length,0)>2000)throw Error('Export at most 2,000 tasks at once.');
  return '# Workspace tasks\n\n'+included.map(g=>'## '+escape(g.title||'Untitled note')+'\n\n'+g.tasks.map(t=>'- ['+(t.done?'x':' ')+'] '+escape(t.label||'Untitled task')).join('\n')).join('\n\n')+'\n';
}
export function buildTextFormula(operation,source,second=''){
  const allowed={trim:'TRIM',upper:'UPPER',lower:'LOWER',length:'LEN',combine:'CONCAT'};if(!Object.hasOwn(allowed,operation))throw Error('Choose a text tool.');
  const valid=/^[A-Z](?:[1-9]\d{0,2}|1000)$/;const ref=clean(source).toUpperCase(),other=clean(second).toUpperCase();if(!valid.test(ref)||operation==='combine'&&!valid.test(other))throw Error('Choose source cells from A1 to Z1000.');
  return '='+allowed[operation]+'('+ref+(operation==='combine'?'," ",'+other:'')+')';
}
