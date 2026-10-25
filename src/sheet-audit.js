import {cellRange,evaluateCell} from './formulas.js';
const refPattern=/\b([A-Z])([1-9][0-9]{0,2}|1000)\b/g;
const rangePattern=/\b([A-Z](?:[1-9][0-9]{0,2}|1000)):([A-Z](?:[1-9][0-9]{0,2}|1000))\b/g;
const valid=/^[A-Z](?:[1-9][0-9]{0,2}|1000)$/;
export function formulaDependencies(formula){
  const expression=String(formula||'').replace(/"(?:""|[^"])*"/g,'""');
  if(!expression.startsWith('='))return [];
  const refs=new Set();
  const scrubbed=expression.toUpperCase().replace(rangePattern,(_,a,b)=>{
    try{for(const ref of cellRange(a,b)){if(refs.size<=10000)refs.add(ref);}}catch{}
    return ' ';
  });
  for(const match of scrubbed.matchAll(refPattern))if(valid.test(match[0]))refs.add(match[0]);
  return [...refs].sort();
}
export function auditSheet(cells,{limit=26000}={}){
  const formulas=Object.keys(cells||{}).filter(ref=>valid.test(ref)&&String(cells[ref]).startsWith('='));
  if(formulas.length>limit)throw Error('Too many formulas to audit.');
  const errors=[],dependencies={};
  for(const ref of formulas){
    const formula=String(cells[ref]);
    const deps=formulaDependencies(formula);
    dependencies[ref]=deps;
    const evaluated=String(evaluateCell(ref,cells));
    if(evaluated.startsWith('#'))errors.push({cell:ref,result:evaluated,formula:formula.slice(0,140)});
  }
  return {formulaCount:formulas.length,errorCount:errors.length,errors:errors.slice(0,120),dependencies};
}
export function traceCell(cells,ref){
  const target=String(ref||'').toUpperCase();
  if(!valid.test(target))throw Error('Select a cell from A1 to Z1000.');
  const deps=formulaDependencies(cells[target]);
  const dependents=[];
  for(const [key,value] of Object.entries(cells||{}))
    if(valid.test(key)&&String(value).startsWith('=')&&key!==target&&formulaDependencies(value).includes(target))
      dependents.push(key);
  return {cell:target,deps,dependents:dependents.sort(),value:evaluateCell(target,cells)};
}
