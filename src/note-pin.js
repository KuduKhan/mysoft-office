export function toggleNotePin(note){
  if(!note||note.type!=='notes')throw Error('Select a note.');
  note.pinned=!note.pinned;
  return note.pinned;
}
export function sortedNotes(notes){
  return [...notes].sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||
    (Number(b.updatedAt)||0)-(Number(a.updatedAt)||0));
}
