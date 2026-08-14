const https = require('https');

function requestJson(hostname, path, token) {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname,
        path,
        method: 'GET',
        headers: { 'X-Token': token },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += String(chunk)));
        res.on('end', () => {
          let body = null;
          try {
            body = JSON.parse(data);
          } catch (e) {
            body = { raw: data };
          }
          resolve({ status: res.statusCode || 0, body });
        });
      }
    );
    req.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    req.end();
  });
}

function summarizeRoomsPayload(payload) {
  if (Array.isArray(payload)) {
    return payload.map((entry) => entry.room || entry.name || entry.id || 'unknown');
  }
  if (payload && Array.isArray(payload.rooms)) {
    return payload.rooms.map((entry) => entry.room || entry.name || entry.id || 'unknown');
  }
  return [];
}

async function main() {
  const token = process.env.SCREEPS_TOKEN;
  if (!token) {
    console.log('[GROWTH_REPORT] skipped: SCREEPS_TOKEN not set');
    process.exit(0);
  }

  const host = process.env.SCREEPS_HOST || 'screeps.com';
  const auth = await requestJson(host, '/api/auth/me', token);
  if (auth.status < 200 || auth.status >= 300) {
    console.error('[GROWTH_REPORT] auth failed', auth.status, JSON.stringify(auth.body));
    process.exit(1);
  }

  const rooms = await requestJson(host, '/api/user/rooms', token);
  const roomNames = summarizeRoomsPayload(rooms.body);
  const memory = await requestJson(host, '/api/user/memory', token);
  let memoryRoomNames = [];
  let memoryErrors = {};
  if (memory.status >= 200 && memory.status < 300 && memory.body && typeof memory.body.data === 'string') {
    try {
      const parsedMemory = JSON.parse(memory.body.data);
      if (parsedMemory && parsedMemory.rooms && typeof parsedMemory.rooms === 'object') {
        memoryRoomNames = Object.keys(parsedMemory.rooms);
      }
      if (parsedMemory && parsedMemory.errors && typeof parsedMemory.errors === 'object') {
        memoryErrors = parsedMemory.errors;
      }
    } catch (e) {
      memoryRoomNames = [];
    }
  }
  const user = auth.body && auth.body.username ? auth.body.username : 'unknown';
  const gcl = auth.body && auth.body.gcl !== undefined ? auth.body.gcl : 'unknown';
  const cpu = auth.body && auth.body.cpu !== undefined ? auth.body.cpu : 'unknown';

  console.log(
    `[GROWTH_REPORT] user=${user} cpu=${cpu} gcl=${gcl} ` +
      `apiRoomCount=${roomNames.length} apiRooms=${JSON.stringify(roomNames)} ` +
      `memoryRoomCount=${memoryRoomNames.length} memoryRooms=${JSON.stringify(memoryRoomNames)} ` +
      `memoryErrors=${JSON.stringify(memoryErrors)}`
  );
}

main().catch((e) => {
  console.error('[GROWTH_REPORT] unexpected error', e && e.stack ? e.stack : e);
  process.exit(1);
});
