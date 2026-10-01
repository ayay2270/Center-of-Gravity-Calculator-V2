import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!target.startsWith(root+path.sep)){res.writeHead(403).end('Forbidden');return;}
    const body=await fs.readFile(target);
    res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(body);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('找不到檔案；請先執行 npm run build。');}
}).listen(4527,'127.0.0.1',()=>console.log('Version A prototype ready: http://127.0.0.1:4527/'));
