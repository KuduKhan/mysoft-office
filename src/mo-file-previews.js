import {icon} from './icons.js';
import {displayCell} from './formulas.js';
import {drawingSVG} from './media-vector.js';
import {SLIDE_PRESETS} from './studio-tools.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function textPreview(file){
  const doc=new DOMParser().parseFromString(file.body||'','text/html'),heading=doc.querySelector('h1,h2,h3')?.textContent||file.title,paragraphs=[...doc.querySelectorAll('p,li')].map(node=>node.textContent.trim()).filter(Boolean).slice(0,3);
  return '<div class="mo-mini-paper"><small>'+esc(file.type==='notes'?'NOTES / IDEAS':'MYSOFT / DOCUMENT')+'</small><h3>'+esc(heading.slice(0,90))+'</h3>'+paragraphs.map(text=>'<p>'+esc(text.slice(0,120))+'</p>').join('')+'</div>';
}
function preview(file){
  if(['docs','notes'].includes(file.type))return textPreview(file);
  if(file.type==='sheets'){
    const cells=file.worksheets?.[file.activeSheetIndex||0]?.cells||file.cells||{};
    return '<div class="mo-mini-sheet"><table><thead><tr>'+['A','B','C','D'].map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>'+Array.from({length:5},(_,row)=>'<tr>'+['A','B','C','D'].map(c=>'<td>'+esc(String(displayCell(c+(row+1),cells)).slice(0,35))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  }
  if(file.type==='slides'){
    const slide=file.slides?.[0]||{},theme=SLIDE_PRESETS[slide.studioPreset]||SLIDE_PRESETS.ivory;
    return '<div class="mo-mini-slide" style="background:'+esc(theme.background)+';color:'+esc(theme.foreground)+'"><small>MYSOFT SLIDES / '+(file.slides?.length||0)+' SLIDES</small><h3>'+esc((slide.title||file.title).slice(0,90))+'</h3><p>'+esc((slide.body||'').slice(0,100))+'</p></div>';
  }
  if(file.type==='media'&&file.mediaKind==='drawing'){try{return '<img class="mo-mini-art" alt="" loading="lazy" src="'+esc('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(drawingSVG(file)))+'">';}catch{}}
  if(file.type==='media'&&file.mediaKind==='image'&&file.mediaData?.length<500000&&['image/png','image/jpeg','image/webp','image/gif'].includes(file.mediaMime))return '<img class="mo-mini-art" alt="" loading="lazy" src="'+esc('data:'+file.mediaMime+';base64,'+file.mediaData)+'">';
  return '<div class="mo-mini-symbol">'+icon(file.type==='pdf'?'file-scan':file.mediaKind==='audio'?'waveform':file.mediaKind==='video'?'film':'image',40)+'<strong>'+esc(file.type==='pdf'?(file.pdfPageOrder?.length||file.pdfPageCount||0)+' pages':(file.mediaKind||'Media')+' project')+'</strong><p>'+esc((file.pdfText||file.mediaSourceName||'').slice(0,100))+'</p></div>';
}
export function filePreviewCards(files,{labels,typeIcons,dateText}){
  return '<div class="mo-file-grid">'+files.map(file=>'<article class="mo-file-card"><button type="button" class="mo-file-open" data-open="'+esc(file.id)+'" aria-label="'+esc(file.title)+'"><div class="mo-file-preview '+file.type+'" aria-hidden="true">'+preview(file)+'</div><div class="mo-file-caption"><span class="file-icon '+file.type+'">'+icon(typeIcons[file.type],16)+'</span><span><strong>'+esc(file.title)+'</strong><small>'+esc(labels[file.type].replace('MySoft ',''))+' · '+esc(dateText(file.updatedAt))+'</small></span></div></button><div class="mo-file-card-actions"><button class="icon-btn" data-star="'+esc(file.id)+'" aria-label="Toggle favorite: '+esc(file.title)+'" aria-pressed="'+!!file.starred+'">'+icon('star',14)+'</button><button class="icon-btn" data-duplicate="'+esc(file.id)+'" aria-label="Duplicate '+esc(file.title)+'">'+icon('copy',14)+'</button><button class="icon-btn" data-delete="'+esc(file.id)+'" aria-label="Delete '+esc(file.title)+'">'+icon('trash',14)+'</button></div></article>').join('')+'</div>';
}
