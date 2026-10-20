// Small bounded Open Packaging Convention ZIP reader/writer.
// Creates uncompressed, standards-compliant ZIPs; imports method 0 or raw DEFLATE (8).
// Rejects encrypted files, zip64, traversal, symlinks/unknown methods and zip bombs.
const decoder=new TextDecoder('utf-8',{fatal:false});
const encoder=new TextEncoder();
const MAX_PACKAGE=18*1024*1024;
const MAX_PARTS=180;
const MAX_UNCOMPRESSED=24*1024*1024;

export function xmlEscape(value){
  return String(value??'')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
export function htmlEscape(value){
  return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function parseXML(xml){
  if(xml.length>MAX_UNCOMPRESSED)throw Error('XML part exceeds safety limit.');
  if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('XML document declarations are not supported.');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror'))throw Error('Invalid Office XML.');
  return doc;
}
export const children=(node,name)=>node?[...node.children].filter(c=>c.localName===name):[];
export const first=(node,name)=>node?[...node.getElementsByTagName('*')].find(c=>c.localName===name):undefined;
export const descendants=(node,name)=>node?[...node.getElementsByTagName('*')].filter(c=>c.localName===name):[];
export const attr=(node,name)=>node?.getAttribute(name)||node?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships',name)||'';
export function pathJoin(base,target){
  if(!target||/^[a-z]+:/i.test(target)||target.includes('\\'))throw Error('Unsafe Office part relationship.');
  const full=target.startsWith('/')?target.slice(1):base.split('/').slice(0,-1).concat(target.split('/')).join('/');
  const stack=[];
  for(const component of full.split('/')){
    if(!component||component==='.')continue;
    if(component==='..'){if(!stack.length)throw Error('Unsafe part path');stack.pop();continue;}
    stack.push(component);
  }
  return stack.join('/');
}
export function relationships(parts,path){
  const last=path.lastIndexOf('/');
  const name=path.slice(last+1),dir=last>=0?path.slice(0,last+1):'';
  const rel=dir+'_rels/'+name+'.rels';
  if(!parts[rel])return {};
  const xml=parseXML(parts[rel]);
  const out={};
  for(const node of descendants(xml,'Relationship')){
    const id=node.getAttribute('Id'),target=node.getAttribute('Target');
    if(!id||!target||node.getAttribute('TargetMode')==='External')continue;
    out[id]=pathJoin(path,target);
  }
  return out;
}
const crcTable=Uint32Array.from({length:256},(_,i)=>{
  let c=i;for(let n=0;n<8;n++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;
});
function crc32(bytes){
  let crc=0xffffffff;
  for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}
function putU16(view,index,value){view.setUint16(index,value,true);}
function putU32(view,index,value){view.setUint32(index,value,true);}
export function makeZip(entries){
  const paths=Object.keys(entries);
  if(!paths.length||paths.length>MAX_PARTS)throw Error('Too many ZIP parts.');
  const chunks=[],directory=[];
  let cursor=0;
  for(const name of paths){
    if(!validPath(name))throw Error('Unsafe ZIP entry path.');
    const bytes=entries[name] instanceof Uint8Array?entries[name]:encoder.encode(String(entries[name]));
    if(bytes.byteLength>MAX_UNCOMPRESSED||cursor+bytes.length>MAX_UNCOMPRESSED)throw Error('Office file too large.');
    const fileName=encoder.encode(name),header=new Uint8Array(30+fileName.length),h=new DataView(header.buffer);
    putU32(h,0,0x04034b50);putU16(h,4,20);putU16(h,6,0x0800);putU16(h,8,0);
    putU32(h,14,crc32(bytes));putU32(h,18,bytes.length);putU32(h,22,bytes.length);
    putU16(h,26,fileName.length);header.set(fileName,30);
    chunks.push(header,bytes);
    directory.push({name:fileName,bytes,offset:cursor,crc:crc32(bytes)});
    cursor+=header.length+bytes.length;
  }
  const start=cursor;
  for(const item of directory){
    const hbytes=new Uint8Array(46+item.name.length),h=new DataView(hbytes.buffer);
    putU32(h,0,0x02014b50);putU16(h,4,20);putU16(h,6,20);putU16(h,8,0x0800);
    putU32(h,16,item.crc);putU32(h,20,item.bytes.length);putU32(h,24,item.bytes.length);
    putU16(h,28,item.name.length);putU32(h,42,item.offset);hbytes.set(item.name,46);
    chunks.push(hbytes);cursor+=hbytes.length;
  }
  const end=new Uint8Array(22),v=new DataView(end.buffer);
  putU32(v,0,0x06054b50);putU16(v,8,directory.length);putU16(v,10,directory.length);
  putU32(v,12,cursor-start);putU32(v,16,start);chunks.push(end);cursor+=end.length;
  const result=new Uint8Array(cursor);let offset=0;
  for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}
  return result;
}
function validPath(name){
  return typeof name==='string'&&name.length>0&&name.length<220&&
    !name.startsWith('/')&&!name.includes('\\')&&!name.includes('\u0000')&&
    !name.split('/').some(x=>x==='..'||x==='.');
}
async function inflate(bytes){
  if(typeof DecompressionStream==='undefined')throw Error('This browser cannot decode compressed Office files.');
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const out=await new Response(stream).arrayBuffer();
  if(out.byteLength>MAX_UNCOMPRESSED)throw Error('Compressed Office file exceeds safety limits.');
  return new Uint8Array(out);
}
export async function readZip(buffer){
  const bytes=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer);
  if(bytes.byteLength>MAX_PACKAGE)throw Error('Office file exceeds 18 MB import limit.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
    if(view.getUint32(i,true)===0x06054b50){end=i;break;}
  }
  if(end<0)throw Error('Not an Office ZIP file.');
  if(view.getUint16(end+4,true)!==0||view.getUint16(end+6,true)!==0)throw Error('Multi-disk ZIP unsupported.');
  const count=view.getUint16(end+10,true),directorySize=view.getUint32(end+12,true);
  let cursor=view.getUint32(end+16,true);
  if(count>MAX_PARTS||cursor+directorySize>bytes.length)throw Error('Unsafe ZIP directory.');
  const archive=Object.create(null);let total=0;
  for(let n=0;n<count;n++){
    if(cursor+46>bytes.length||view.getUint32(cursor,true)!==0x02014b50)throw Error('Invalid ZIP central directory.');
    const flags=view.getUint16(cursor+8,true),method=view.getUint16(cursor+10,true);
    const expectedCRC=view.getUint32(cursor+16,true),size=view.getUint32(cursor+20,true);
    const unpacked=view.getUint32(cursor+24,true),nameLen=view.getUint16(cursor+28,true);
    const extra=view.getUint16(cursor+30,true),comment=view.getUint16(cursor+32,true);
    const local=view.getUint32(cursor+42,true);
    const attributes=view.getUint32(cursor+38,true);
    if(flags&1)throw Error('Encrypted Office files cannot be imported.');
    if(![0,8].includes(method)||size===0xffffffff||unpacked===0xffffffff||local===0xffffffff)throw Error('Unsupported ZIP encoding.');
    if((attributes>>>16 & 0xf000)===0xa000)throw Error('Symlink entries are unsupported.');
    if(size>MAX_UNCOMPRESSED||unpacked>MAX_UNCOMPRESSED)throw Error('Unsafe ZIP entry size.');
    if(size&&unpacked/size>150)throw Error('Potential ZIP bomb detected.');
    if(cursor+46+nameLen+extra+comment>bytes.length)throw Error('Invalid ZIP directory.');
    const name=decoder.decode(bytes.subarray(cursor+46,cursor+46+nameLen));
    if(!validPath(name)||Object.hasOwn(archive,name))throw Error('Unsafe or duplicated ZIP path.');
    if(local+30>bytes.length||view.getUint32(local,true)!==0x04034b50)throw Error('Invalid ZIP local header.');
    const payloadStart=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
    if(payloadStart+size>bytes.length)throw Error('Truncated Office ZIP entry.');
    const compressed=bytes.subarray(payloadStart,payloadStart+size);
    const payload=method===0?compressed:await inflate(compressed);
    if(payload.length!==unpacked||crc32(payload)!==expectedCRC)throw Error('Office ZIP data failed integrity validation.');
    total+=payload.length;if(total>MAX_UNCOMPRESSED)throw Error('Office archive exceeds 24 MB unpacked limit.');
    archive[name]=decoder.decode(payload);
    cursor+=46+nameLen+extra+comment;
  }
  if(!archive['[Content_Types].xml']||!archive['_rels/.rels'])throw Error('Missing required Office package metadata.');
  return archive;
}
export function packageBase(mainTarget,mainType){
  return {
    '[Content_Types].xml':'',
    '_rels/.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="'+xmlEscape(mainTarget)+'"/></Relationships>'
  };
}
export function typesXML(overrides){
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
    '<Default Extension="xml" ContentType="application/xml"/>'+
    Object.entries(overrides).map(([file,type])=>'<Override PartName="/'+xmlEscape(file)+'" ContentType="'+xmlEscape(type)+'"/>').join('')+'</Types>';
}
