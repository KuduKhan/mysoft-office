const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
async function start(page){await page.goto('/');await page.locator('[data-create="media"]').click();await expect(page.getByRole('heading',{name:'MySoft Media'})).toBeVisible();}
async function image(page){const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=640;c.height=400;const x=c.getContext('2d');x.fillStyle='#d26436';x.fillRect(0,0,640,400);x.fillStyle='#275694';x.fillRect(0,0,200,400);return c.toDataURL().split(',')[1];});await page.locator('#media-upload').setInputFiles({name:'Creative image.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});await expect(page.locator('#media-status')).toContainText('640 × 400');return data;}
async function setting(page,name,value){await page.getByLabel(name,{exact:true}).fill(String(value));await page.getByLabel(name,{exact:true}).dispatchEvent('change');}
async function exported(page){const pending=page.waitForEvent('download');await page.locator('[data-action="export"]').click();const download=await pending;return {download,bytes:await fs.readFile(await download.path())};}
test('image edits, drawing, undo, persistence and PNG export retain the original',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page);const original=await image(page);
  await setting(page,'Width',320);await setting(page,'Caption','Made in MySoft');await page.getByLabel('Media look').selectOption('vivid');
  await page.getByLabel('Drawing tool').selectOption('rect');const canvas=await page.locator('#media-canvas').boundingBox();await page.mouse.move(canvas.x+30,canvas.y+30);await page.mouse.down();await page.mouse.move(canvas.x+120,canvas.y+95);await page.mouse.up();
  await expect(page.locator('#media-status')).toContainText('1 drawing layers');await page.locator('[data-media-action="undo"]').click();await expect(page.locator('#media-status')).toContainText('0 drawing layers');await page.locator('[data-media-action="redo"]').click();
  await page.keyboard.press('Control+s');await page.reload();await expect(page.getByLabel('Caption',{exact:true})).toHaveValue('Made in MySoft');await expect(page.locator('#media-status')).toContainText('1 drawing layers');
  const {bytes}=await exported(page);expect(bytes.readUInt32BE(16)).toBe(320);expect(bytes.readUInt32BE(20)).toBe(200);
  await fs.mkdir('.artifacts/media-studio',{recursive:true});await fs.writeFile('.artifacts/media-studio/edited-image.png',bytes);await page.screenshot({animations:'disabled',path:'.artifacts/media-studio/image-desktop.png'});
  const backupEvent=page.waitForEvent('download');await page.locator('.side-foot [data-action="backup"]').click();const backup=await backupEvent;const snapshot=JSON.parse(await fs.readFile(await backup.path(),'utf8'));expect(snapshot.files.find(f=>f.type==='media').mediaData).toBe(original);
  expect(errors).toEqual([]);
});
test('audio preview and WAV export apply trim, speed, fades and mono',async({page})=>{
  const {encodeWAV}=await import('../../src/media-model.js');const sampleRate=48000,left=Float32Array.from({length:48000},(_,i)=>.3*Math.sin(2*Math.PI*440*i/sampleRate));const wav=encodeWAV([left,left],sampleRate);
  await start(page);await page.locator('#media-upload').setInputFiles({name:'Tone.wav',mimeType:'audio/wav',buffer:Buffer.from(wav)});await expect(page.locator('#media-audio')).toBeVisible();
  await setting(page,'Start (seconds)',.2);await expect(page.getByLabel('Start (seconds)',{exact:true})).toHaveValue('0.2');await setting(page,'End (0 = full clip)',.8);await setting(page,'Speed',1.5);await setting(page,'Fade in (seconds)',.05);await page.getByLabel('Mix to mono').check();
  const {bytes,download}=await exported(page);expect(download.suggestedFilename()).toMatch(/\.wav$/);expect(bytes.readUInt16LE(22)).toBe(1);expect(bytes.readUInt32LE(40)/2/48000).toBeCloseTo(.4,3);expect(bytes.readInt16LE(44)).toBe(0);expect(Math.max(...Array.from({length:1000},(_,i)=>Math.abs(bytes.readInt16LE(44+(i+4000)*2))))).toBeGreaterThan(500);
  await page.screenshot({animations:'disabled',path:'.artifacts/media-studio/audio-desktop.png'});
  await page.setViewportSize({width:320,height:568});await expect(page.locator('#media-audio')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect((await page.locator('#media-stage').boundingBox()).height).toBeGreaterThan(55);await page.screenshot({animations:'disabled',path:'.artifacts/media-studio/audio-mobile.png'});
});
test('video trims, filters, captions and exports a playable WebM',async({page})=>{
  test.setTimeout(45000);await start(page);
  const fixture=await fs.readFile(require('node:path').join(__dirname,'../fixtures/media-sample.webm'));
  await page.locator('#media-upload').setInputFiles({name:'Clip.webm',mimeType:'video/webm',buffer:fixture});await expect(page.locator('#media-status')).toContainText('WebM export');
  await setting(page,'End (0 = full clip)',.65);await setting(page,'Caption','MySoft video');await page.getByLabel('Media look').selectOption('cinema');
  const {bytes,download}=await exported(page);expect(download.suggestedFilename()).toMatch(/\.webm$/);expect(bytes.length).toBeGreaterThan(1500);
  const result=await page.evaluate(async base64=>{const data=Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),v=document.createElement('video'),url=URL.createObjectURL(new Blob([data],{type:'video/webm'}));v.muted=true;const done=new Promise((resolve,reject)=>{v.onloadeddata=()=>resolve({width:v.videoWidth,height:v.videoHeight});v.onerror=()=>reject(Error('Export is not playable'));});v.src=url;const output=await done;URL.revokeObjectURL(url);return output;},bytes.toString('base64'));expect(result).toEqual({width:320,height:180});await fs.writeFile('.artifacts/media-studio/edited-video.webm',bytes);
  await page.screenshot({animations:'disabled',path:'.artifacts/media-studio/video-desktop.png'});
  const audio=await page.evaluate(async base64=>{const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),context=new AudioContext();try{const clip=await context.decodeAudioData(bytes.buffer);return {duration:clip.duration,peak:Math.max(...clip.getChannelData(0).slice(0,20000).map(Math.abs))};}finally{await context.close();}},bytes.toString('base64'));
  expect(audio.duration).toBeGreaterThan(.5);expect(audio.duration).toBeLessThan(1.2);expect(audio.peak).toBeGreaterThan(.1);
  let canceledDownloads=0;page.on('download',()=>canceledDownloads++);
  await page.locator('[data-action="export"]').click();await page.locator('[data-media-action="cancel"]').click();await expect(page.locator('#media-progress')).toBeHidden();await expect(page.locator('#toast')).toContainText('Export canceled');expect(canceledDownloads).toBe(0);
  await page.setViewportSize({width:320,height:568});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect((await page.locator('#media-stage').boundingBox()).height).toBeGreaterThan(55);await page.screenshot({animations:'disabled',path:'.artifacts/media-studio/video-mobile.png'});
});
test('Media keeps its identity and drawing in dark mode',async({page})=>{
  await start(page);await page.locator('[data-media-action="drawing"]').click();
  await page.locator('[data-ot-action="preferences"]').click();await page.locator('[data-ot-pref="mode"]').selectOption('dark');await page.locator('[data-ot-action="settings-close"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-mode','dark');await expect(page.locator('.main[data-app="media"]')).toHaveCSS('--studio-accent','#087f8c');await expect(page.locator('#media-status')).toContainText('1280 × 720');await page.screenshot({animations:'disabled',path:'.artifacts/media-studio/drawing-dark.png'});
});
test('media backups restore edits, library actions work, and invalid input preserves the project',async({page})=>{
  await start(page);const original=await image(page);await setting(page,'Caption','Restore this caption');
  await page.locator('#media-upload').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('invalid image')});
  await expect(page.getByLabel('Caption',{exact:true})).toHaveValue('Restore this caption');
  const backupEvent=page.waitForEvent('download');await page.locator('.side-foot [data-action="backup"]').click();const backup=await backupEvent;const snapshot=JSON.parse(await fs.readFile(await backup.path(),'utf8'));expect(snapshot.files.find(f=>f.type==='media').mediaData).toBe(original);
  await page.locator('[data-action="close-editor"]').click();let row=page.locator('tr[data-open]').filter({hasText:'Creative image'});await row.locator('[data-star]').click();await row.locator('[data-duplicate]').click();
  row=page.locator('tr[data-open]').filter({hasText:'Creative image (copy)'});await row.locator('[data-delete]').click();await page.locator('[data-action="confirm-delete"]').click();
  await page.locator('.sidebar [data-nav="trash"]').click();await page.locator('[data-restore-trash]').click();await page.locator('.sidebar [data-nav="media"]').click();await expect(page.getByRole('button',{name:'Creative image (copy)',exact:true})).toBeVisible();
  page.once('dialog',d=>d.accept());await page.locator('#backup-upload').setInputFiles({name:'media-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(snapshot))});
  await expect(page.locator('.app-card')).toHaveCount(6);await page.locator('.sidebar [data-nav="media"]').click();await page.getByRole('button',{name:'Creative image',exact:true}).click();await expect(page.getByLabel('Caption',{exact:true})).toHaveValue('Restore this caption');
});
for(const [width,height] of [[320,568],[768,700],[1440,900]])test('drawing workspace fits '+width,async({page})=>{
  await page.setViewportSize({width,height});await start(page);await page.locator('[data-media-action="drawing"]').click();await expect(page.locator('#media-status')).toContainText('1280 × 720');
  const fit=await page.evaluate(()=>{const stage=document.getElementById('media-stage').getBoundingClientRect(),c=document.getElementById('media-canvas').getBoundingClientRect(),shell=document.querySelector('.editor-shell').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,canvas:c.bottom<=stage.bottom+1&&c.right<=stage.right+1,bottom:shell.bottom,height:innerHeight};});expect(fit.overflow).toBe(false);expect(fit.canvas).toBe(true);expect(fit.bottom).toBeLessThanOrEqual(fit.height+1);await page.screenshot({animations:'disabled',path:'.artifacts/media-studio/drawing-'+width+'.png'});
});
