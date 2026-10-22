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
const notesSlideCT='application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml';
const notesMasterCT='application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml';
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
function customObjectShape(object,index){
  if(!['text','rect','ellipse','roundRect','triangle','diamond','hexagon'].includes(object.kind))return '';
  const n=value=>Number.isFinite(Number(value))?Number(value):0;
  const x=Math.round(Math.max(0,Math.min(100,n(object.x)))*121920);
  const y=Math.round(Math.max(0,Math.min(100,n(object.y)))*68580);
  const w=Math.max(1,Math.round(Math.min(100-n(object.x),Math.max(5,n(object.w)))*121920));
  const h=Math.max(1,Math.round(Math.min(100-n(object.y),Math.max(5,n(object.h)))*68580));
  const hex=value=>/^#[0-9a-f]{6}$/i.test(value||'')?value.slice(1).toUpperCase():'EA4C24';
  const fill=hex(object.fill),color=hex(object.color);
  const kind=['ellipse','roundRect','triangle','diamond','hexagon'].includes(object.kind)?object.kind:'rect';
  const size=Math.round(Math.max(10,Math.min(56,n(object.fontSize)||22))*100);
  const paras=String(object.text||'').slice(0,600).split(/\r?\n/).map(line=>
    '<a:p><a:r><a:rPr lang="en-US" sz="'+size+'"><a:solidFill><a:srgbClr val="'+color+'"/></a:solidFill></a:rPr>'+
    '<a:t>'+xmlEscape(line)+'</a:t></a:r></a:p>').join('');
  return '<p:sp><p:nvSpPr><p:cNvPr id="'+(index+4)+'" name="MySoft object '+index+'"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'+
    '<p:spPr><a:xfrm rot="'+(Number.isInteger(object.rotation)&&object.rotation%90===0?((object.rotation%360+360)%360)*60000:0)+'"><a:off x="'+x+'" y="'+y+'"/><a:ext cx="'+w+'" cy="'+h+'"/></a:xfrm>'+
    '<a:prstGeom prst="'+kind+'"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="'+fill+'"/></a:solidFill>'+
    '<a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/>'+(paras||'<a:p/>')+'</p:txBody></p:sp>';
}
function slideXML(slide){
  const accent=baseColors[slide.theme]||baseColors.violet;
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<p:sld '+prefix+'><p:cSld><p:spTree>'+shapeTreeRoot+
    slideShape(2,'Title',slide.title,820000,750000,10500000,1300000,true,accent)+
    slideShape(3,'Body',slide.body,900000,2300000,10000000,3200000,false,accent)+
    (Array.isArray(slide.objects)?slide.objects.slice(0,40):[]).map(customObjectShape).join('')+
    '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
}
// Presenter notes remain editable PowerPoint notes-slide text, not a visual slide object.
function notesXML(source){
  const paragraphs=String(source||'').slice(0,20000).split(/\r?\n/).slice(0,250)
    .map(line=>'<a:p><a:r><a:rPr lang="en-US"/><a:t>'+xmlEscape(line)+'</a:t></a:r></a:p>').join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<p:notes '+prefix+'><p:cSld><p:spTree>'+shapeTreeRoot+
    '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Speaker Notes"/><p:cNvSpPr/>'+
    '<p:nvPr><p:ph type="body" idx="3" sz="quarter"/></p:nvPr></p:nvSpPr>'+
    '<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>'+paragraphs+
    '</p:txBody></p:sp></p:spTree></p:cSld>'+
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>';
}
function notesMasterXML(){
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<p:notesMaster '+prefix+'><p:cSld><p:spTree>'+shapeTreeRoot+
    '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Notes Placeholder"/><p:cNvSpPr/>'+
    '<p:nvPr><p:ph type="body" idx="3"/></p:nvPr></p:nvSpPr>'+
    '<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>'+
    '</p:spTree></p:cSld>'+
    '<p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4"'+
    ' accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2"'+
    ' folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/></p:notesMaster>';
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
  // Speaker notes cannot be silently truncated on Office export.
  for(const slide of file.slides){
    const text=String(slide.notes||'');
    if(text.length>20000||text.split(/\r?\n/).length>250)
      throw Error('Speaker notes exceed the 20,000 character or 250 paragraph export limit.');
  }
  const noted=file.slides.map(slide=>String(slide.notes||'').trim().length>0);
  const noteCount=noted.filter(Boolean).length;
  // Keep generated files importable under the bounded OOXML package reader.
  if(9+2*file.slides.length+(noteCount?2:0)+2*noteCount>180)
    throw Error('Presentation exceeds the supported 180-part Office package limit.');
  const files=packageBase('ppt/presentation.xml',CT);
  const overrides={
    'ppt/presentation.xml':CT,
    'ppt/slideMasters/slideMaster1.xml':masterCT,
    'ppt/slideLayouts/slideLayout1.xml':layoutCT,
    'ppt/theme/theme1.xml':themeCT,
    ...(noteCount?{'ppt/notesMasters/notesMaster1.xml':notesMasterCT}:{})
  };
  files['ppt/presentation.xml']='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<p:presentation '+prefix+'><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>'+
    '<p:sldIdLst>'+file.slides.map((_,i)=>'<p:sldId id="'+(256+i)+'" r:id="rId'+(i+2)+'"/>').join('')+
    '</p:sldIdLst>'+
    (noteCount?'<p:notesMasterIdLst><p:notesMasterId r:id="rId'+(file.slides.length+2)+
      '"/></p:notesMasterIdLst>':'')+
    '<p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>'+
    '<p:notesSz cx="6858000" cy="9144000"/></p:presentation>';
  files['ppt/_rels/presentation.xml.rels']='<?xml version="1.0" encoding="UTF-8"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="'+rootRel+'slideMaster" Target="slideMasters/slideMaster1.xml"/>'+
    file.slides.map((_,i)=>'<Relationship Id="rId'+(i+2)+'" Type="'+rootRel+'slide" Target="slides/slide'+(i+1)+'.xml"/>').join('')+
    (noteCount?'<Relationship Id="rId'+(file.slides.length+2)+'" Type="'+rootRel+
      'notesMaster" Target="notesMasters/notesMaster1.xml"/>':'')+
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
  if(noteCount){
    files['ppt/notesMasters/notesMaster1.xml']=notesMasterXML();
    files['ppt/notesMasters/_rels/notesMaster1.xml.rels']=
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="'+rootRel+'theme" Target="../theme/theme1.xml"/>'+
      '</Relationships>';
  }
  file.slides.forEach((slide,i)=>{
    const slidePath='ppt/slides/slide'+(i+1)+'.xml';
    files[slidePath]=slideXML(slide);overrides[slidePath]=slideCT;
    files['ppt/slides/_rels/slide'+(i+1)+'.xml.rels']=
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="'+rootRel+'slideLayout" Target="../slideLayouts/slideLayout1.xml"/>'+
      (noted[i]?'<Relationship Id="rId2" Type="'+rootRel+
        'notesSlide" Target="../notesSlides/notesSlide'+(i+1)+'.xml"/>':'')+
      '</Relationships>';
    if(noted[i]){
      const notesPath='ppt/notesSlides/notesSlide'+(i+1)+'.xml';
      files[notesPath]=notesXML(slide.notes);
      overrides[notesPath]=notesSlideCT;
      files['ppt/notesSlides/_rels/notesSlide'+(i+1)+'.xml.rels']=
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
        '<Relationship Id="rId1" Type="'+rootRel+'notesMaster" Target="../notesMasters/notesMaster1.xml"/>'+
        '<Relationship Id="rId2" Type="'+rootRel+'slide" Target="../slides/slide'+(i+1)+'.xml"/>'+
        '</Relationships>';
    }
  });
  files['[Content_Types].xml']=typesXML(overrides);
  return {bytes:makeZip(files),warnings:[
    'Supported MySoft text and shapes are exported, along with plain-text speaker notes; embedded pictures, external objects and animations are not preserved.',
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
    let title='',body=[],objects=[];
    for(const shape of shapes){
      const name=first(shape,'cNvPr')?.getAttribute('name')||'';
      const text=shapeText(shape);
      if(name.startsWith('MySoft object ')){
        const props=first(shape,'spPr'),xf=first(props,'xfrm'),off=first(xf,'off'),ext=first(xf,'ext');
        const type=first(props,'prstGeom')?.getAttribute('prst');
        const shapeKind=['ellipse','roundRect','triangle','diamond','hexagon'].includes(type)?type:text?'text':'rect';
        if(off&&ext&&objects.length<40){
          const color=first(first(props,'solidFill'),'srgbClr')?.getAttribute('val')||'EA4C24';
          const textColor=first(first(first(shape,'txBody'),'rPr'),'srgbClr')?.getAttribute('val')||'202D48';
          const pct=(n,total)=>Math.max(0,Math.min(100,Number(n||0)/total*100));
          const x=pct(off.getAttribute('x'),12192000),y=pct(off.getAttribute('y'),6858000);
          objects.push({id:'sh-import-'+slides.length+'-'+objects.length,kind:shapeKind,
            x,y,w:Math.max(5,Math.min(100-x,pct(ext.getAttribute('cx'),12192000))),
            h:Math.max(5,Math.min(100-y,pct(ext.getAttribute('cy'),6858000))),
            fill:'#'+color.toLowerCase(),color:'#'+textColor.toLowerCase(),
            text:text.slice(0,600),fontSize:22,
            rotation:(Math.round(Number(xf.getAttribute('rot')||0)/60000/90)*90%360+360)%360});
        }
        continue;
      }
      if(!text)continue;
      const ph=first(shape,'ph');
      const type=ph?.getAttribute('type')||'';
      if(!title&&['title','ctrTitle'].includes(type))title=text;
      else body.push(text);
    }
    if(!title&&body.length)title=body.shift();
    let notes='';
    const notesPath=Object.values(relationships(files,part))
      .find(value=>/^ppt\/notesSlides\/[^/]+\.xml$/.test(value));
    if(notesPath&&files[notesPath]){
      const notesXml=parseXML(files[notesPath]);
      for(const shape of descendants(notesXml,'sp')){
        const ph=first(shape,'ph');
        if(ph?.getAttribute('type')==='body'){
          notes=shapeText(shape).slice(0,20000);
          break;
        }
      }
    }else if(notesPath)warnings.push('Some speaker-note parts could not be loaded.');
    if(descendants(xml,'pic').length||descendants(xml,'graphicFrame').length||descendants(xml,'cxnSp').length)
      warnings.push('Some pictures, charts, tables, or unsupported shapes were not imported.');
    slides.push({title:title.slice(0,500)||'Untitled slide',body:body.join('\n').slice(0,20000),notes,theme:'violet',objects});
  }
  if(Object.keys(files).some(p=>/ppt\/(media|charts|embeddings)/.test(p)))
    warnings.push('Media, complex charts and embedded objects were not preserved.');
  warnings.push('MySoft text boxes and simple shapes are supported; complex slide layouts, external shapes and animations may be flattened or omitted.');
  return {type:'slides',slides,warnings:[...new Set(warnings)]};
}
