// Only public application assets may be served by the local development server.
// Repository metadata, hidden paths, migrations and source maps stay private.
export function isPublicPath(pathname){
  if(pathname==='/'||pathname==='/index.html')return true;
  return /^\/(?:src\/[a-z0-9-]+\.(?:js|css)|assets\/[a-z0-9-]+\.(?:svg|png|webp|ico))$/i.test(pathname);
}
