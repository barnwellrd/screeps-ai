const fs = require('fs');
const path = require('path');
const https = require('https');

async function main() {
  const token = process.env.SCREEPS_TOKEN;
  if (!token) {
    console.error('SCREEPS_TOKEN not set');
    process.exit(2);
  }
  const host = process.env.SCREEPS_HOST || 'screeps.com';
  const branch = process.env.SCREEPS_BRANCH || 'default';
  const dist = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(dist)) {
    console.error('dist directory not found:', dist);
    process.exit(3);
  }
  const modules = {};
  const files = fs.readdirSync(dist);
  for (const f of files) {
    if (f.endsWith('.js')) {
      modules[f] = fs.readFileSync(path.join(dist, f), 'utf8');
    }
  }
  if (Object.keys(modules).length === 0) {
    console.error('No .js modules found in dist/');
    process.exit(4);
  }

  const postData = JSON.stringify({ branch, modules });

  const options = {
    hostname: host,
    path: '/api/user/code',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'X-Token': token,
    },
  };

  console.log(`Uploading ${Object.keys(modules).length} modules to ${host} branch=${branch}`);

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
      if (res.statusCode >= 200 && res.statusCode < 300) process.exit(0);
      process.exit(5);
    });
  });
  req.on('error', (e) => {
    console.error('Request error:', e.message);
    process.exit(6);
  });
  req.write(postData);
  req.end();
}

main();
