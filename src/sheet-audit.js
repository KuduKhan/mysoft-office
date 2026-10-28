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


/**
 * Read-only formula inspection for the active worksheet. Traversal is bounded
 * and uses the same evaluator as the grid, so it never evaluates JavaScript.
 * Shared dependencies are expanded on each path; only a back edge is a cycle.
 */
export function debugFormula(cells,ref,{maxDepth=6,maxNodes=80}={}){
  const target=String(ref??'').toUpperCase().trim();
  if(!valid.test(target))throw Error('Select a cell from A1 to Z1000.');
  if(!Number.isInteger(maxDepth)||maxDepth<1||maxDepth>12||
     !Number.isInteger(maxNodes)||maxNodes<1||maxNodes>500)
    throw Error('Invalid formula debugger limits.');
  const data=cells||{};
  let visited=0,truncated=false;
  function visit(cell,depth,path){
    if(visited>=maxNodes){truncated=true;return {cell,truncated:true};}
    visited++;
    const raw=data[cell]??'';
    const formula=String(raw).startsWith('=');
    const cycle=path.has(cell);
    const value=cycle?'#CYCLE!':evaluateCell(cell,data);
    const item={cell,raw,value,formula,cycle,dependencies:[]};
    if(cycle)return item;
    const refs=formula?formulaDependencies(raw):[];
    if(depth>=maxDepth&&refs.length){item.truncated=true;truncated=true;return item;}
    const next=new Set(path);next.add(cell);
    for(const dep of refs){
      if(visited>=maxNodes){item.truncated=true;truncated=true;break;}
      item.dependencies.push(visit(dep,depth+1,next));
    }
    return item;
  }
  const root=visit(target,0,new Set());
  const direct=traceCell(data,target);
  return {root,dependents:direct.dependents,visited,truncated};
}
