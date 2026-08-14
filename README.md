screeps-ai scaffold

This scaffold helps integrate a TypeScript project with Screeps and provides basic build and deploy scripts.

How to use

1. If you have the repository locally, copy the files from this scaffold into the repo root (or merge as needed).
2. Edit screeps.json with your Screeps credentials and branch. Prefer using a token/password stored in CI secrets rather than committing them.
3. Install dependencies:

   npm install

4. Build:

   npm run build

5. Deploy to Screeps:

   npm run deploy

Notes and recommendations

- The environment used to set up this scaffold did not have git installed and could not directly clone the repository. If cloning is required, install git on the machine and run:

    git clone https://github.com/barnwellrd/screeps-ai.git

- For CI-driven deployments, add a GitHub Actions workflow that checks out the repo, installs dependencies, builds, and runs the screeps upload command using secrets for credentials.

- If you prefer a different deploy tool (screeps-sync, @screeps/webpack-plugin, or a custom API integration), replace the deploy script and screeps.json accordingly.

- To integrate this scaffold directly into the cloned repository, copy the screeps.json, package.json (merge dependencies/scripts), tsconfig.json, and src/ files into the repo root, then run npm install and test the build and deploy steps.

AI workflow improvements

This repo now includes a few high-value automation patterns from the Screeps GPT approach:

- `AGENTS.md` centralizes repository instructions for Copilot and automation agents.
- `.github/copilot-instructions.md` sets project-specific coding rules and validation expectations.
- `.github/copilot-environment.json` configures a reusable Copilot runtime with Node 22 and `npm ci` setup.
- `.github/workflows/copilot-setup-steps.yml` ensures the agent environment is prepared before tasks run.
- `.github/workflows/ci-quality.yml` runs a build gate on push and pull request so broken changes are caught early.
- `.github/ISSUE_TEMPLATE/` gives bug reports and feature requests a consistent intake flow.

These are intentionally lightweight and focused on a single-engineering workflow rather than a full multi-agent swarm.
