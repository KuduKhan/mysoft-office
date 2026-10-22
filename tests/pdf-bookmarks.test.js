import test from 'node:test';
import assert from 'node:assert/strict';
import {setPDFBookmark,removePDFBookmark,validatePDFRecord} from '../src/pdf-model.js';
import {versionContent,restoreRevision} from '../src/revisions.js';
test('PDF bookmarks follow original source pages, survive revisions, and validate',()=>{
 const f={id:'pdf-1',type:'pdf',title:'Bookmarked',pdfData:'JVBERi0xLjQK',pdfPageCount:3,pdfRotations:{}};
 assert.equal(validatePDFRecord(f),true);
 setPDFBookmark(f,2,'Decision');setPDFBookmark(f,1,'Opening');setPDFBookmark(f,2,'Updated');
 assert.deepEqual(f.pdfBookmarks,[{page:1,label:'Opening'},{page:2,label:'Updated'}]);
 const rev={content:versionContent(f)};
 removePDFBookmark(f,2);
 assert.deepEqual(restoreRevision(f,rev).pdfBookmarks.map(b=>b.page),[1,2]);
 assert.throws(()=>setPDFBookmark(f,9,'Invalid'));
 assert.throws(()=>setPDFBookmark(f,2,''));
 assert.equal(validatePDFRecord({...f,pdfBookmarks:[{page:4,label:'Invalid'}]}),false);
 assert.equal(validatePDFRecord({...f,pdfBookmarks:[{page:1,label:'A'},{page:1,label:'B'}]}),false);
});
