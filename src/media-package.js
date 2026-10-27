import {makeZip} from './ooxml-zip.js';
import {validateMediaRecord,decodeMedia} from './media-model.js';
import {drawingSVG} from './media-vector.js';
const extensions={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif','audio/wav':'wav','audio/x-wav':'wav','audio/mpeg':'mp3','audio/ogg':'ogg','audio/mp4':'m4a','audio/aac':'aac','audio/flac':'flac','audio/webm':'webm','video/mp4':'mp4','video/webm':'webm','video/ogg':'ogv','video/quicktime':'mov'};
export function mediaProjectPackage(file,preview){
 if(!validateMediaRecord(file)||file.mediaKind==='empty')throw Error('Open media or create a drawing first.');
 const snapshot={version:2,exportedAt:new Date().toISOString(),files:[structuredClone(file)],trash:[],versions:{}},entries={'mysoft-project-backup.json':JSON.stringify(snapshot,null,2),'README.txt':'MySoft Media project package\nmysoft-project-backup.json contains the complete editable project including source data. Restore it through Import backup; that workflow replaces the local workspace after confirmation, so back up your current workspace first. Original media is also included separately. preview.png is a canvas preview, not an audio/video render.\n'};
 if(file.mediaData)entries['source.'+(extensions[file.mediaMime]||'bin')]=decodeMedia(file.mediaData);
 if(file.mediaKind==='drawing')entries['drawing.svg']=drawingSVG(file);
 if(preview?.byteLength)entries['preview.png']=preview;
 try{return makeZip(entries);}catch(error){if(/too large/i.test(error.message))throw Error('This project package exceeds 24 MB. Export the original and a workspace backup separately.');throw error;}
}
