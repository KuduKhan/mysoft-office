import {noteLocation} from './note-structure.js';
export function noteSearchText(note){
  if(note?.type!=='notes')return '';
  const loc=noteLocation(note);
  return [note.title||'',loc.notebook,loc.section,(note.tags||[]).join(' '),
    String(note.body||'').replace(/<[^>]*>/g,' ')].join(' ').toLocaleLowerCase();
}
export function filterNotes(files,query){
  const q=String(query||'').trim().toLocaleLowerCase().slice(0,90);
  return (files||[]).filter(f=>f?.type==='notes'&&(!q||noteSearchText(f).includes(q)));
}
