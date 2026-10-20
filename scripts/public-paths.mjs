// Dev server serves only deployed public application files.
export function isPublicPath(value){
  if(value==='/'||value==='/index.html')return true;
  return /^\/(?:src\/[a-z0-9_-]+\.(?:js|css)|assets\/[a-z0-9_-]+\.(?:svg|png|webp|ico))$/i.test(value);
}
