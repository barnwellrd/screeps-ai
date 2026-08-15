import { writeFile } from 'node:fs/promises';

const FEEDBACK_LABEL = 'screeps-feedback-approved';
const PATCH_BLOCK = /\/screeps-feedback\s*\r?\n```diff\r?\n([\s\S]*?)\r?\n```/g;
const ALLOWED_PATHS = [/^src\//, /^config\//, /^README\.md$/];

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set.`);
  }
  return value;
}

async function getJson(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GET ${url} failed (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

function validatePatch(patch) {
  if (!patch.includes('diff --git ')) {
    throw new Error('Each feedback block must contain a unified git diff.');
  }

  const changedPaths = [
    ...patch
      .matchAll(/^diff --git a\/(.+?) b\/(.+)$/gm)
      .flatMap((match) => [match[1], match[2]]),
    ...patch
      .matchAll(/^(?:---|\+\+\+) (?:a\/|b\/)?(.+)$/gm)
      .map((match) => match[1])
  ].filter((path) => path !== '/dev/null');
  if (changedPaths.length === 0) {
    throw new Error('The feedback patch did not identify any changed files.');
  }
  for (const path of changedPaths) {
    const pathSegments = path.split('/');
    if (
      pathSegments.includes('.') ||
      pathSegments.includes('..') ||
      !ALLOWED_PATHS.some((allowedPath) => allowedPath.test(path))
    ) {
      throw new Error(
        `Feedback patch changes "${path}", which is outside the permitted src/, config/, and README.md paths.`
      );
    }
  }
}

async function main() {
  const issueNumber = process.argv[2];
  if (!/^[1-9]\d*$/.test(issueNumber ?? '')) {
    throw new Error('Provide a positive numeric issue number.');
  }

  const repository = requiredEnvironment('GITHUB_REPOSITORY');
  const token = requiredEnvironment('GITHUB_TOKEN');
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28'
  };
  const issueUrl = `https://api.github.com/repos/${repository}/issues/${issueNumber}`;
  const issue = await getJson(issueUrl, headers);
  if (issue.pull_request) {
    throw new Error(`#${issueNumber} is a pull request, not a feedback issue.`);
  }
  if (!issue.labels.some((label) => label.name === FEEDBACK_LABEL)) {
    throw new Error(`#${issueNumber} must have the ${FEEDBACK_LABEL} label.`);
  }

  const comments = await getJson(`${issueUrl}/comments?per_page=100`, headers);
  const patches = [];
  for (const comment of comments) {
    for (const match of comment.body.matchAll(PATCH_BLOCK)) {
      validatePatch(match[1]);
      patches.push(match[1]);
    }
  }
  if (patches.length === 0) {
    throw new Error(
      `#${issueNumber} has no approved feedback in the required /screeps-feedback followed by \`\`\`diff block format.`
    );
  }

  await writeFile('approved-feedback.patch', `${patches.join('\n')}\n`, 'utf8');
  console.log(`Collected ${patches.length} approved feedback patch(es) from #${issueNumber}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
