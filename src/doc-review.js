// Document review annotations are non-destructive: comments reference quoted text,
// not fragile DOM offsets. They may become detached when the quote is edited.
const MAX_COMMENTS=80;
export function docComments(file){
  if(!Array.isArray(file.comments))file.comments=[];
  return file.comments;
}
export function addDocComment(file,quote,body){
  const q=String(quote??'').trim().slice(0,240);
  const text=String(body??'').trim().slice(0,1500);
  if(!q)throw Error('Select text in the document before adding a comment.');
  if(!text)throw Error('Comment cannot be empty.');
  const comments=docComments(file);
  if(comments.length>=MAX_COMMENTS)throw Error('Maximum 80 review comments per document.');
  const item={id:'cm-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),
    quote:q,body:text,createdAt:Date.now(),resolved:false};
  comments.push(item);return item;
}
export function toggleDocComment(file,id,resolved){
  const comment=docComments(file).find(x=>x.id===id);
  if(!comment)throw Error('Comment not found.');
  comment.resolved=!!resolved;return comment;
}
export function deleteDocComment(file,id){
  const comments=docComments(file),idx=comments.findIndex(x=>x.id===id);
  if(idx<0)throw Error('Comment not found.');
  comments.splice(idx,1);
}
export function commentSummary(file){
  const all=docComments(file);
  return {total:all.length,open:all.filter(x=>!x.resolved).length};
}
