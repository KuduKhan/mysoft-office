import {makeZip,readZip,xmlEscape,htmlEscape,parseXML,first,children,descendants,packageBase,typesXML} from './ooxml-zip.js';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const contentType='application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml';
const relationshipRoot='http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
// Only conventional, bounded web URLs become live Office relationships.
const safeLink=value=>{
  if(typeof value!=='string'||value.length>2048||/[\u0000-\u0020<>"']/u.test(value))return false;
  try{
    const url=new URL(value);
    return ['https:','http:'].includes(url.protocol)&&Boolean(url.hostname)&&!url.username&&!url.password;
  }catch{return false;}
};
const attribute=(node,name)=>node?.getAttribute('w:'+name)||node?.getAttribute(name)||'';

function xmlRun(text,format={}){
  const styles=(format.bold?'<w:b/>':'')+(format.italic?'<w:i/>':'')+
    (format.underline?'<w:u w:val="single"/>':'')+
    (format.strike?'<w:strike/>':'')+
    (format.script?'<w:vertAlign w:val="'+format.script+'"/>':'');
  return '<w:r>'+(styles?'<w:rPr>'+styles+'</w:rPr>':'')+
    '<w:t xml:space="preserve">'+xmlEscape(text)+'</w:t></w:r>';
}
function runsFromHTML(node,format={},links,warnings){
  if(node.nodeType===Node.TEXT_NODE)return node.nodeValue?xmlRun(node.nodeValue,format):'';
  if(node.nodeType!==Node.ELEMENT_NODE)return '';
  const tag=node.localName.toLowerCase();
  if(tag==='br')return '<w:r><w:br/></w:r>';
  const next={...format};
  if(['b','strong'].includes(tag))next.bold=true;
  if(['i','em'].includes(tag))next.italic=true;
  if(tag==='u')next.underline=true;
  if(['s','strike','del'].includes(tag))next.strike=true;
  if(tag==='sup')next.script='superscript';
  if(tag==='sub')next.script='subscript';
  const runs=[...node.childNodes].map(child=>runsFromHTML(child,next,links,warnings)).join('');
  if(tag!=='a')return runs;
  const href=node.getAttribute('href')||'';
  if(!safeLink(href)){
    if(!warnings.includes('Local or unsupported hyperlinks are exported as plain text.'))
      warnings.push('Local or unsupported hyperlinks are exported as plain text.');
    return runs;
  }
  let id=links.get(href);
  if(!id){
    if(links.size>=250){
      if(!warnings.includes('Only the first 250 unique web links are exported as hyperlinks.'))
        warnings.push('Only the first 250 unique web links are exported as hyperlinks.');
      return runs;
    }
    id='rId'+(links.size+2);links.set(href,id);
  }
  return '<w:hyperlink r:id="'+id+'" w:history="1">'+runs+'</w:hyperlink>';
}
function paragraphFromHTML(node,kind='',prefix='',links,warnings){
  const heading=kind.match(/^h([123])$/)?.[1];
  const style=heading?'<w:pPr><w:pStyle w:val="Heading'+heading+'"/></w:pPr>':'';
  return '<w:p>'+style+(prefix?xmlRun(prefix):'')+runsFromHTML(node,{},links,warnings)+'</w:p>';
}
function tableFromHTML(table,links,warnings){
  const rows=[...table.querySelectorAll(':scope > tbody > tr, :scope > thead > tr, :scope > tr')].slice(0,80);
  const maxCols=Math.max(1,...rows.map(row=>[...row.children].filter(x=>['TD','TH'].includes(x.tagName)).length));
  const grid='<w:tblGrid>'+Array.from({length:maxCols},()=>'<w:gridCol w:w="'+Math.round(9000/maxCols)+'"/>').join('')+'</w:tblGrid>';
  return '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>'+grid+
    rows.map(row=>'<w:tr>'+[...row.children].filter(x=>['TD','TH'].includes(x.tagName)).slice(0,20).map(cell=>
      '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>'+
      paragraphFromHTML(cell,'','',links,warnings)+'</w:tc>').join('')+'</w:tr>').join('')+'</w:tbl>';
}
function blocksFromHTML(body,links,warnings){
  const output=[];
  function walk(node){
    if(node.nodeType===Node.TEXT_NODE){if(node.textContent.trim())output.push('<w:p>'+xmlRun(node.textContent)+'</w:p>');return;}
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    const tag=node.localName.toLowerCase();
    if(tag==='table'){output.push(tableFromHTML(node,links,warnings));return;}
    if(tag==='ul'||tag==='ol'){
      let i=0;for(const li of [...node.children].filter(x=>x.localName==='li')){
        i++;output.push(paragraphFromHTML(li,'',tag==='ol'?i+'. ':'• ',links,warnings));
      }
      return;
    }
    if(['p','div','h1','h2','h3','li','blockquote'].includes(tag)){
      output.push(paragraphFromHTML(node,tag,'',links,warnings));return;
    }
    for(const child of node.childNodes)walk(child);
  }
  for(const child of body.childNodes)walk(child);
  return output.join('')||'<w:p/>';
}
const stylesXML='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<w:styles xmlns:w="'+W+'"><w:style w:type="paragraph" w:default="1" w:styleId="Normal">'+
  '<w:name w:val="Normal"/></w:style>'+
  [1,2,3].map(n=>'<w:style w:type="paragraph" w:styleId="Heading'+n+'">'+
  '<w:name w:val="heading '+n+'"/><w:basedOn w:val="Normal"/>'+
  '<w:pPr><w:outlineLvl w:val="'+(n-1)+'"/></w:pPr><w:rPr><w:b/>'+
  '<w:sz w:val="'+[0,32,28,24][n]+'"/></w:rPr></w:style>').join('')+'</w:styles>';

export function createDOCX(file){
  if(file?.type!=='docs')throw Error('DOCX export requires a MySoft document.');
  if(String(file.body||'').length>1200000)throw Error('Document is too large for this export.');
  const document=new DOMParser().parseFromString(file.body||'','text/html');
  const warnings=[];
  if(document.querySelector('img,svg,video,audio'))warnings.push('Embedded media and pictures are not exported.');
  if(document.querySelector('table [colspan],table [rowspan]'))warnings.push('Merged table cells are flattened.');
  if(document.querySelector('[style]'))warnings.push('Some inline styles and layout controls are not reproduced.');
  const links=new Map();
  const body=blocksFromHTML(document.body,links,warnings);
  const entries=packageBase('word/document.xml',contentType);
  entries['word/document.xml']='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:document xmlns:w="'+W+'" xmlns:r="'+R+'"><w:body>'+body+
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'+
    '</w:body></w:document>';
  entries['word/styles.xml']=stylesXML;
  entries['word/_rels/document.xml.rels']='<?xml version="1.0" encoding="UTF-8"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="'+relationshipRoot+'styles" Target="styles.xml"/>'+
      [...links].map(([href,id])=>'<Relationship Id="'+id+'" Type="'+relationshipRoot+
        'hyperlink" Target="'+xmlEscape(href)+'" TargetMode="External"/>').join('')+
      '</Relationships>';
  entries['[Content_Types].xml']=typesXML({
    'word/document.xml':contentType,
    'word/styles.xml':'application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml'
  });
  return {bytes:makeZip(entries),warnings};
}
function paragraphToHTML(p,links){
  const pPr=children(p,'pPr')[0];
  const style=children(pPr,'pStyle')[0];
  const name=attribute(style,'val');
  const match=/^(?:Heading|heading)\s*([123])$/.exec(name);
  let tag=match?'h'+match[1]:'p';
  const runs=[];
  function readInline(node){
    if(node.localName==='r'){
      const props=children(node,'rPr')[0];
      const bold=!!children(props,'b').length,italic=!!children(props,'i').length,
        underlined=!!children(props,'u').length,strike=!!children(props,'strike').length;
      const script=attribute(children(props,'vertAlign')[0],'val');
      const text=children(node,'t').map(n=>n.textContent).join('');
      const breakCount=children(node,'br').length;
      let html=htmlEscape(text)+(breakCount?'<br>'.repeat(breakCount):'');
      if(bold)html='<strong>'+html+'</strong>';
      if(italic)html='<em>'+html+'</em>';
      if(underlined)html='<u>'+html+'</u>';
      if(strike)html='<s>'+html+'</s>';
      if(script==='superscript')html='<sup>'+html+'</sup>';
      if(script==='subscript')html='<sub>'+html+'</sub>';
      runs.push(html);
    }else if(node.localName==='hyperlink'){
      const id=node.getAttribute('r:id')||node.getAttributeNS(R,'id');
      const start=runs.length;
      for(const child of node.children)readInline(child);
      if(id&&links.has(id)){
        const linked=runs.splice(start).join('');
        runs.push('<a href="'+htmlEscape(links.get(id))+'">'+linked+'</a>');
      }
    }
  }
  for(const child of p.children)readInline(child);
  const hasNumbering=descendants(pPr,'numPr').length>0;
  if(hasNumbering){tag='p';runs.unshift('• ');}
  return '<'+tag+'>'+runs.join('')+'</'+tag+'>';
}
function tableToHTML(table,links){
  const rows=children(table,'tr').slice(0,80);
  return '<table><tbody>'+rows.map(row=>'<tr>'+children(row,'tc').slice(0,20)
    .map(cell=>'<td>'+children(cell,'p').map(p=>paragraphToHTML(p,links)).join('')+'</td>').join('')+
    '</tr>').join('')+'</tbody></table>';
}
export async function importDOCX(buffer){
  const parts=await readZip(buffer);
  if(!parts['word/document.xml'])throw Error('Not a supported DOCX package.');
  const document=parseXML(parts['word/document.xml']);
  const body=first(document,'body');
  if(!body)throw Error('DOCX has no document body.');
  const html=[],links=new Map();
  const rels=parts['word/_rels/document.xml.rels'];
  if(rels){
    const relDoc=parseXML(rels);
    for(const rel of descendants(relDoc,'Relationship')){
      if(rel.getAttribute('Type')!==relationshipRoot+'hyperlink'||
         rel.getAttribute('TargetMode')!=='External')continue;
      const href=rel.getAttribute('Target'),id=rel.getAttribute('Id');
      if(id&&safeLink(href))links.set(id,href);
    }
  }
  for(const part of body.children){
    if(part.localName==='p')html.push(paragraphToHTML(part,links));
    if(part.localName==='tbl')html.push(tableToHTML(part,links));
  }
  const warnings=[];
  if(descendants(document,'drawing').length||descendants(document,'pict').length)
    warnings.push('Embedded pictures and drawing objects were not imported.');
  if(descendants(document,'hyperlink').some(h=>{
    const id=h.getAttribute('r:id')||h.getAttributeNS(R,'id');
    return !id||!links.has(id);
  }))warnings.push('Some internal or unsupported hyperlink targets were not preserved.');
  if(Object.keys(parts).some(p=>/word\/(header|footer|footnotes|endnotes|comments|charts|embeddings)/.test(p)))
    warnings.push('Headers, footers, notes, comments, and embedded objects are outside the supported subset.');
  if(descendants(document,'sectPr').length)warnings.push('Section layout and pagination may differ from Word.');
  const bodyHTML=html.join('');
  if(bodyHTML.length>1200000)throw Error('Document exceeds editor content limits.');
  return {type:'docs',body:bodyHTML,warnings};
}
