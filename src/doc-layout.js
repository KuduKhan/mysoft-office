// Print-focused document layout. This does not claim continuous-editor pagination.
export const PAGE_MM={A4:[210,297],Letter:[215.9,279.4],Legal:[215.9,355.6]};
const MM_MARGIN={narrow:12.7,normal:19.05,wide:25.4};
export function normalizedPageSettings(input={}){
  const paper=Object.hasOwn(PAGE_MM,input.paper)?input.paper:'A4';
  const orientation=input.orientation==='landscape'?'landscape':'portrait';
  const margins=Object.hasOwn(MM_MARGIN,input.margins)?input.margins:'normal';
  const lineHeight=['1.2','1.6','2'].includes(String(input.lineHeight))?String(input.lineHeight):'1.6';
  const background=/^#[0-9a-f]{6}$/i.test(input.background||'')?input.background:'#ffffff';
  const text=value=>String(value??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,120);
  return {paper,orientation,margins,lineHeight,background,
    header:text(input.header),footer:text(input.footer)};
}
export function documentGeometry(settings={}){
  const p=normalizedPageSettings(settings);
  const sizes=PAGE_MM[p.paper];
  const [width,height]=p.orientation==='landscape'?[sizes[1],sizes[0]]:sizes;
  const margin=MM_MARGIN[p.margins];
  return {...p,width,height,margin,contentWidth:width-2*margin,contentHeight:height-2*margin};
}
export function printPageCSS(settings={}){
  const p=documentGeometry(settings);
  // Browser print engines decide where content actually splits. Headers/footers
  // display with fixed positioning where supported; no fake page numbers.
  return '@page{size:'+p.paper+' '+p.orientation+';margin:'+p.margin+'mm '+p.margin+'mm;}'+
    '@media print{.document-paper{width:100%!important;min-height:0!important;padding:0!important;'+
    'margin:0!important;border:0!important;box-shadow:none!important;line-height:'+p.lineHeight+'!important;'+
    'background-color:'+p.background+'!important;}'+
    '.doc-paper-header,.doc-paper-footer{position:fixed!important;left:0;right:0;'+
    'font-size:10pt!important;color:#566273!important;max-width:100%!important;}'+
    '.doc-paper-header{top:-'+Math.round(p.margin*0.7)+'mm}'+
    '.doc-paper-footer{bottom:-'+Math.round(p.margin*0.7)+'mm}'+
    '.document-paper table{break-inside:avoid}'+
    '.document-paper h1,.document-paper h2,.document-paper h3{break-after:avoid}'+
    '}';
}
