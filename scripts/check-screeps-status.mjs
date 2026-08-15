import { readFile } from 'node:fs/promises';

const DEFAULT_HOST = 'https://screeps.com';
const DEFICIT_LABEL = 'screeps-status-deficit';
const FEEDBACK_LABEL = 'screeps-feedback-approved';
const DEFICIT_MARKER_PREFIX = '<!-- screeps-status-deficit:';

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set.`);
  }
  return value;
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${options.method ?? 'GET'} ${url} failed (${response.status}): ${body}`);
  }
  return response.json();
}

function validateConfig(config) {
  if (
    !config ||
    config.version !== 1 ||
    !Array.isArray(config.rooms) ||
    config.rooms.length === 0
  ) {
    throw new Error('Projection config must contain version 1 and at least one room.');
  }

  for (const room of config.rooms) {
    if (!room || typeof room.name !== 'string' || room.name.length === 0) {
      throw new Error('Every projection must have a non-empty room name.');
    }
    if (typeof room.shard !== 'string' || room.shard.length === 0) {
      throw new Error(`Projection for ${room.name} must have a non-empty shard.`);
    }
    if (
      room.minControllerLevel !== undefined &&
      (!Number.isInteger(room.minControllerLevel) ||
        room.minControllerLevel < 0 ||
        room.minControllerLevel > 8)
    ) {
      throw new Error(`Projection for ${room.name} has an invalid minControllerLevel.`);
    }
    if (room.requireActive !== undefined && typeof room.requireActive !== 'boolean') {
      throw new Error(`Projection for ${room.name} has an invalid requireActive value.`);
    }
  }
}

async function loadApprovedFeedback(apiUrl, headers) {
  const issues = await getJson(
    `${apiUrl}/issues?state=open&labels=${encodeURIComponent(FEEDBACK_LABEL)}&per_page=100`,
    { headers }
  );

  const feedback = [];
  for (const issue of issues) {
    if (issue.pull_request) {
      continue;
    }

    const comments = await getJson(
      `${apiUrl}/issues/${issue.number}/comments?per_page=100`,
      { headers }
    );
    for (const comment of comments) {
      for (const line of comment.body.split(/\r?\n/)) {
        const match = /^\s*\/screeps-feedback\s+(.+?)\s*$/.exec(line);
        if (match) {
          feedback.push({
            issueNumber: issue.number,
            author: comment.user.login,
            action: match[1]
          });
        }
      }
    }
  }
  return feedback;
}

async function ensureLabel(apiUrl, headers, name, description, color) {
  const response = await fetch(`${apiUrl}/labels/${encodeURIComponent(name)}`, { headers });
  if (response.ok) {
    return;
  }
  if (response.status !== 404) {
    throw new Error(
      `GET ${apiUrl}/labels/${name} failed (${response.status}): ${await response.text()}`
    );
  }

  const createResponse = await fetch(`${apiUrl}/labels`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, description, color })
  });
  if (!createResponse.ok) {
    throw new Error(
      `POST ${apiUrl}/labels failed (${createResponse.status}): ${await createResponse.text()}`
    );
  }
}

async function loadLiveRooms(host, screepsToken, projections) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Token': screepsToken
  };
  const ownedRoomsResponse = await getJson(`${host}/api/user/rooms`, { headers });
  if (
    ownedRoomsResponse.ok !== 1 ||
    !ownedRoomsResponse.shards ||
    typeof ownedRoomsResponse.shards !== 'object'
  ) {
    const error = typeof ownedRoomsResponse.error === 'string' ? ownedRoomsResponse.error : 'unknown error';
    throw new Error(`Screeps user rooms request failed: ${error}.`);
  }

  const ownedRoomsByShard = new Map(
    Object.entries(ownedRoomsResponse.shards).map(([shard, rooms]) => {
      if (!Array.isArray(rooms) || rooms.some((room) => typeof room !== 'string')) {
        throw new Error(`Screeps user rooms response has an invalid room list for ${shard}.`);
      }
      return [shard, new Set(rooms)];
    })
  );
  const projectionsByShard = new Map();
  for (const projection of projections) {
    const shardProjections = projectionsByShard.get(projection.shard) ?? [];
    shardProjections.push(projection);
    projectionsByShard.set(projection.shard, shardProjections);
  }
  const liveRooms = new Map();

  for (const [shard, shardProjections] of projectionsByShard) {
    const mapStats = await getJson(`${host}/api/game/map-stats`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        rooms: shardProjections.map((projection) => projection.name),
        shard,
        statName: 'owner0'
      })
    });
    if (mapStats.ok !== 1 || !mapStats.stats || typeof mapStats.stats !== 'object') {
      const error = typeof mapStats.error === 'string' ? mapStats.error : 'unknown error';
      throw new Error(`Screeps map stats request for ${shard} failed: ${error}.`);
    }

    for (const projection of shardProjections) {
      const room = mapStats.stats[projection.name];
      liveRooms.set(`${shard}:${projection.name}`, {
        owned: ownedRoomsByShard.get(shard)?.has(projection.name) ?? false,
        level: room?.own?.level,
        status: room?.status
      });
    }
  }
  return liveRooms;
}

function findDeficits(projections, rooms) {
  const deficits = [];

  for (const projection of projections) {
    const room = rooms.get(`${projection.shard}:${projection.name}`);
    if (!room?.owned) {
      deficits.push({
        key: `${projection.shard}:${projection.name}:missing`,
        room: projection.name,
        message: `The room is not claimed by the account on ${projection.shard}.`
      });
      continue;
    }

    if (projection.requireActive && room.status !== 'normal') {
      deficits.push({
        key: `${projection.shard}:${projection.name}:inactive`,
        room: projection.name,
        message: `Expected an active room (status "normal"), but the live status is "${room.status ?? 'unknown'}".`
      });
    }

    if (projection.minControllerLevel !== undefined) {
      if (typeof room.level !== 'number') {
        throw new Error(
          `Live room ${projection.name} did not include a numeric controller level required by its projection.`
        );
      }
      if (room.level < projection.minControllerLevel) {
        deficits.push({
          key: `${projection.shard}:${projection.name}:controller-level`,
          room: projection.name,
          message: `Expected controller level ${projection.minControllerLevel} or higher, but live level is ${room.level}.`
        });
      }
    }
  }

  return deficits;
}

function issueBody(deficit, feedback) {
  const approvedFeedback =
    feedback.length === 0
      ? '_No approved agent feedback is currently available._'
      : feedback
          .map(
            ({ issueNumber, author, action }) =>
              `- ${action} (from @${author} in #${issueNumber})`
          )
          .join('\n');

  return [
    `${DEFICIT_MARKER_PREFIX}${deficit.key} -->`,
    '## Live status deficit',
    '',
    `**Room:** \`${deficit.room}\``,
    '',
    deficit.message,
    '',
    '## Approved agent feedback',
    '',
    approvedFeedback,
    '',
    'Review the live status and approved feedback before changing the Screeps agent. This automation does not deploy or alter the live branch.'
  ].join('\n');
}

async function upsertDeficitIssue(apiUrl, headers, deficit, feedback, dryRun) {
  const issues = await getJson(
    `${apiUrl}/issues?state=open&labels=${encodeURIComponent(DEFICIT_LABEL)}&per_page=100`,
    { headers }
  );
  const marker = `${DEFICIT_MARKER_PREFIX}${deficit.key} -->`;
  const existing = issues.find((issue) => !issue.pull_request && issue.body?.includes(marker));
  const title = `Screeps projection deficit: ${deficit.room}`;
  const body = issueBody(deficit, feedback);

  if (dryRun) {
    console.log(`${existing ? 'Would update' : 'Would create'} issue: ${title}`);
    return;
  }

  if (existing) {
    await getJson(`${apiUrl}/issues/${existing.number}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ title, body })
    });
    console.log(`Updated deficit issue #${existing.number}: ${title}`);
    return;
  }

  const issue = await getJson(`${apiUrl}/issues`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, body, labels: [DEFICIT_LABEL] })
  });
  console.log(`Created deficit issue #${issue.number}: ${title}`);
}

async function main() {
  const configPath = process.argv[2] ?? 'config/screeps-status-projections.json';
  const dryRun = process.argv.includes('--dry-run');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  validateConfig(config);

  const screepsToken = requiredEnvironment('SCREEPS_TOKEN');
  const repository = requiredEnvironment('GITHUB_REPOSITORY');
  const githubToken = requiredEnvironment('GITHUB_TOKEN');
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    throw new Error(`GITHUB_REPOSITORY must be owner/repository, received "${repository}".`);
  }

  const host = (config.host ?? DEFAULT_HOST).replace(/\/$/, '');
  const liveRooms = await loadLiveRooms(host, screepsToken, config.rooms);
  const deficits = findDeficits(config.rooms, liveRooms);
  if (deficits.length === 0) {
    console.log('All Screeps room projections are being met.');
    return;
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const githubHeaders = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${githubToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };
  await ensureLabel(
    apiUrl,
    githubHeaders,
    DEFICIT_LABEL,
    'Screeps live status is below a configured projection',
    'd93f0b'
  );
  await ensureLabel(
    apiUrl,
    githubHeaders,
    FEEDBACK_LABEL,
    'Approved Screeps remediation feedback',
    '0e8a16'
  );
  const feedback = await loadApprovedFeedback(apiUrl, githubHeaders);
  for (const deficit of deficits) {
    await upsertDeficitIssue(apiUrl, githubHeaders, deficit, feedback, dryRun);
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
