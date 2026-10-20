import test from 'node:test';
import assert from 'node:assert/strict';
import {addDocComment,docComments,toggleDocComment,deleteDocComment,commentSummary} from '../src/doc-review.js';
test('review comments do not modify document body',()=>{
 const file={type:'docs',body:'<p>Original text</p>'};
 assert.throws(()=>addDocComment(file,'','No quote'));
 const comment=addDocComment(file,'Original text','Clarify this wording');
 assert.equal(docComments(file).length,1);
 assert.deepEqual(commentSummary(file),{total:1,open:1});
 toggleDocComment(file,comment.id,true);
 assert.deepEqual(commentSummary(file),{total:1,open:0});
 assert.equal(file.body,'<p>Original text</p>');
 deleteDocComment(file,comment.id);
 assert.equal(docComments(file).length,0);
});
