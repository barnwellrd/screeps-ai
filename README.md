screeps-ai scaffold

This scaffold helps integrate a TypeScript project with Screeps and provides basic build and deploy scripts.

AI agent quick reference

- Review the Screeps docs at https://docs.screeps.com/
- Use the focused API notes in [SCREEPS_API_AGENT_GUIDE.md](./SCREEPS_API_AGENT_GUIDE.md) before generating or editing game logic.

How to use

1. If you have the repository locally, copy the files from this scaffold into the repo root (or merge as needed).
2. Edit screeps.json with your Screeps credentials and branch. Prefer using a token/password stored in CI secrets rather than committing them.
3. Install dependencies:

   npm install

4. Build:

   npm run build

   This also stamps [dist/main.js](C:/Users/barnw/repos/screeps-ai-scaffold.worktrees/game-state-analysis-upgraders-builders/dist/main.js) with a `// BUILD_TIMESTAMP: ...` comment at the top.

5. Deploy to Screeps:

   npm run deploy

Notes and recommendations

- The environment used to set up this scaffold did not have git installed and could not directly clone the repository. If cloning is required, install git on the machine and run:

    git clone https://github.com/barnwellrd/screeps-ai.git

- For CI-driven deployments, add a GitHub Actions workflow that checks out the repo, installs dependencies, builds, and runs the screeps upload command using secrets for credentials.

- If you prefer a different deploy tool (screeps-sync, @screeps/webpack-plugin, or a custom API integration), replace the deploy script and screeps.json accordingly.

- To integrate this scaffold directly into the cloned repository, copy the screeps.json, package.json (merge dependencies/scripts), tsconfig.json, and src/ files into the repo root, then run npm install and test the build and deploy steps.

Updated by automated agent at 2026-08-13T23:12:50.8375385-04:00

## Live status automation

The `Check Screeps Status` GitHub Actions workflow runs every 15 minutes and compares
the live account's rooms with [`config/screeps-status-projections.json`](config/screeps-status-projections.json).
It requires an `SCREEPS_TOKEN` repository secret containing a Screeps API token.
Replace the example `W0N0` projection with the rooms and controller-level targets for
the live account before enabling the workflow.

When a projection is below target, the workflow creates or updates a
`screeps-status-deficit` issue. To supply executable agent feedback for a deficit,
add the `screeps-feedback-approved` label to an open issue and include a comment
in this exact format:

````text
/screeps-feedback
```diff
diff --git a/src/main.ts b/src/main.ts
--- a/src/main.ts
+++ b/src/main.ts
@@ -1,3 +1,4 @@
 import { info, error } from './lib/logger';
+// Explain why this change addresses the deficit.
```
````

An authorized repository user can then run `Apply Screeps Feedback` from the
Actions tab, supplying the feedback issue number. The workflow validates that the
issue is approved, applies only patches to `src/`, `config/`, or `README.md`, runs
`npm run build`, creates a remediation pull request, merges it, and posts the
result to the issue. Feedback which changes workflow, dependency, or deployment
files is rejected to prevent a feedback item from expanding its own permissions.
The repository must permit GitHub Actions to create and merge pull requests for
the final merge step to succeed.

The status-check workflow never deploys or changes the live Screeps branch
automatically. The deployment workflow runs after the validated remediation has
been merged.
