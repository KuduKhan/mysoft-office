// Session-scoped rich document undo/redo, independent of native execCommand history.
// Cross-reload restores remain available through MySoft's separate version history.
export class DocumentHistory {
  constructor(limit=80,groupMs=650){
    this.limit=limit;this.groupMs=groupMs;this.documents=new Map();
  }
  seed(id,html=''){
    if(!this.documents.has(id))this.documents.set(id,{entries:[String(html)],index:0,lastAt:-Infinity});
  }
  record(id,html,at=Date.now()){
    this.seed(id,'');
    const state=this.documents.get(id);
    const value=String(html);
    if(value===state.entries[state.index])return false;
    // Every new input after undo creates a new branch; previously redone states are gone.
    const branching=state.index<state.entries.length-1;
    if(branching)state.entries=state.entries.slice(0,state.index+1);
    if(!branching&&at-state.lastAt<this.groupMs&&state.index>=1){
      state.entries[state.index]=value;
    } else {
      state.entries.push(value);
      if(state.entries.length>this.limit)state.entries.shift();
      state.index=state.entries.length-1;
    }
    state.lastAt=at;
    return true;
  }
  undo(id){
    const s=this.documents.get(id);
    if(!s||s.index<=0)return null;
    s.index--;s.lastAt=-Infinity;return s.entries[s.index];
  }
  checkpoint(id,html){
    this.record(id,html);
    this.documents.get(id).lastAt=-Infinity;
  }
  redo(id){
    const s=this.documents.get(id);
    if(!s||s.index>=s.entries.length-1)return null;
    s.index++;s.lastAt=-Infinity;return s.entries[s.index];
  }
  clear(id){this.documents.delete(id);}
}
export function headingsFromHTML(html,max=50){
  const input=String(html||'');
  const matches=[...input.matchAll(/<h([1-3])(?:\s[^>]*)?>([\s\S]*?)<\/h\1\s*>/gi)];
  return matches.slice(0,max).map(([,level,body],index)=>{
    const title=body.replace(/<[^>]*>/g,'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').trim().slice(0,100);
    return {level:Number(level),title:title||'Untitled heading',index};
  });
}
