const fs = require('fs');
const path = require('path');
const https = require('https');
function collect(dir){ if(!fs.existsSync(dir)){ console.error('dist directory not found'); process.exit(2); } const modules = {}; function walk(d){ for(const f of fs.readdirSync(d)){ const p = path.join(d,f); if(fs.statSync(p).isDirectory()){ walk(p); } else { const rel = path.relative(dir,p).replace(/\\/g, '/'); modules[rel] = fs.readFileSync(p,'utf8'); } } }
 walk(dir); return modules; }
const modules = collect('dist'); const payload = { branch: 'default', modules };
const data = JSON.stringify(payload);
const token = process.env.SCREEPS_TOKEN;
if(!token){ console.error('SCREEPS_TOKEN not set'); process.exit(2); }
const url = 'https://screeps.com/api/user/code?token=' + token;
const u = new URL(url);
const req = https.request({ hostname: u.hostname, path: u.pathname + (u.search||''), method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, res => { let out = ''; res.on('data', c => out += c); res.on('end', () => { console.log('status', res.statusCode); console.log(out); process.exit(res.statusCode===200?0:1); }); });
req.on('error', e => { console.error(e); process.exit(2); });
req.write(data); req.end();