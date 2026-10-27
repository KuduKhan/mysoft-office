// Bounded slide styling shared by editing, presenting and Office export.
export const SLIDE_FONTS=['Arial','Calibri','Georgia','Garamond','Tahoma','Times New Roman','Verdana'];
const hex=v=>/^#[0-9a-f]{6}$/i.test(v||'');
const numeric=(value,min,max,label)=>{if(String(value??'').trim()==='')throw Error('Enter '+label+'.');const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)throw Error(label+' must be '+min+'–'+max+'.');return n;};
const align=value=>['left','center','right'].includes(value)?value:'left';
export function slideSettings(slide={}){
 const c=slide.customization||{},layout=slide.layout||'title',roadmap=!!slide.studioRoadmap;
 const defaults={title:{x:9,y:roadmap?12:layout==='section'?37:layout==='minimal'?18:32,w:82,h:22},body:{x:9,y:layout==='section'?65:layout==='minimal'?43:58,w:82,h:30}};
 const out={font:SLIDE_FONTS.includes(c.font)?c.font:'Arial',titleSize:42,bodySize:24,titleAlign:align(c.titleAlign),bodyAlign:align(c.bodyAlign),titleBold:c.titleBold!==false,bodyBold:c.bodyBold===true,titleItalic:c.titleItalic===true,bodyItalic:c.bodyItalic===true,showTitle:c.showTitle!==false,showBody:c.showBody!==false,showTag:c.showTag!==false,showAccent:c.showAccent!==false,tagText:typeof c.tagText==='string'?c.tagText.slice(0,100):'MySoft Slides'};
 for(const key of ['titleSize','bodySize'])if(Number.isFinite(c[key])&&c[key]>=10&&c[key]<=96)out[key]=c[key];
 for(const key of ['background','foreground','accent'])if(hex(c[key]))out[key]=c[key];
 for(const part of ['title','body']){const box=c[part+'Box'];out[part+'Box']=box&&[box.x,box.y,box.w,box.h].every(Number.isFinite)&&box.x>=0&&box.y>=0&&box.w>=5&&box.h>=5&&box.x+box.w<=100&&box.y+box.h<=100?{...box}:defaults[part];}
 return out;
}
export function slideCustomizationPatch(input){
 if(!SLIDE_FONTS.includes(input.font))throw Error('Choose a supported font.');
 const next={font:input.font,tagText:String(input.tagText??'').slice(0,100)};
 for(const key of ['titleSize','bodySize'])next[key]=numeric(input[key],10,96,key==='titleSize'?'Title size':'Body size');
 for(const key of ['titleAlign','bodyAlign']){if(!['left','center','right'].includes(input[key]))throw Error('Choose a supported text alignment.');next[key]=input[key];}
 for(const key of ['titleBold','bodyBold','titleItalic','bodyItalic','showTitle','showBody','showTag','showAccent']){if(typeof input[key]!=='boolean')throw Error('Choose a valid visibility or emphasis setting.');next[key]=input[key];}
 for(const key of ['background','foreground','accent']){if(!hex(input[key]))throw Error('Choose valid slide colors.');next[key]=input[key];}
 for(const part of ['title','body']){const source=input[part+'Box']||{},box={};for(const key of ['x','y','w','h'])box[key]=numeric(source[key],key==='w'||key==='h'?5:0,100,part+' '+key);if(box.x+box.w>100||box.y+box.h>100)throw Error('Keep each text box inside the slide.');next[part+'Box']=box;}
 return next;
}
export function slideTextStyle(slide,part){
 const c=slideSettings(slide),b=c[part+'Box'],factor=slide.textScale==='large'?1.2:slide.textScale==='compact'||slide.textScale==='small'?.85:1;
 return 'left:'+b.x+'%;top:'+b.y+'%;width:'+b.w+'%;height:'+b.h+'%;--slide-text-size:'+(c[part+'Size']*factor)+';font-family:'+c.font+';font-weight:'+(c[part+'Bold']?700:400)+';font-style:'+(c[part+'Italic']?'italic':'normal')+';text-align:'+c[part+'Align']+';'+(!c[part==='title'?'showTitle':'showBody']?'display:none;':'');
}
export function objectStyleSettings(object={}){
 return {font:SLIDE_FONTS.includes(object.font)?object.font:'Arial',bold:object.bold!==false,italic:object.italic===true,align:['left','center','right'].includes(object.align)?object.align:'center',opacity:Number.isFinite(object.opacity)?Math.max(.1,Math.min(1,object.opacity)):1,borderWidth:Number.isFinite(object.borderWidth)?Math.max(0,Math.min(12,object.borderWidth)):0,borderColor:hex(object.borderColor)?object.borderColor:'#26344c'};
}
export function objectStylePatch(input){
 if(!SLIDE_FONTS.includes(input.font)||!['left','center','right'].includes(input.align))throw Error('Choose supported typography.');
 if(typeof input.bold!=='boolean'||typeof input.italic!=='boolean'||!hex(input.borderColor))throw Error('Choose valid text and border settings.');
 return {font:input.font,align:input.align,bold:input.bold,italic:input.italic,opacity:numeric(input.opacity,.1,1,'Opacity'),borderWidth:numeric(input.borderWidth,0,12,'Border width'),borderColor:input.borderColor};
}
