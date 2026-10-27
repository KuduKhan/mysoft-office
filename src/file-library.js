// Presentation-only ordering. Source file records and workspace order stay untouched.
export const LIBRARY_SORTS=Object.freeze({
 'updated-desc':'Recently edited',
 'updated-asc':'Oldest edited',
 'name':'Name A–Z',
 'type':'Application'
});
export function normalizeLibrarySort(value){return Object.hasOwn(LIBRARY_SORTS,value)?value:'updated-desc';}
export function sortLibraryFiles(files,order='updated-desc'){
 const mode=normalizeLibrarySort(order),collator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
 const time=file=>{const value=file.trashedAt??file.updatedAt;const parsed=typeof value==='number'?value:Date.parse(value);return Number.isFinite(parsed)?parsed:0;};
 return files.map((file,index)=>({file,index})).sort((a,b)=>{
  const x=a.file,y=b.file;
  const comparison=mode==='name'?collator.compare(String(x.title||''),String(y.title||'')):
   mode==='type'?collator.compare(String(x.type||''),String(y.type||''))||collator.compare(String(x.title||''),String(y.title||'')):
   (mode==='updated-asc'?1:-1)*(time(x)-time(y));
  return comparison||a.index-b.index;
 }).map(item=>item.file);
}
