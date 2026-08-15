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

function findDeficits(projections, rooms) {
  const roomsByName = new Map(rooms.map((room) => [room.name, room]));
  const deficits = [];

  for (const projection of projections) {
    const room = roomsByName.get(projection.name);
    if (!room) {
      deficits.push({
        key: `${projection.name}:missing`,
        room: projection.name,
        message: 'The room is not present in the live account response.'
      });
      continue;
    }

    if (projection.requireActive && room.status !== 'normal') {
      deficits.push({
        key: `${projection.name}:inactive`,
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
          key: `${projection.name}:controller-level`,
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
  const liveStatus = await getJson(`${host}/api/user/rooms`, {
    headers: { 'X-Token': screepsToken }
  });
  if (!Array.isArray(liveStatus.rooms)) {
    throw new Error('Screeps live status response did not contain a rooms array.');
  }

  const deficits = findDeficits(config.rooms, liveStatus.rooms);
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
