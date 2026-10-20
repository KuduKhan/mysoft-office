import {makeZip,readZip,xmlEscape,parseXML,first,children,descendants,relationships,pathJoin,packageBase,typesXML} from './ooxml-zip.js';
import {evaluateCell} from './formulas.js';
const XL='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const mainType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml';
const worksheetType='application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml';
const stylesType='application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml';
const validRef=/^[A-Z](?:[1-9]\d{0,2}|1000)$/;

function styleKey(s){
  const normalized={};
  for(const key of ['bold','italic','color','background','format'])if(s?.[key]!==undefined)normalized[key]=s[key];
  return JSON.stringify(normalized);
}
function validHex(value){return /^#[0-9a-f]{6}$/i.test(value||'');}
function buildStyles(workbook){
  const signatures=['{}'],objects=[{}],index=new Map([['{}',0]]);
  for(const sheet of workbook)for(const style of Object.values(sheet.styles||{})){
    const key=styleKey(style);
    if(!index.has(key)){
      if(signatures.length>300)throw Error('Too many unique Excel cell styles.');
      signatures.push(key);objects.push(JSON.parse(key));index.set(key,index.size);
    }
  }
  const fonts=['<font><sz val="11"/><name val="Calibri"/></font>'];
  const fills=['<fill><patternFill patternType="none"/></fill>','<fill><patternFill patternType="gray125"/></fill>'];
  const fontMap=new Map(),fillMap=new Map();
  const xfs=['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  for(let i=1;i<objects.length;i++){
    const s=objects[i],fkey=JSON.stringify([!!s.bold,!!s.italic,s.color||'']);
    let fid=fontMap.get(fkey);
    if(fid===undefined){
      fid=fonts.length;fontMap.set(fkey,fid);
      fonts.push('<font>'+(s.bold?'<b/>':'')+(s.italic?'<i/>':'')+
        (validHex(s.color)?'<color rgb="FF'+s.color.slice(1).toUpperCase()+'"/>':'')+
        '<sz val="11"/><name val="Calibri"/></font>');
    }
    const fillkey=validHex(s.background)?s.background:'';
    let fillId=0;
    if(fillkey){
      fillId=fillMap.get(fillkey);
      if(fillId===undefined){fillId=fills.length;fillMap.set(fillkey,fillId);
        fills.push('<fill><patternFill patternType="solid"><fgColor rgb="FF'+fillkey.slice(1).toUpperCase()+
          '"/><bgColor indexed="64"/></patternFill></fill>');
      }
    }
    const format=s.format==='percent'?10:s.format==='currency'?164:0;
    xfs.push('<xf numFmtId="'+format+'" fontId="'+fid+'" fillId="'+fillId+
      '" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1"/>');
  }
  const xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<styleSheet xmlns="'+XL+'"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;KES&quot; #,##0.00"/></numFmts>'+
    '<fonts count="'+fonts.length+'">'+fonts.join('')+'</fonts>'+
    '<fills count="'+fills.length+'">'+fills.join('')+'</fills>'+
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'+
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
    '<cellXfs count="'+xfs.length+'">'+xfs.join('')+'</cellXfs>'+
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'+
    '</styleSheet>';
  return {xml,index};
}
function sheetXML(sheet,styles){
  const rows=new Map();
  const refs=new Set([...Object.keys(sheet.cells||{}),...Object.keys(sheet.styles||{})]);
  if(refs.size>26000)throw Error('Too many cells on a sheet.');
  for(const ref of refs){
    if(!validRef.test(ref))throw Error('Cell '+ref+' is outside the MySoft A1:Z1000 range.');
    const row=Number(ref.slice(1));
    if(!rows.has(row))rows.set(row,[]);
    const value=String(sheet.cells?.[ref]??'');
    const styleId=styles.index.get(styleKey(sheet.styles?.[ref]))||0;
    const style=styleId?' s="'+styleId+'"':'';
    let xml='';
    if(value.startsWith('=')){
      const expression=value.slice(1);
      const calculated=evaluateCell(ref,sheet.cells);
      const number=Number(calculated);
      xml='<c r="'+ref+'"'+style+'><f>'+xmlEscape(expression)+'</f>'+
        (calculated!==''&&!String(calculated).startsWith('#')&&Number.isFinite(number)?'<v>'+number+'</v>':'')+'</c>';
    }else if(value!==''&&Number.isFinite(Number(value))&&/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)){
      xml='<c r="'+ref+'"'+style+'><v>'+xmlEscape(value)+'</v></c>';
    }else if(value!==''){
      xml='<c r="'+ref+'"'+style+' t="inlineStr"><is><t xml:space="preserve">'+xmlEscape(value)+'</t></is></c>';
    }else if(styleId){xml='<c r="'+ref+'"'+style+'/>';}
    if(xml)rows.get(row).push(xml);
  }
  const rowXML=[...rows.keys()].sort((a,b)=>a-b)
    .map(row=>'<row r="'+row+'">'+rows.get(row).sort((a,b)=>{
      const getCol=x=>x.match(/r="([A-Z])/)[1].charCodeAt(0);
      return getCol(a)-getCol(b);
    }).join('')+'</row>').join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<worksheet xmlns="'+XL+'"><dimension ref="A1:Z1000"/><sheetViews><sheetView workbookViewId="0"/></sheetViews>'+
    '<sheetFormatPr defaultRowHeight="15"/><sheetData>'+rowXML+'</sheetData></worksheet>';
}
export function createXLSX(file){
  if(file?.type!=='sheets')throw Error('XLSX export requires a spreadsheet.');
  const sheets=Array.isArray(file.worksheets)&&file.worksheets.length?file.worksheets.map((s,i)=>({
    name:String(s.name||'Sheet '+(i+1)).slice(0,31),
    cells:i===file.activeSheetIndex?file.cells:(s.cells||{}),
    styles:i===file.activeSheetIndex?file.cellStyles:(s.styles||{})
  })):[{name:'Sheet 1',cells:file.cells||{},styles:file.cellStyles||{}}];
  if(sheets.length>20)throw Error('MySoft supports up to 20 worksheets.');
  const styling=buildStyles(sheets);
  const files=packageBase('xl/workbook.xml',mainType),overrides={
    'xl/workbook.xml':mainType,'xl/styles.xml':stylesType
  };
  files['xl/styles.xml']=styling.xml;
  files['xl/workbook.xml']='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<workbook xmlns="'+XL+'" xmlns:r="'+REL+'">'+
    '<bookViews><workbookView activeTab="'+Math.max(0,file.activeSheetIndex||0)+'"/></bookViews>'+
    '<sheets>'+sheets.map((s,i)=>'<sheet name="'+xmlEscape(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+
    '</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>';
  const baseRel='http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
  files['xl/_rels/workbook.xml.rels']='<?xml version="1.0" encoding="UTF-8"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="'+baseRel+'worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+
    '<Relationship Id="rId'+(sheets.length+1)+'" Type="'+baseRel+'styles" Target="styles.xml"/></Relationships>';
  sheets.forEach((s,i)=>{
    const name='xl/worksheets/sheet'+(i+1)+'.xml';
    files[name]=sheetXML(s,styling);overrides[name]=worksheetType;
  });
  files['[Content_Types].xml']=typesXML(overrides);
  return {bytes:makeZip(files),warnings:[
    'Charts, drawings, conditional formatting and worksheet protection are not exported.',
    'Only the MySoft A1:Z1000 cell range and supported formulas/formatting are exported.'
  ]};
}
const getAttribute=(node,name)=>node?.getAttribute(name)||'';
function colorFrom(node){
  const rgb=getAttribute(node,'rgb');
  if(/^[A-Fa-f0-9]{8}$/.test(rgb))return '#'+rgb.slice(2).toLowerCase();
  if(/^[A-Fa-f0-9]{6}$/.test(rgb))return '#'+rgb.toLowerCase();
  return null;
}
function parseStyles(parts){
  const raw=parts['xl/styles.xml'];
  if(!raw)return [];
  const xml=parseXML(raw);
  const fonts=children(first(xml,'fonts'),'font').map(font=>{
    const style={};
    if(children(font,'b').length)style.bold=true;
    if(children(font,'i').length)style.italic=true;
    const rgb=colorFrom(children(font,'color')[0]);
    if(rgb)style.color=rgb;
    return style;
  });
  const fills=children(first(xml,'fills'),'fill').map(fill=>{
    const rgb=colorFrom(first(fill,'fgColor'));return rgb?{background:rgb}:{};
  });
  return children(first(xml,'cellXfs'),'xf').map(xf=>{
    const style={...fonts[Number(getAttribute(xf,'fontId'))]||{},...fills[Number(getAttribute(xf,'fillId'))]||{}};
    const nf=Number(getAttribute(xf,'numFmtId'));
    if(nf===9||nf===10)style.format='percent';
    if(nf===164)style.format='currency';
    return style;
  });
}
function sharedStrings(parts){
  if(!parts['xl/sharedStrings.xml'])return [];
  const xml=parseXML(parts['xl/sharedStrings.xml']);
  return children(first(xml,'sst'),'si').map(si=>descendants(si,'t').map(t=>t.textContent).join(''));
}
function getSheetCells(xml,strings,styles,warnings){
  const cells={},cellStyles={};
  let omitted=0;
  for(const node of descendants(xml,'c')){
    const ref=getAttribute(node,'r').toUpperCase();
    if(!validRef.test(ref)){omitted++;continue;}
    const formula=children(node,'f')[0];
    const value=children(node,'v')[0]?.textContent||'';
    const kind=getAttribute(node,'t');
    let text=formula?'='+formula.textContent:kind==='inlineStr'?
      descendants(children(node,'is')[0],'t').map(x=>x.textContent).join(''):
      kind==='s'?strings[Number(value)]||'':kind==='b'?(value==='1'?'TRUE':'FALSE'):value;
    if(text!==undefined&&text!=='')cells[ref]=String(text);
    const style=styles[Number(getAttribute(node,'s')||0)]||{};
    if(Object.keys(style).length)cellStyles[ref]={...style};
  }
  if(omitted)warnings.push(omitted+' cells outside the MySoft A1:Z1000 range were excluded.');
  return {cells,styles:cellStyles};
}
export async function importXLSX(buffer){
  const parts=await readZip(buffer);
  if(!parts['xl/workbook.xml'])throw Error('Not a supported XLSX package.');
  const workbook=parseXML(parts['xl/workbook.xml']);
  const sheetRels=relationships(parts,'xl/workbook.xml');
  const strings=sharedStrings(parts),styles=parseStyles(parts);
  const sheetNodes=children(first(workbook,'sheets'),'sheet');
  if(!sheetNodes.length)throw Error('Workbook does not contain worksheets.');
  const warnings=[];
  if(sheetNodes.length>20)warnings.push('Only the first 20 worksheets are supported.');
  const worksheets=[];
  for(const sheet of sheetNodes.slice(0,20)){
    const rel=sheet.getAttribute('r:id')||sheet.getAttributeNS(REL,'id');
    const path=sheetRels[rel];
    if(!path||!parts[path])throw Error('An Excel worksheet part is missing.');
    const xml=parseXML(parts[path]);
    const parsed=getSheetCells(xml,strings,styles,warnings);
    if(descendants(xml,'mergeCell').length)warnings.push('Merged cells are flattened.');
    if(descendants(xml,'conditionalFormatting').length)warnings.push('Conditional formatting is not preserved.');
    worksheets.push({name:getAttribute(sheet,'name').slice(0,31),...parsed});
  }
  if(Object.keys(parts).some(p=>/xl\/(charts|drawings|pivotTables|externalLinks|media|vbaProject)/i.test(p)))
    warnings.push('Charts, drawings, pivot tables, external links, pictures, and macros were not imported.');
  const active=Math.max(0,Math.min(worksheets.length-1,Number(getAttribute(first(workbook,'workbookView'),'activeTab'))||0));
  const sheet=worksheets[active];
  return {type:'sheets',worksheets,activeSheetIndex:active,cells:sheet.cells,cellStyles:sheet.styles,warnings:[...new Set(warnings)]};
}
