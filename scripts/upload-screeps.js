const fs = require('fs');
const path = require('path');
const https = require('https');

function collectModules(rootDir, dir = rootDir) {
  const modules = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(modules, collectModules(rootDir, full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      const rel = path.relative(rootDir, full).replace(/\\/g, '/');
      const moduleName = rel.replace(/\.js$/, '');
      modules[moduleName] = fs.readFileSync(full, 'utf8');
      if (moduleName === 'main') {
        modules['main.js'] = fs.readFileSync(full, 'utf8');
      }
    }
  }
  return modules;
}

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
  const modules = collectModules(dist);
  if (Object.keys(modules).length === 0) {
    console.error('No .js modules found in dist/');
    process.exit(4);
  }

  const payload = { branch, modules };
  const postData = JSON.stringify(payload);

  const options = {
    hostname: host,
    path: `/api/user/code?branch=${encodeURIComponent(branch)}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'X-Token': token,
    },
  };

  console.log(`SCREEPS_TOKEN present=${Boolean(token)} (length=${token ? token.length : 0})`);

  // Try multiple hosts if not explicitly provided
  const candidateHosts = process.env.SCREEPS_HOST ? [process.env.SCREEPS_HOST] : ['screeps.com', 'screepspl.com'];

  async function tryHost(candidate, cb) {
    console.log(`Authenticating token at https://${candidate}/api/auth/me`);
    const authOptions = {
      hostname: candidate,
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'X-Token': token },
    };
    const authReq = https.request(authOptions, (authRes) => {
      let authData = '';
      authRes.on('data', (c) => (authData += c));
      authRes.on('end', () => {
        console.log('Auth status for', candidate + ':', authRes.statusCode);
        console.log('Auth response for', candidate + ':', authData);
        if (authRes.statusCode >= 200 && authRes.statusCode < 300) {
          // update options to use this host
          options.hostname = candidate;
          // include branch as query param
          options.path = `/api/user/code?branch=${encodeURIComponent(branch)}`;
          console.log(`Uploading ${Object.keys(modules).length} modules to ${candidate} branch=${branch}`);
          const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              console.log('Status:', res.statusCode);
              console.log('Response:', data);
              if (res.statusCode >= 200 && res.statusCode < 300) return cb(null, 0);
              return cb(new Error('Upload failed: ' + res.statusCode + ' ' + data));
            });
          });
          req.on('error', (e) => cb(e));
          req.write(postData);
          req.end();
        } else {
          return cb(new Error('Auth failed with status ' + authRes.statusCode));
        }
      });
    });
    authReq.on('error', (e) => cb(e));
    authReq.end();
  }

  (function runCandidates(i) {
    if (i >= candidateHosts.length) {
      console.error('All hosts failed to authenticate the token');
      process.exit(7);
    }
    const candidate = candidateHosts[i];
    tryHost(candidate, (err, code) => {
      if (!err) {
        console.log('Upload succeeded to', candidate);
        process.exit(code || 0);
      }
      console.warn('Host', candidate, 'failed:', err && err.message);
      runCandidates(i + 1);
    });
  })(0);
}

main();
