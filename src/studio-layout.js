// Pure focus traversal for recent-file navigation. This never opens a file.
export function adjacentFileTabIndex(length,current,key){
 if(!Number.isSafeInteger(length)||length<1||!Number.isSafeInteger(current)||current<0||current>=length)return null;
 if(key==='Home')return 0;
 if(key==='End')return length-1;
 if(key==='ArrowLeft')return (current-1+length)%length;
 if(key==='ArrowRight')return (current+1)%length;
 return null;
}
