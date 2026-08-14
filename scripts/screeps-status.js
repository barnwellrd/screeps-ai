const https = require('https');

function requestJson(hostname, path, token) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname,
      path,
      method: 'GET',
      headers: { 'X-Token': token },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += String(chunk)));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on('error', (e) => {
      resolve({ status: 0, body: { error: e.message } });
    });
    req.end();
  });
}

async function main() {
  const token = process.env.SCREEPS_TOKEN;
  if (!token) {
    console.error('SCREEPS_TOKEN is not set. Export it before running: $env:SCREEPS_TOKEN = "..."');
    process.exit(2);
  }

  const candidates = (process.env.SCREEPS_HOST || 'screeps.com').split(',').map((item) => item.trim()).filter(Boolean);

  for (const host of candidates) {
    console.log(`Checking ${host}...`);
    const auth = await requestJson(host, '/api/auth/me', token);
    console.log('auth:', auth.status, JSON.stringify(auth.body));
    if (auth.status >= 200 && auth.status < 300) {
      const roomData = await requestJson(host, '/api/user/rooms', token);
      const memoryData = await requestJson(host, '/api/user/memory', token);
      const summary = {
        auth: auth.body,
        roomCount: Array.isArray(roomData.body) ? roomData.body.length : (roomData.body && roomData.body.rooms ? roomData.body.rooms.length : undefined),
        rooms: roomData.body,
        memory: memoryData.body,
      };
      console.log(JSON.stringify(summary, null, 2));
      return;
    }
    console.log('Skipping remaining checks for this host because auth failed.');
  }

  console.error('Unable to authenticate to any Screeps host with the provided token.');
  process.exit(1);
}

main();
