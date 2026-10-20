import {formulaDependencies} from './sheet-audit.js';
import {evaluateCell} from './formulas.js';
const valid=/^[A-Z](?:[1-9]\d{0,2}|1000)$/;
export class SheetRecalculator{
  constructor(cells){this.cells=cells;this.cache=new Map();this.direct=new Map();this.reverse=new Map();this.rebuild();}
  rebuild(){
    this.cache.clear();this.direct.clear();this.reverse.clear();
    for(const [ref,value] of Object.entries(this.cells||{}))
      if(valid.test(ref)&&String(value).startsWith('='))this.register(ref,value);
  }
  register(ref,value){
    const deps=new Set(formulaDependencies(value));
    this.direct.set(ref,deps);
    for(const name of deps){
      if(!this.reverse.has(name))this.reverse.set(name,new Set());
      this.reverse.get(name).add(ref);
    }
  }
  unregister(ref){
    for(const name of this.direct.get(ref)||[]){
      this.reverse.get(name)?.delete(ref);
      if(this.reverse.get(name)?.size===0)this.reverse.delete(name);
    }
    this.direct.delete(ref);
  }
  affected(ref){
    const seen=new Set(),queue=[ref];
    for(let i=0;i<queue.length&&i<26000;i++){
      const current=queue[i];if(seen.has(current))continue;
      seen.add(current);
      for(const next of this.reverse.get(current)||[])if(!seen.has(next))queue.push(next);
    }
    return seen;
  }
  update(ref,raw){
    if(!valid.test(ref))throw Error('Invalid worksheet cell');
    this.unregister(ref);
    this.cells[ref]=String(raw??'');
    if(String(raw??'').startsWith('='))this.register(ref,raw);
    const changed=this.affected(ref);
    for(const key of changed)this.cache.delete(key);
    return changed;
  }
  display(ref){
    if(!valid.test(ref))throw Error('Invalid worksheet cell');
    if(this.cache.has(ref))return this.cache.get(ref);
    const computed=String(evaluateCell(ref,this.cells));
    this.cache.set(ref,computed);
    return computed;
  }
}
