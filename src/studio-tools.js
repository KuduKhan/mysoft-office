import {slideSettings} from './slide-customize.js';
// Bounded editor commands shared by the MySoft studio ribbon.
import {shiftRelativeFormula} from './sheet-range.js';
export const STUDIO_ACCENTS=[
  {name:'Indigo',value:'#4f46e5',soft:'#eef2ff'},
  {name:'Orangered',value:'#ea4c24',soft:'#fff0e9'},
  {name:'Coral',value:'#ef626c',soft:'#fff0f2'},
  {name:'Saffron',value:'#ce7f10',soft:'#fff7e6'},
  {name:'Ocean',value:'#1673b8',soft:'#eaf5ff'},
  {name:'Jade',value:'#15846c',soft:'#e8f8f2'},
  {name:'Violet',value:'#6555e8',soft:'#f0edff'},
  {name:'Rose',value:'#b84083',soft:'#fff0f7'},
  {name:'Graphite',value:'#445269',soft:'#edf2f7'}
];
// One palette source for the editor, thumbnails, presentation and exports.
export const SLIDE_THEMES={
 violet:{label:'Violet',background:'#f4f1ff',foreground:'#302451',accent:'#7161e8'},
 ocean:{label:'Ocean',background:'#eaf5fc',foreground:'#163d59',accent:'#1677ad'},
 forest:{label:'Forest',background:'#edf8f3',foreground:'#174c3d',accent:'#16846a'},
 midnight:{label:'Midnight',background:'#172036',foreground:'#f3f6ff',accent:'#b6a1ff'}
};
export function slideAppearance(slide={}){
 const palette=Object.hasOwn(SLIDE_PRESETS,slide.studioPreset)?SLIDE_PRESETS[slide.studioPreset]:(Object.hasOwn(SLIDE_THEMES,slide.theme)?SLIDE_THEMES[slide.theme]:SLIDE_THEMES.violet);
 const c=slideSettings(slide);return {...palette,...Object.fromEntries(['background','foreground','accent'].filter(key=>c[key]).map(key=>[key,c[key]]))};
}
export function applySlideTheme(slide,name){
 if(!Object.hasOwn(SLIDE_THEMES,name))throw Error('Unknown slide theme.');
 slide.theme=name;delete slide.studioPreset;if(slide.customization)for(const key of ['background','foreground','accent'])delete slide.customization[key];return slide;
}
export function copySlideAppearance(source,target){
 const theme=Object.hasOwn(SLIDE_THEMES,source.theme)?source.theme:'violet';
 const preset=Object.hasOwn(SLIDE_PRESETS,source.studioPreset)?source.studioPreset:null;
 target.customization={...(target.customization||{})};for(const key of ['background','foreground','accent']){if(source.customization?.[key])target.customization[key]=source.customization[key];else delete target.customization[key];}
 target.theme=theme;if(preset)target.studioPreset=preset;else delete target.studioPreset;
 return target;
}
export const SLIDE_PRESETS={
  ivory:{background:'#ffffff',foreground:'#26344c',accent:'#ea4c24'},
  sunset:{background:'#fff0e6',foreground:'#7b311a',accent:'#ea4c24'},
  coral:{background:'#fa6d5a',foreground:'#ffffff',accent:'#ffd5c3'},
  ocean:{background:'#102a49',foreground:'#f2f9ff',accent:'#6ac9ed'},
  jade:{background:'#e7f8f0',foreground:'#145c53',accent:'#12a589'},
  night:{background:'#172036',foreground:'#f3f6ff',accent:'#f5a66b'}
};
export function normalizedSlidePreset(name){
  if(!Object.hasOwn(SLIDE_PRESETS,name))throw Error('Unknown slide style.');
  return name;
}
export function setSlidePreset(slide,name){
  if(name!=='theme')normalizedSlidePreset(name);
  if(slide.customization)for(const key of ['background','foreground','accent'])delete slide.customization[key];
  if(name==='theme'){delete slide.studioPreset;return slide;}
  slide.studioPreset=normalizedSlidePreset(name);
  return slide;
}
export function replaceSheetValues(cells,needle,replacement,{matchCase=false,includeFormulas=false}={}){
  if(typeof needle!=='string'||needle.length<1||needle.length>100)throw Error('Find text must be between 1 and 100 characters.');
  if(typeof replacement!=='string'||replacement.length>500)throw Error('Replacement is too long.');
  let changed=0;
  const pattern=new RegExp(needle.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&'),matchCase?'g':'gi');
  for(const key of Object.keys(cells)){
    if(!/^[A-Z](?:[1-9]\d{0,2}|1000)$/.test(key))continue;
    const value=String(cells[key]??'');
    if(!includeFormulas&&value.startsWith('='))continue;
    const next=value.replace(pattern,replacement);
    if(value!==next){cells[key]=next;changed++;}
  }
  return changed;
}
// Fill literal cells and supported relative formulas together, without
// modifying a single cell when reference translation fails midway.
export function fillDown(cells,address,count=5,styles=null){
  const match=/^([A-Z])([1-9]\d{0,2}|1000)$/.exec(address);
  if(!match)throw Error('Choose a valid cell first.');
  if(!cells||typeof cells!=='object'||Array.isArray(cells))throw Error('Worksheet unavailable.');
  if(!Number.isInteger(count)||count<1||count>50)throw Error('Fill count must be between 1 and 50.');
  const row=Number(match[2]),value=String(cells[address]??'');
  if(!value)throw Error('Selected cell is empty.');
  const limit=Math.min(count,1000-row),writes=[];
  const sourceStyle=styles?.[address];
  for(let i=1;i<=limit;i++){
    const ref=match[1]+(row+i);
    const raw=value.startsWith('=')?shiftRelativeFormula(value,i,0):value;
    const style=sourceStyle===undefined?undefined:structuredClone(sourceStyle);
    writes.push({ref,raw,style});
  }
  // All values and styles have been computed/validated before committing.
  for(const {ref,raw,style} of writes){
    cells[ref]=raw;
    if(styles){
      if(style===undefined)delete styles[ref];
      else styles[ref]=style;
    }
  }
  return writes.length;
}

// Fill to the right using the same bounded relative-reference semantics as Fill Down.
// Compute all destination values and deep-copied styles before touching the worksheet.
export function fillRight(cells,address,count=5,styles=null){
  const match=/^([A-Z])([1-9]\d{0,2}|1000)$/.exec(address);
  if(!match)throw Error('Choose a valid cell first.');
  if(!cells||typeof cells!=='object'||Array.isArray(cells))throw Error('Worksheet unavailable.');
  if(!Number.isInteger(count)||count<1||count>25)throw Error('Fill count must be between 1 and 25.');
  const start=match[1].charCodeAt(0)-65,row=match[2];
  const value=String(cells[address]??'');
  if(!value)throw Error('Selected cell is empty.');
  const sourceStyle=styles?.[address],writes=[];
  for(let i=1;i<=Math.min(count,25-start);i++){
    const ref=String.fromCharCode(65+start+i)+row;
    writes.push({
      ref,
      raw:value.startsWith('=')?shiftRelativeFormula(value,0,i):value,
      style:sourceStyle===undefined?undefined:structuredClone(sourceStyle)
    });
  }
  for(const {ref,raw,style} of writes){
    cells[ref]=raw;
    if(styles){
      if(style===undefined)delete styles[ref];
      else styles[ref]=style;
    }
  }
  return writes.length;
}
export function clearCell(cells,styles,address){
  if(!/^[A-Z](?:[1-9]\d{0,2}|1000)$/.test(address))throw Error('Invalid selected cell.');
  delete cells[address];
  if(styles)delete styles[address];
}
