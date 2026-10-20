// Bounded conditional formatting rules for MySoft Sheets.
// Rules are stored inside the active worksheet, so separate sheets remain isolated.
import {parseRange} from './sheet-range.js';
const OPERATORS=new Set(['greater','less','equal','contains']);
const COLORS=new Set(['#ffe2c7','#fce2e6','#dff6e9','#ddecff','#f9edba','#efe8ff']);
const cellPattern=/^([A-Z])([1-9]\d{0,2}|1000)$/;
export function activeSheetRules(file){
  const sheet=file?.worksheets?.[file.activeSheetIndex||0];
  if(!sheet)throw Error('Open a worksheet first.');
  if(!Array.isArray(sheet.conditionalRules))sheet.conditionalRules=[];
  return sheet.conditionalRules;
}
export function applySheetRule(file,range,operator,operand,color='#ffe2c7'){
  const area=parseRange(range);
  if(!OPERATORS.has(operator))throw Error('Unsupported rule comparison.');
  if(!COLORS.has(color))throw Error('Choose one of the safe highlight colors.');
  const value=String(operand??'').trim().slice(0,80);
  if(value.length===0)throw Error('Enter a comparison value.');
  if(operator!=='contains'&&!Number.isFinite(Number(value)))throw Error('Enter a valid number.');
  const rules=activeSheetRules(file);
  if(rules.length>=25)throw Error('Maximum 25 conditional rules per worksheet.');
  const rule={id:'rule-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),
    range:range.toUpperCase(),operator,value,color,
    bounds:{top:area.top,bottom:area.bottom,left:area.left,right:area.right}};
  rules.push(rule);
  return rule;
}
export function removeSheetRules(file){
  const rules=activeSheetRules(file),count=rules.length;
  rules.splice(0);return count;
}
export function matchingRule(file,ref,display){
  const m=cellPattern.exec(String(ref));
  if(!m)return null;
  const col=m[1].charCodeAt(0)-65,row=Number(m[2]),text=String(display??'');
  const rules=activeSheetRules(file);
  for(let i=rules.length-1;i>=0;i--){
    const rule=rules[i],box=rule.bounds||parseRange(rule.range);
    if(row<box.top||row>box.bottom||col<box.left||col>box.right)continue;
    const n=Number(text),target=Number(rule.value);
    const match=rule.operator==='contains'?text.toLowerCase().includes(String(rule.value).toLowerCase()):
      text.trim()!==''&&Number.isFinite(n)&&Number.isFinite(target)&&(
        rule.operator==='greater'?n>target:rule.operator==='less'?n<target:n===target);
    if(match)return COLORS.has(rule.color)?rule:null;
  }
  return null;
}
export function sheetRulesSummary(file){
  return activeSheetRules(file).map(x=>({range:x.range,operator:x.operator,value:x.value,color:x.color}));
}
