// View-only helpers: recent files and editor metrics.
export function recentWorkspaceFiles(files, activeId, ids=[], max=5){
  const map=new Map(files.map(f=>[f.id,f])),seen=new Set(),out=[];
  for(const id of [activeId,...ids,...[...files].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).map(f=>f.id)]){
    if(!id||seen.has(id)||!map.has(id))continue;
    seen.add(id);out.push(map.get(id));
    if(out.length>=max)break;
  }
  return out;
}
export function editorMetric(file,text=''){
  if(!file)return '';
  if(['docs','notes'].includes(file.type)){
    const value=String(text??''),words=value.match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu)||[];
    return words.length+' words · '+value.length+' characters';
  }
  if(file.type==='sheets'){
    const cells=file.worksheets?.[file.activeSheetIndex||0]?.cells||file.cells||{};
    return Object.values(cells).filter(v=>String(v??'')!=='').length+' populated cells';
  }
  if(file.type==='slides')return (file.slides?.length||0)+' slides';
  return '';
}
