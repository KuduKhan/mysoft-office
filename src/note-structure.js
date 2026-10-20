// Local notebook/section organization, compatible with older Notes files.
const bad=/[<>]/g;
export const DEFAULT_NOTEBOOK='Personal';
export const DEFAULT_SECTION='General';
export function safeCollectionName(value,fallback='General'){
  const name=String(value??'').replace(bad,'').replace(/\s+/g,' ').trim().slice(0,40);
  return name||fallback;
}
export function noteLocation(note){
  return {notebook:safeCollectionName(note.notebook,DEFAULT_NOTEBOOK),
    section:safeCollectionName(note.section,DEFAULT_SECTION)};
}
export function moveNote(note,notebook,section){
  note.notebook=safeCollectionName(notebook,DEFAULT_NOTEBOOK);
  note.section=safeCollectionName(section,DEFAULT_SECTION);
  return note;
}
export function organizeNotes(files){
  const groups=new Map();
  for(const note of files.filter(f=>f?.type==='notes')){
    const {notebook,section}=noteLocation(note);
    if(!groups.has(notebook))groups.set(notebook,new Map());
    const sections=groups.get(notebook);
    if(!sections.has(section))sections.set(section,[]);
    sections.get(section).push(note);
  }
  return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([name,sections])=>({
    name,
    sections:[...sections.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([title,notes])=>
      ({title,notes:notes.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))}))
  }));
}
