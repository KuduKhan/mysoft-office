const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function ribbonCategory(node,type,tab){
  const key=node.dataset.otAction||node.dataset.capabilityAction||node.querySelector('[data-ot-input]')?.dataset.otInput||'';
  if(node.classList.contains('ot-metric'))return 'Guidance';
  if(key.startsWith('work2-'))return 'Connected workflows';
  if(key.startsWith('enhance-'))return 'Productivity studio';
  if(key.startsWith('advanced-'))return 'Advanced studio';
  if(key.startsWith('production-'))return 'Production studio';
  if(key.startsWith('workflow-'))return {docs:'Template studio',sheets:'Data preparation',slides:'Deck planning',notes:'Notebook publishing'}[type]||'Workflow studio';
  if(/^(font|font-size|text-color|highlight)$/.test(key))return 'Typeface & color';
  if(/^(text-|strike|superscript|subscript|clear-format)/.test(key))return 'Text & emphasis';
  if(/^style-/.test(key))return 'Text styles';
  if(/^(align-|bullet-list|numbered-list|paragraph-indent|paragraph-outdent)/.test(key))return 'Paragraph';
  if(/^(paper|orientation|margins|line-spacing|page-color)$/.test(key))return 'Document layout';
  if(/^(page-header|page-footer|print|present|outline-export)/.test(key))return 'Publishing';
  if(/^(shape-(text|rect|ellipse|roundRect|triangle|diamond|hexagon))$/.test(key))return 'Insert objects';
  if(/^shape-align-/.test(key))return 'Object alignment';
  if(/^shape-(left|right|up|down)$/.test(key))return 'Object position';
  if(/^shape-(rotate|resize)/.test(key))return 'Object transform';
  if(/^shape-(duplicate|delete)$/.test(key))return 'Object selection';
  if(/^layer-/.test(key))return 'Layer order';
  if(/^(shape-(fill|color|font|label)|object-properties)/.test(key))return 'Object appearance';
  if(/^(shape-|layer-|distribute-|suite-object-grid|slide-snap)/.test(key))return 'Arrange objects';
  if(/^(sheet-(add|rename|duplicate|delete))$/.test(key))return 'Worksheets';
  if(/^(cell-|range-(bold|highlight|clear))/.test(key))return 'Cell formatting';
  if(/^(range-|suite-filter|summary-table|unique|split|trim-cells)/.test(key))return 'Range & analysis';
  if(/^(sheet-(audit|trace|recalculate)|insert-(sum|avg)|text-formulas)/.test(key))return 'Calculation';
  if(/^(rule-)/.test(key))return 'Conditional rules';
  if(/^(note-(tasks|task-export)|capture-tasks|insert-checklist)/.test(key))return 'Tasks & capture';
  if(/^(note-(template|project|research))/.test(key))return 'Page starters';
  if(/(link|references|backlinks)/.test(key))return 'Links & navigation';
  if(/^craft-/.test(key))return 'Craft tools';
  if(/^(paragraph|uppercase|lowercase|cleanup|writing-review|image-descriptions)/.test(key))return 'Writing studio';
  if(/^(suite-markdown)/.test(key))return 'Markdown studio';
  if(/^(insert-table|custom-table|suite-table)/.test(key))return 'Table tools';
  if(key==='insert-picture')return 'Images';
  if(/^(insert-date|insert-quote|insert-hr)$/.test(key))return 'Content blocks';
  if(key==='insert-page-break')return 'Page flow';
  if(/^(insert-contents|refresh-contents)$/.test(key))return 'Document navigation';
  if(/^(insert-|custom-table|suite-table)/.test(key))return 'Insert & design';
  return ({docs:{Structure:'Document structure',Table:'Table editing',Review:'Find & review'},notes:{Organize:'Notebook organization'},sheets:{Data:'Data tools',Insert:'Charts'},slides:{Design:'Slide design',Arrange:'Deck workflow',Present:'Presentation'}}[type]?.[tab])||(tab==='Tools'?'Workflow tools':tab+' tools');
}
export function groupRibbon(body,type,tab){
  const doc=new DOMParser().parseFromString(body,'text/html'),groups=new Map(),standalone=[],guidance=[];
  for(const node of [...doc.body.children]){
    if(node.classList.contains('ot-metric')){guidance.push(node.outerHTML);continue;}
    if(node.classList.contains('mo-ribbon-group')){standalone.push(node.outerHTML);continue;}
    const name=ribbonCategory(node,type,tab);if(!groups.has(name))groups.set(name,[]);groups.get(name).push(node);
  }
  return [...groups].map(([name,nodes])=>{
    const controls=nodes.reduce((count,node)=>count+node.querySelectorAll('input,select,textarea').length,0),actions=nodes.filter(node=>node.matches('button')).length,classes=controls?'mo-field-group'+(controls>4?' mo-wide-fields':''):'mo-action-group'+(actions>=5?' mo-many-actions':actions<=2?' mo-few-actions':'');
    return '<section class="mo-ribbon-group '+classes+'" aria-label="'+escape(name)+'" tabindex="-1"><h3>'+escape(name)+'</h3><div class="mo-control-grid">'+nodes.map(node=>node.outerHTML).join('')+'</div>'+([...groups.keys()].at(-1)===name?guidance.join(''):'')+'</section>';
  }).join('')+standalone.join('');
}
export function paragraphLayout(options={}){
  const after=Number(options.after??14),indent=Number(options.indent??0),tracking=Number(options.tracking??0),direction=options.direction??'ltr';
  if(!Number.isFinite(after)||after<0||after>80||!Number.isFinite(indent)||indent<0||indent>96||!Number.isFinite(tracking)||tracking< -1||tracking>8||!['ltr','rtl'].includes(direction))throw Error('Use paragraph spacing 0–80 px, indent 0–96 px and letter spacing −1–8 px.');
  return {after,indent,tracking,direction};
}
export function applyParagraphLayout(root,range,options){
  const settings=paragraphLayout(options),selected=range&&!range.collapsed&&root.contains(range.commonAncestorContainer),blocks=[...root.querySelectorAll('p,h1,h2,h3,li,blockquote')].filter(node=>!node.querySelector('p,h1,h2,h3,li,blockquote')&&(!selected||range.intersectsNode(node)));
  if(!blocks.length)throw Error('Add a paragraph or heading first.');
  for(const block of blocks)Object.assign(block.style,{marginBottom:settings.after+'px',textIndent:settings.indent+'px',letterSpacing:settings.tracking+'px',direction:settings.direction});
  return blocks.length;
}
export const NOTE_PAPERS={plain:{background:'#ffffff',color:'#26343e'},linen:{background:'#fcf7ed',color:'#3f392e'},mint:{background:'#eef7f3',color:'#24483d'},slate:{background:'#26343e',color:'#e9f0f4'}};
export const NOTE_FONTS=['Segoe UI','Arial','Georgia','Verdana','Times New Roman'];
export function noteCanvas(input={}){
  const paper=Object.hasOwn(NOTE_PAPERS,input.paper)?input.paper:'plain',font=NOTE_FONTS.includes(input.font)?input.font:'Segoe UI',size=Number(input.size??15),lineHeight=Number(input.lineHeight??1.8),width=['standard','focused','wide'].includes(input.width)?input.width:'standard';
  if(!Number.isInteger(size)||size<12||size>24||![1.4,1.6,1.8,2].includes(lineHeight))throw Error('Choose text size 12–24 and a supported line spacing.');
  return {paper,font,size,lineHeight,width,ruled:input.ruled===true};
}
export function noteCanvasStyle(file){
  let settings;try{settings=noteCanvas(file.noteCanvas);}catch{settings=noteCanvas();}
  const paper=NOTE_PAPERS[settings.paper];
  return 'font-family:'+settings.font+';font-size:'+settings.size+'px;line-height:'+settings.lineHeight+';--note-paper:'+paper.background+';--note-ink:'+paper.color+';--note-leading:'+settings.size*settings.lineHeight+'px;--note-width:'+({focused:'560px',standard:'760px',wide:'none'}[settings.width])+';--note-rules:'+(settings.ruled?'linear-gradient(transparent calc(100% - 1px),'+(settings.paper==='slate'?'#ffffff17':'#26343e14')+' 1px)':'none');
}
