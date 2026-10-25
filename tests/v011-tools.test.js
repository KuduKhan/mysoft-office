import test from 'node:test';
import assert from 'node:assert/strict';
import {fillRight} from '../src/studio-tools.js';
import {evaluateCell} from '../src/formulas.js';
import {tagNotebookNotes} from '../src/note-structure.js';
import {addSlideObject,updateSlideObject} from '../src/slide-objects.js';
import {distributeSlideObjects} from '../src/slide-distribution.js';

test('Sheet fill right translates relative formulas and deep-clones style',()=>{
 const cells={A1:'3',B1:'=A1*2'},styles={B1:{bold:true,color:'#ffffff'}};
 assert.equal(fillRight(cells,'B1',2,styles),2);
 assert.equal(cells.C1,'=B1*2');assert.equal(cells.D1,'=C1*2');
 assert.equal(evaluateCell('D1',cells),24);
 assert.deepEqual(styles.D1,styles.B1);
 styles.C1.bold=false;assert.equal(styles.D1.bold,true);
});
test('Sheet fill right validates every destination before modifying any value',()=>{
 const cells={A1:'=Z1+1',B1:'KEEP',C1:'OTHER'},styles={A1:{bold:true},B1:{italic:true}};
 const initial=structuredClone({cells,styles});
 assert.throws(()=>fillRight(cells,'A1',2,styles),/outside A1:Z1000/);
 assert.deepEqual({cells,styles},initial);
 assert.equal(fillRight({Z1:'5'},'Z1',3),0);
 assert.throws(()=>fillRight({B1:'=A1'},'B1',26),/between 1 and 25/);
});
test('Slide distribution preserves shapes, spreads objects and refuses crowded slides transactionally',()=>{
 const slide={},objects=Array.from({length:3},()=>addSlideObject(slide,'rect'));
 assert.equal(distributeSlideObjects(slide,'horizontal'),3);
 assert.ok(Math.abs(objects[0].x-4)<1e-6);
 assert.ok(Math.abs(objects[1].x-36.5)<1e-6);
 assert.ok(Math.abs(objects[2].x-69)<1e-6);
 const y=objects.map(x=>x.y);
 assert.equal(distributeSlideObjects(slide,'vertical'),3);
 assert.deepEqual(objects.map(x=>x.y),y.map((_,i)=>[4,39,74][i]));
 const copy=structuredClone(slide);
 updateSlideObject(slide,objects[0].id,{w:90});
 const before=structuredClone(slide);
 assert.throws(()=>distributeSlideObjects(slide,'horizontal'),/too large/);
 assert.deepEqual(slide,before);
 assert.notDeepEqual(slide,copy);
});
test('Notebook batch tags are scoped, deduplicated, and all-or-nothing',()=>{
 const notes=[
  {type:'notes',id:'a',notebook:'Alpha',tags:['urgent'],body:'A'},
  {type:'notes',id:'b',notebook:'Alpha',tags:[],body:'B'},
  {type:'notes',id:'c',notebook:'Beta',tags:[],body:'C'},
  {type:'docs',id:'d',notebook:'Alpha',tags:[],body:'D'}
 ];
 const result=tagNotebookNotes(notes,'Alpha','Release');
 assert.equal(result.changed.length,2);
 assert.deepEqual(notes.map(x=>x.tags),[['urgent','Release'],['Release'],[],[]]);
 assert.equal(tagNotebookNotes(notes,'Alpha','release').changed.length,0);
 assert.throws(()=>tagNotebookNotes(notes,'Alpha','bad,tag'),/without/);
 const full={type:'notes',id:'e',notebook:'Alpha',tags:Array.from({length:12},(_,i)=>'tag'+i)};
 notes.push(full);const before=structuredClone(notes);
 assert.throws(()=>tagNotebookNotes(notes,'Alpha','newtag'),/maximum/);
 assert.deepEqual(notes,before);
});
