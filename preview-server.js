// Local-only server with update detection. No dependencies required.
const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const files=['Recon.HTML','transaction-import.js','reconciliation-engine.js','auto-reload.js'];
function version(){return crypto.createHash('sha256').update(files.map(file=>fs.readFileSync(path.join(__dirname,file))).join('\n')).digest('hex')}
const server=http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/__version'){
    try{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({version:version()}))}catch(e){res.writeHead(503);res.end()}
    return;
  }
  const name=url.pathname==='/'?'Recon.HTML':url.pathname.slice(1);
  if(!files.includes(name)){res.writeHead(404);res.end('Not found');return}
  fs.readFile(path.join(__dirname,name),(error,body)=>{
    if(error){res.writeHead(404);res.end('Not found');return}
    res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8'});res.end(body);
  });
});
server.listen(8877,'127.0.0.1',()=>console.log('Reconciliation: http://127.0.0.1:8877/Recon.HTML'));
server.on('error',error=>{console.error(error.message);process.exitCode=1});
