import test from 'node:test';
import assert from 'node:assert/strict';
import {adjacentFileTabIndex} from '../src/studio-layout.js';
test('recent-file keys wrap and support first/last without activating files',()=>{
 assert.equal(adjacentFileTabIndex(5,0,'ArrowLeft'),4);
 assert.equal(adjacentFileTabIndex(5,4,'ArrowRight'),0);
 assert.equal(adjacentFileTabIndex(5,2,'Home'),0);
 assert.equal(adjacentFileTabIndex(5,2,'End'),4);
 assert.equal(adjacentFileTabIndex(1,0,'ArrowLeft'),0);
 for(const k of ['Tab','Enter','Escape'])assert.equal(adjacentFileTabIndex(5,2,k),null);
 for(const args of [[0,0,'ArrowRight'],[2,2,'ArrowRight'],[3,-1,'Home'],[3,1.5,'End']])assert.equal(adjacentFileTabIndex(...args),null);
});
