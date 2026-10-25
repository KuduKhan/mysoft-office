// Local notebook/section organization, compatible with older Notes files.
import {sortedNotes} from './note-pin.js';
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
      ({title,notes:sortedNotes(notes)}))
  }));
}

export function renameNoteCollection(files,{notebook,section=null,newName}={}){
  const name=String(newName??'').trim();
  if(!name||name.length>40||/[<>]/.test(name))throw Error('Collection name must be 1–40 characters without angle brackets.');
  const sourceBook=safeCollectionName(notebook,DEFAULT_NOTEBOOK);
  const sourceSection=section===null?null:safeCollectionName(section,DEFAULT_SECTION);
  const target=safeCollectionName(name,sourceSection===null?DEFAULT_NOTEBOOK:DEFAULT_SECTION);
  const matched=files.filter(note=>{
    if(note?.type!=='notes')return false;
    const location=noteLocation(note);
    return location.notebook===sourceBook&&(sourceSection===null||location.section===sourceSection);
  });
  if(!matched.length)throw Error('No matching notes in this collection.');
  if(matched.length>500)throw Error('Too many notes for a single collection rename.');
  for(const note of matched){
    if(sourceSection===null)note.notebook=target;
    else note.section=target;
  }
  return matched.length;
}

// Apply one tag to a notebook's Notes without touching other notebooks.
// Plan the entire batch before committing so a full-tag note never causes a
// partially tagged notebook. Source note IDs/bodies remain unchanged.
export function tagNotebookNotes(files,notebook,tag){
  if(!Array.isArray(files))throw Error('Notes collection is unavailable.');
  const label=String(tag??'').trim();
  if(!label||label.length>24||/[<>,\r\n]/.test(label))
    throw Error('Use a tag of 1–24 characters without angle brackets or commas.');
  const name=safeCollectionName(notebook,DEFAULT_NOTEBOOK);
  const matched=files.filter(file=>file?.type==='notes'&&noteLocation(file).notebook===name);
  if(!matched.length)throw Error('No notes in this notebook.');
  if(matched.length>500)throw Error('Batch tagging supports up to 500 notes.');
  const planned=[];
  for(const note of matched){
    const current=Array.isArray(note.tags)?note.tags:[];
    if(current.some(value=>String(value).toLocaleLowerCase()===label.toLocaleLowerCase()))continue;
    if(current.length>=12)throw Error('One or more notes already have the maximum 12 tags.');
    planned.push({note,tags:[...current,label]});
  }
  for(const {note,tags} of planned)note.tags=tags;
  return {matched:matched.length,changed:planned.map(entry=>entry.note)};
}
