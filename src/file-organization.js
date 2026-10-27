// Shared metadata used by Docs, Sheets, Slides, Notes, PDF and Media.
export const MAX_FILE_TAGS=12;
export function safeFolderPath(value){
 const input=String(value??'').trim();
 if(!input)return '';
 if(input.length>120)throw Error('Folder path may not exceed 120 characters.');
 const parts=input.split('/').map(p=>p.trim());
 if(parts.length>4||parts.some(p=>!p||p==='.'||p==='..'||p.length>40||p.endsWith('.')||/[\\\\<>:"|?*\u0000-\u001f]/.test(p)))
   throw Error('Choose up to four valid folder levels separated by /.');
 return parts.join('/');
}
export function safeFileTags(value){
 const values=Array.isArray(value)?value:String(value??'').split(',');
 const tags=values.map(t=>String(t).trim()).filter(Boolean);
 if(tags.length>MAX_FILE_TAGS||tags.some(t=>t.length>40||/[<>\u0000-\u001f]/.test(t))||
   new Set(tags.map(t=>t.toLocaleLowerCase())).size!==tags.length)throw Error('Use up to 12 unique tags, each at most 40 characters.');
 return tags;
}
export function validateFileOrganization(file){
 try{return (file.folderPath===undefined||file.folderPath===safeFolderPath(file.folderPath))&&
 (file.tags===undefined||Array.isArray(file.tags)&&JSON.stringify(file.tags)===JSON.stringify(safeFileTags(file.tags)));}
 catch{return false;}
}
export function organizeFile(file,{folderPath,tags}){
 const folder=safeFolderPath(folderPath),labels=safeFileTags(tags);
 file.folderPath=folder;file.tags=labels;return file;
}
export function libraryFolders(files){return [...new Set(files.map(f=>f.folderPath||'').filter(Boolean))].sort();}
export function libraryTags(files){return [...new Set(files.flatMap(f=>f.tags||[]))].sort();}
export function potentialDuplicates(files){
 const groups=new Map();
 for(const f of files){const key=f.type+'|'+f.title.trim().toLocaleLowerCase();if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f);}
 return [...groups.values()].filter(g=>g.length>1).flat();
}
export function filterLibraryOrganization(files,{folder='',tag='',duplicates=false}={}){
 const possible=duplicates?new Set(potentialDuplicates(files).map(f=>f.id)):null;
 return files.filter(f=>(!folder||folder===':root'&&!f.folderPath||f.folderPath===folder)&&
 (!tag||(f.tags||[]).includes(tag))&&(!possible||possible.has(f.id)));
}
