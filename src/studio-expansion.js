import {parseRange} from './sheet-range.js';
import {displayCell} from './formulas.js';
export const escapeMarkup=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function filteredSnapshot(cells,range,{column='A',operator='contains',query='',header=true}={}){
  const bounds=parseRange(range),col=String(column).trim().toUpperCase();
  if(!/^[A-Z]$/.test(col)||col.charCodeAt(0)-65<bounds.left||col.charCodeAt(0)-65>bounds.right)throw Error('The filter column must be inside the source range.');
  if(!['contains','equals','not-equals','greater','less','blank','not-blank'].includes(operator))throw Error('Choose a supported filter.');
  const needle=String(query).trim().toLocaleLowerCase(),numeric=['greater','less'].includes(operator),threshold=Number(query);
  if(numeric&&(!String(query).trim()||!Number.isFinite(threshold)))throw Error('Enter a finite numeric comparison value.');
  const rows=[],read=row=>Array.from({length:bounds.right-bounds.left+1},(_,i)=>displayCell(String.fromCharCode(65+bounds.left+i)+row,cells));
  if(header)rows.push(read(bounds.top));let matches=0;
  for(let r=bounds.top+(header?1:0);r<=bounds.bottom;r++){
    const raw=displayCell(col+r,cells),text=String(raw??'').trim().toLocaleLowerCase(),number=Number(raw);
    const match=operator==='contains'?text.includes(needle):operator==='equals'?text===needle:operator==='not-equals'?text!==needle:operator==='blank'?!text:operator==='not-blank'?!!text:!!text&&Number.isFinite(number)&&(operator==='greater'?number>threshold:number<threshold);
    if(match){rows.push(read(r));matches++;}
  }
  if(!matches)throw Error('No rows match this filter. Source cells were kept.');
  const output={};rows.forEach((row,r)=>row.forEach((value,c)=>{const text=String(value??'');if(text.length>20000||/^\s*=/.test(text))throw Error('The result contains unsafe formula-like text. Source cells were kept.');if(text!=='')output[String.fromCharCode(65+c)+(r+1)]=value;}));
  return {cells:output,matches};
}

export function repeatObjectGrid(slide,id,{columns,rows,gapX,gapY}){
  const source=slide.objects?.find(object=>object.id===id);if(!source)throw Error('Select an object first.');
  const c=Number(columns),r=Number(rows),gx=Number(gapX),gy=Number(gapY);
  if(!Number.isInteger(c)||!Number.isInteger(r)||c<1||r<1||c>6||r>6||c*r<2)throw Error('Use a grid of 2–36 objects with up to 6 rows or columns.');
  if(!Number.isFinite(gx)||!Number.isFinite(gy)||gx<0||gy<0||gx>30||gy>30)throw Error('Use gaps between 0% and 30%.');
  if((source.rotation||0)!==0)throw Error('Set the source rotation to 0° before creating a grid.');
  if(slide.objects.length+c*r-1>40)throw Error('The grid would exceed 40 objects on this slide.');
  if(source.x+c*source.w+(c-1)*gx>100||source.y+r*source.h+(r-1)*gy>100)throw Error('The grid would extend outside the slide. Reduce size, spacing or count first.');
  const copies=[];for(let row=0;row<r;row++)for(let col=0;col<c;col++){if(!row&&!col)continue;copies.push({...structuredClone(source),id:'sh-'+crypto.randomUUID(),x:source.x+col*(source.w+gx),y:source.y+row*(source.h+gy)});}
  slide.objects.push(...copies);return copies.length;
}

export function tableDesign(table,{accent='#176db3',striped=true,header=true,align='left'}={}){
  if(!/^#[0-9a-f]{6}$/i.test(accent)||!['left','center','right'].includes(align))throw Error('Choose a valid table color and alignment.');
  if(!table?.rows?.length||table.rows.length>200||[...table.rows].some(row=>row.cells.length>26))throw Error('Choose a table with up to 200 rows and 26 columns.');
  const rgb=accent.slice(1).match(/../g).map(hex=>{const c=parseInt(hex,16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}),luminance=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2],text=luminance>.179?'#000000':'#ffffff',copy=table.cloneNode(true),doc=table.ownerDocument;
  [...copy.rows].forEach((row,index)=>[...row.cells].forEach(cell=>{
    let target=cell;if(index===0&&cell.tagName!==(header?'TH':'TD')){target=doc.createElement(header?'th':'td');for(const attr of ['rowspan','colspan'])if(cell.hasAttribute(attr))target.setAttribute(attr,cell.getAttribute(attr));while(cell.firstChild)target.appendChild(cell.firstChild);cell.replaceWith(target);}
    target.style.backgroundColor=header&&index===0?accent:striped&&index%2===1?'#eef3f9':'#ffffff';target.style.color=header&&index===0?text:'#212d48';target.style.textAlign=align;
  }));return copy;
}

function markdownInline(value){
  const tokens=[];let text=String(value).replace(/\[([^\]\n]{1,300})\]\((https?:\/\/[^\s)<>]{1,1500})\)/gi,(_,label,url)=>{tokens.push('<a href="'+escapeMarkup(url)+'">'+escapeMarkup(label)+'</a>');return '\u0000'+(tokens.length-1)+'\u0000';});
  text=text.replace(/\\([\\`*_\[\]<>])/g,(_,character)=>{tokens.push(escapeMarkup(character));return '\u0000'+(tokens.length-1)+'\u0000';});
  text=escapeMarkup(text).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g,'<em>$1</em>');
  return text.replace(/\u0000(\d+)\u0000/g,(_,index)=>tokens[Number(index)]||'');
}
export function importMarkdown(markdown){
  const text=String(markdown??'');if(!text.trim()||text.length>20000||/\u0000/.test(text))throw Error('Paste 1–20,000 characters of Markdown.');
  const blocks=[];let list='';const close=()=>{if(list){blocks.push('</'+list+'>');list='';}};
  for(const line of text.replace(/\r/g,'').split('\n')){
    if(!line.trim()){close();continue;}const item=/^\s*(?:[-*+] |\d+\. )(.*)$/.exec(line);
    if(item){const kind=/^\s*\d+\./.test(line)?'ol':'ul';if(list!==kind){close();list=kind;blocks.push('<'+kind+'>');}const value=item[1].replace(/^\[([ xX])\]\s*/,(_,done)=>(done.trim()?'☑':'☐')+' ');blocks.push('<li>'+markdownInline(value)+'</li>');continue;}
    close();const heading=/^(#{1,3})\s+(.+)$/.exec(line);if(heading)blocks.push('<h'+heading[1].length+'>'+markdownInline(heading[2])+'</h'+heading[1].length+'>');else if(/^>\s?/.test(line))blocks.push('<blockquote>'+markdownInline(line.replace(/^>\s?/,''))+'</blockquote>');else if(/^\s*(?:---+|\*\*\*+)\s*$/.test(line))blocks.push('<hr>');else blocks.push('<p>'+markdownInline(line)+'</p>');
  }close();return blocks.join('');
}
export function exportMarkdown(root){
  const escape=value=>String(value).replace(/([\\`*_\[\]<>])/g,'\\$1');
  const inline=node=>{if(node.nodeType===3)return escape(node.nodeValue);if(node.nodeType!==1)return '';const content=[...node.childNodes].map(inline).join('');if(['STRONG','B'].includes(node.tagName))return '**'+content+'**';if(['EM','I'].includes(node.tagName))return '*'+content+'*';if(node.tagName==='BR')return '\n';if(node.tagName==='A'){const url=node.getAttribute('href')||'';return /^https?:\/\//i.test(url)?'['+content+']('+url.replace(/\(/g,'%28').replace(/\)/g,'%29').replace(/\s/g,'%20')+')':content;}if(node.tagName==='IMG')return '[Image: '+escape(node.getAttribute('alt')||'image')+']';return content;};
  const block=(node,depth=0)=>{
    if(node.nodeType!==1)return inline(node)+(node.nodeType===3&&node.nodeValue.trim()?'\n\n':'');const tag=node.tagName;
    if(/^H[1-3]$/.test(tag))return '#'.repeat(Number(tag[1]))+' '+inline(node)+'\n\n';
    if(tag==='HR')return '---\n\n';
    if(tag==='UL'||tag==='OL')return [...node.children].filter(n=>n.tagName==='LI').map((li,index)=>{const nested=[...li.children].filter(n=>['UL','OL'].includes(n.tagName)),copy=li.cloneNode(true);copy.querySelectorAll('ul,ol').forEach(n=>n.remove());const text=inline(copy).replace(/^☐\s*/,'[ ] ').replace(/^☑\s*/,'[x] ');return '  '.repeat(depth)+(tag==='OL'?(index+1)+'. ':'- ')+text+'\n'+nested.map(n=>block(n,depth+1)).join('');}).join('')+'\n';
    if(tag==='BLOCKQUOTE')return inline(node).split('\n').map(line=>'> '+line).join('\n')+'\n\n';
    if(tag==='TABLE'){const rows=[...node.rows].map(row=>[...row.cells].map(cell=>inline(cell).replace(/\|/g,'\\|').replace(/\n/g,' '))),width=Math.max(0,...rows.map(row=>row.length));if(!width)return '';const row=values=>'| '+Array.from({length:width},(_,i)=>values[i]||'').join(' | ')+' |\n';return row(rows[0])+row(Array(width).fill('---'))+rows.slice(1).map(row).join('')+'\n';}
    if(['P','DIV','LI'].includes(tag))return [...node.childNodes].map(child=>child.nodeType===1&&['P','DIV','UL','OL','TABLE','BLOCKQUOTE'].includes(child.tagName)?block(child,depth):inline(child)).join('')+'\n\n';return inline(node);
  };
  return [...root.childNodes].map(node=>block(node)).join('').replace(/\n{3,}/g,'\n\n').trim()+'\n';
}
