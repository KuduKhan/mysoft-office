// Bounded editor commands shared by MySoft's v0.5.1 studio ribbon.
export const STUDIO_ACCENTS=[
  {name:'Orangered',value:'#ea4c24',soft:'#fff0e9'},
  {name:'Coral',value:'#ef626c',soft:'#fff0f2'},
  {name:'Saffron',value:'#ce7f10',soft:'#fff7e6'},
  {name:'Ocean',value:'#1673b8',soft:'#eaf5ff'},
  {name:'Jade',value:'#15846c',soft:'#e8f8f2'},
  {name:'Violet',value:'#6555e8',soft:'#f0edff'},
  {name:'Rose',value:'#b84083',soft:'#fff0f7'},
  {name:'Graphite',value:'#445269',soft:'#edf2f7'}
];
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
export function fillDown(cells,address,count=5){
  const match=/^([A-Z])([1-9]\d{0,2}|1000)$/.exec(address);
  if(!match)throw Error('Choose a valid cell first.');
  const row=Number(match[2]);
  const value=String(cells[address]??'');
  if(!value)throw Error('Selected cell is empty.');
  if(value.startsWith('='))throw Error('Fill down of formulas needs reference translation and is not supported yet.');
  const limit=Math.min(50,Math.max(1,Math.floor(count)),1000-row);
  for(let i=1;i<=limit;i++)cells[match[1]+(row+i)]=value;
  return limit;
}
export function clearCell(cells,styles,address){
  if(!/^[A-Z](?:[1-9]\d{0,2}|1000)$/.test(address))throw Error('Invalid selected cell.');
  delete cells[address];
  if(styles)delete styles[address];
}
