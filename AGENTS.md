# Repository Agent Guidelines

This repository is a Screeps TypeScript scaffold for building and deploying an AI bot. The goal is to keep the project easy to reason about, safe to deploy, and straightforward for GitHub Copilot or automation agents to extend.

## Agent Roles and Scope

### Primary tasks

- Improve the Screeps bot code without changing unrelated infrastructure.
- Prefer small, well-scoped edits and keep the build green.
- Preserve deployment safety by avoiding committed credentials and secrets.

### Operational rules

- Read-only by default; write only when the task requires code or workflow changes.
- Keep changes surgical and easy to review.
- Use repository conventions in `package.json`, `tsconfig.json`, and `src/`.
- When updating deployment or CI behavior, prefer GitHub Actions with explicit secrets rather than hardcoded credentials.

## Project goals

- Build and deploy a Screeps TypeScript bot reliably.
- Maintain a repeatable build pipeline.
- Make automation and Copilot guidance explicit and consistent.
- Keep the repo friendly to documentation and issue tracking.

## Recommended workflow

1. Triage the task and identify the smallest implementation path.
2. Update tests or validation steps when behavior changes.
3. Prefer the existing TypeScript build and minimal scripts.
4. Validate with `npm run build` before finishing.
5. Update README or issue docs when user-facing workflows change.

## Build and validation

Use the repository scripts instead of ad hoc commands:

```bash
npm ci
npm run build
```

If deployment is involved, use `screeps.json` with environment-backed values and never commit real credentials.

## Security expectations

- Do not add credentials, tokens, or private server settings to committed files.
- Use GitHub Actions secrets for Screeps authentication and deployment.
- Keep scripts readable and avoid broad shell execution or hidden side effects.

## Documentation expectations

Update documentation when behavior or automation changes, especially:

- `README.md`
- `.github/copilot-instructions.md`
- workflow notes or deployment instructions

## Preferred coding patterns

- Use TypeScript strictness and small modules.
- Favor explicit types and readable names.
- Keep runtime code and deployment code decoupled.
- Avoid unnecessary dependencies or large refactors.

This repository does not need a complex multi-agent swarm; a focused, maintainable automation setup is the better fit for the current scope.
