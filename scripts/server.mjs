import { createServer } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPublicPath } from './public-paths.mjs';
import { SECURITY_HEADERS } from './security-headers.mjs';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png',
 '.webp':'image/webp','.ico':'image/x-icon'};
const port=Number(process.env.PORT||4173);
const server=createServer(async(req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){
      res.writeHead(405,{...SECURITY_HEADERS,Allow:'GET, HEAD'});res.end('Method not allowed');return;
    }
    const url=new URL(req.url,'http://localhost');
    const pathname=decodeURIComponent(url.pathname);
    if(!isPublicPath(pathname)){
      res.writeHead(404,SECURITY_HEADERS);res.end('Not found');return;
    }
    const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!target.startsWith(root+path.sep)){
      res.writeHead(403,SECURITY_HEADERS);res.end('Forbidden');return;
    }
    let file;
    try{
      if(!(await stat(target)).isFile())throw Error('Not a file');
      file=await realpath(target);
      if(!file.startsWith(root+path.sep)){
        res.writeHead(403,SECURITY_HEADERS);res.end('Forbidden');return;
      }
    }catch{
      res.writeHead(404,SECURITY_HEADERS);res.end('Not found');return;
    }
    const bytes=await readFile(file);
    res.writeHead(200,{...SECURITY_HEADERS,'Content-Type':types[path.extname(file)]||'application/octet-stream'});
    res.end(req.method==='HEAD'?undefined:bytes);
  }catch{
    res.writeHead(400,SECURITY_HEADERS);res.end('Bad request');
  }
});
server.on('error',error=>{
  if(error.code==='EADDRINUSE'){
    console.error(`Port ${port} is already in use. Stop the existing preview with Ctrl+C in its terminal, then run npm run preview again.`);
    console.error('Keep the same preview address to access your existing browser workspace.');
  }else console.error(`Unable to start MySoft Office: ${error.message}`);
  process.exitCode=1;
});
server.listen(port,process.env.HOST||'127.0.0.1',()=>{
  console.log('MySoft Office available at http://'+(process.env.HOST||'127.0.0.1')+':'+port);
});
