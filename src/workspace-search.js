// Local, bounded search across all four editors; no server or indexing cache.
const contains=(value,q)=>String(value??'').slice(0,100000).toLocaleLowerCase().includes(q);
const body=markup=>String(markup??'').slice(0,100000).replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gi,' ');
export function workspaceMatchSource(file,query){
  const q=String(query??'').trim().slice(0,128).toLocaleLowerCase();
  if(!q)return 'name';
  if(contains(file?.title,q))return 'name';
  if(Array.isArray(file?.tags)&&file.tags.some(tag=>contains(tag,q)))return 'tag';
  if(['docs','notes'].includes(file?.type)&&contains(body(file.body),q))return 'document content';
  if(file?.type==='sheets'){
    const sheets=Array.isArray(file.worksheets)?file.worksheets.slice(0,20):[file];
    for(const sheet of sheets){
      if(contains(sheet.name,q))return 'worksheet name';
      if(Object.values(sheet.cells||{}).slice(0,2500).some(value=>contains(value,q)))return 'cell content';
    }
    if(Object.values(file.cells||{}).slice(0,2500).some(value=>contains(value,q)))return 'cell content';
  }
  if(file?.type==='slides'&&Array.isArray(file.slides)){
    for(const slide of file.slides.slice(0,200)){
      if(contains(slide.title,q)||contains(slide.body,q)||contains(slide.notes,q)||
         (Array.isArray(slide.objects)&&slide.objects.slice(0,150).some(obj=>contains(obj.text,q))))
         return 'slide content';
    }
  }
  return null;
}
export function searchWorkspaceFiles(files,query){
  const q=String(query??'').trim();
  return [...files].filter(file=>workspaceMatchSource(file,q)!==null)
    .sort((a,b)=>(Number(b.updatedAt)||0)-(Number(a.updatedAt)||0));
}
