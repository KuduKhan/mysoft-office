import {makeZip,readZip,xmlEscape,parseXML,first,children,descendants,relationships,packageBase,typesXML} from './ooxml-zip.js';
const A='http://schemas.openxmlformats.org/drawingml/2006/main';
const P='http://schemas.openxmlformats.org/presentationml/2006/main';
const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const rootRel='http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
const CT='application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml';
const slideCT='application/vnd.openxmlformats-officedocument.presentationml.slide+xml';
const masterCT='application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml';
const layoutCT='application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml';
const themeCT='application/vnd.openxmlformats-officedocument.theme+xml';
const prefix='xmlns:a="'+A+'" xmlns:r="'+R+'" xmlns:p="'+P+'"';

const shapeTreeRoot='<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'+
  '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
const baseColors={
  violet:'7161E8',ocean:'2895D9',forest:'22A88E',midnight:'A58BFF'
};
function slideShape(id,name,text,x,y,w,h,isTitle,accent){
  const lines=String(text||'').slice(0,isTitle?1200:10000).split(/\r?\n/).slice(0,100);
  const paragraphs=lines.map(line=>
    '<a:p><a:pPr algn="l"/><a:r><a:rPr lang="en-US" sz="'+(isTitle?'3500':'2200')+'">'+
    '<a:solidFill><a:srgbClr val="'+(isTitle?accent:'526078')+'"/></a:solidFill>'+
    '<a:latin typeface="Aptos"/></a:rPr><a:t>'+xmlEscape(line)+'</a:t></a:r></a:p>').join('');
  return '<p:sp><p:nvSpPr><p:cNvPr id="'+id+'" name="'+name+'"/><p:cNvSpPr/>'+
    '<p:nvPr><p:ph type="'+(isTitle?'title':'body')+'"'+(isTitle?'':' idx="1"')+'/></p:nvPr></p:nvSpPr>'+
    '<p:spPr><a:xfrm><a:off x="'+x+'" y="'+y+'"/><a:ext cx="'+w+'" cy="'+h+'"/></a:xfrm>'+
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>'+
    '<p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>'+paragraphs+'</p:txBody></p:sp>';
}
function slideXML(slide){
  const accent=baseColors[slide.theme]||baseColors.violet;
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<p:sld '+prefix+'><p:cSld><p:spTree>'+shapeTreeRoot+
    slideShape(2,'Title',slide.title,820000,750000,10500000,1300000,true,accent)+
    slideShape(3,'Body',slide.body,900000,2300000,10000000,3200000,false,accent)+
    '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
}
function layoutXML(){
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<p:sldLayout '+prefix+' type="obj" preserve="1"><p:cSld name="Title and Content"><p:spTree>'+
    shapeTreeRoot+'</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>';
}
function masterXML(){
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<p:sldMaster '+prefix+'><p:cSld><p:spTree>'+shapeTreeRoot+'</p:spTree></p:cSld>'+
    '<p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/>'+
    '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>';
}
function themeXML(){
  const colors=[
    '<a:dk1><a:srgbClr val="1E2942"/></a:dk1>',
    '<a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>',
    '<a:dk2><a:srgbClr val="273350"/></a:dk2>',
    '<a:lt2><a:srgbClr val="F0F2F8"/></a:lt2>',
    ...['7161E8','2895D9','22A88E','D7774B','B34C7E','3B629C'].map((x,i)=>'<a:accent'+(i+1)+'><a:srgbClr val="'+x+'"/></a:accent'+(i+1)+'>'),
    '<a:hlink><a:srgbClr val="0000FF"/></a:hlink>',
    '<a:folHlink><a:srgbClr val="800080"/></a:folHlink>'
  ].join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<a:theme xmlns:a="'+A+'" name="MySoft Office"><a:themeElements>'+
    '<a:clrScheme name="MySoft">'+colors+'</a:clrScheme>'+
    '<a:fontScheme name="MySoft"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont>'+
    '<a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme>'+
    '<a:fmtScheme name="MySoft"><a:fillStyleLst><a:solidFill><a:schemeClr val="accent1"/></a:solidFill>'+
    '<a:solidFill><a:schemeClr val="accent2"/></a:solidFill><a:solidFill><a:schemeClr val="accent3"/></a:solidFill></a:fillStyleLst>'+
    '<a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></a:ln>'+
    '<a:ln w="25400"><a:solidFill><a:schemeClr val="accent2"/></a:solidFill></a:ln>'+
    '<a:ln w="38100"><a:solidFill><a:schemeClr val="accent3"/></a:solidFill></a:ln></a:lnStyleLst>'+
    '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle>'+
    '<a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>'+
    '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="lt1"/></a:solidFill>'+
    '<a:solidFill><a:schemeClr val="lt2"/></a:solidFill><a:solidFill><a:schemeClr val="dk1"/></a:solidFill></a:bgFillStyleLst>'+
    '</a:fmtScheme></a:themeElements></a:theme>';
}
export function createPPTX(file){
  if(file?.type!=='slides'||!Array.isArray(file.slides)||!file.slides.length)throw Error('PPTX export needs presentation slides.');
  if(file.slides.length>200)throw Error('Too many slides.');
  const files=packageBase('ppt/presentation.xml',CT);
  const overrides={
    'ppt/presentation.xml':CT,
    'ppt/slideMasters/slideMaster1.xml':masterCT,
    'ppt/slideLayouts/slideLayout1.xml':layoutCT,
    'ppt/theme/theme1.xml':themeCT
  };
  files['ppt/presentation.xml']='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<p:presentation '+prefix+'><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>'+
    '<p:sldIdLst>'+file.slides.map((_,i)=>'<p:sldId id="'+(256+i)+'" r:id="rId'+(i+2)+'"/>').join('')+
    '</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>'+
    '<p:notesSz cx="6858000" cy="9144000"/></p:presentation>';
  files['ppt/_rels/presentation.xml.rels']='<?xml version="1.0" encoding="UTF-8"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="'+rootRel+'slideMaster" Target="slideMasters/slideMaster1.xml"/>'+
    file.slides.map((_,i)=>'<Relationship Id="rId'+(i+2)+'" Type="'+rootRel+'slide" Target="slides/slide'+(i+1)+'.xml"/>').join('')+
    '</Relationships>';
  files['ppt/slideMasters/slideMaster1.xml']=masterXML();
  files['ppt/slideMasters/_rels/slideMaster1.xml.rels']=
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="'+rootRel+'slideLayout" Target="../slideLayouts/slideLayout1.xml"/>'+
    '<Relationship Id="rId2" Type="'+rootRel+'theme" Target="../theme/theme1.xml"/></Relationships>';
  files['ppt/slideLayouts/slideLayout1.xml']=layoutXML();
  files['ppt/slideLayouts/_rels/slideLayout1.xml.rels']=
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="'+rootRel+'slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>';
  files['ppt/theme/theme1.xml']=themeXML();
  file.slides.forEach((slide,i)=>{
    const slidePath='ppt/slides/slide'+(i+1)+'.xml';
    files[slidePath]=slideXML(slide);overrides[slidePath]=slideCT;
    files['ppt/slides/_rels/slide'+(i+1)+'.xml.rels']=
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="'+rootRel+'slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>';
  });
  files['[Content_Types].xml']=typesXML(overrides);
  return {bytes:makeZip(files),warnings:[
    'Slides export editable titles and body text only; shapes, pictures, animations and speaker notes are not preserved.',
    'Slide layouts and theme details may differ from Microsoft PowerPoint.'
  ]};
}
function shapeText(shape){
  return descendants(shape,'p').map(p=>
    descendants(p,'t').map(t=>t.textContent).join('')
  ).filter(Boolean).join('\n').trim();
}
export async function importPPTX(buffer){
  const files=await readZip(buffer);
  if(!files['ppt/presentation.xml'])throw Error('Not a supported PPTX package.');
  const presentation=parseXML(files['ppt/presentation.xml']);
  const slideNodes=descendants(presentation,'sldId');
  const slideRels=relationships(files,'ppt/presentation.xml');
  if(!slideNodes.length)throw Error('Presentation has no slides.');
  const slides=[],warnings=[];
  if(slideNodes.length>200)warnings.push('Only the first 200 slides were imported.');
  for(const node of slideNodes.slice(0,200)){
    const id=node.getAttribute('r:id')||node.getAttributeNS(R,'id');
    const part=slideRels[id];
    if(!part||!files[part])throw Error('Slide file is missing.');
    const xml=parseXML(files[part]);
    const shapes=descendants(xml,'sp');
    let title='',body=[];
    for(const shape of shapes){
      const text=shapeText(shape);
      if(!text)continue;
      const ph=first(shape,'ph');
      const type=ph?.getAttribute('type')||'';
      if(!title&&['title','ctrTitle'].includes(type))title=text;
      else body.push(text);
    }
    if(!title&&body.length)title=body.shift();
    if(descendants(xml,'pic').length||descendants(xml,'graphicFrame').length||descendants(xml,'cxnSp').length)
      warnings.push('Some pictures, charts, tables, or shapes were not imported.');
    slides.push({title:title.slice(0,500)||'Untitled slide',body:body.join('\n').slice(0,20000),theme:'violet'});
  }
  if(Object.keys(files).some(p=>/ppt\/(media|notesSlides|charts|embeddings)/.test(p)))
    warnings.push('Media, speaker notes, charts and embedded objects were not preserved.');
  warnings.push('Complex slide layouts, text placement, animations and transitions are flattened to editable title/body.');
  return {type:'slides',slides,warnings:[...new Set(warnings)]};
}
