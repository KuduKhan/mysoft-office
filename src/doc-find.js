// Pure text matching helper used for non-destructive Rich Editor search.
export function findTextPositions(text,query,{caseSensitive=false,limit=2000}={}){
  const content=String(text??''),needle=String(query??'').slice(0,120);
  if(!needle)return [];
  const source=caseSensitive?content:content.toLocaleLowerCase();
  const value=caseSensitive?needle:needle.toLocaleLowerCase();
  const positions=[];
  let index=0;
  while(index<source.length&&positions.length<limit){
    const at=source.indexOf(value,index);
    if(at<0)break;
    positions.push({start:at,end:at+needle.length});
    index=at+Math.max(1,value.length);
  }
  return positions;
}
export function nextMatchIndex(matches,previous=-1,direction=1){
  if(!matches.length)return -1;
  if(!Number.isInteger(previous))previous=-1;
  return ((previous+(direction===-1?-1:1))%matches.length+matches.length)%matches.length;
}
