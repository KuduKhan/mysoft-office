// Dev server serves only deployed public application files.
export function isPublicPath(value){
  if(value==='/'||value==='/index.html')return true;
  if(/^\/vendor\/(?:pdf-lib\.min\.js|pdfjs\/(?:pdf(?:\.worker)?\.min\.mjs|cmaps\/[a-z0-9_-]+\.bcmap|standard_fonts\/[a-z0-9_.-]+\.(?:pfb|ttf)))$/i.test(value))return true;
  return /^\/(?:src\/[a-z0-9_-]+\.(?:js|css)|assets\/[a-z0-9_-]+\.(?:svg|png|webp|ico))$/i.test(value);
}
