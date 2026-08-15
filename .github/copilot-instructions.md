# GitHub Copilot Instructions

This repository is a Screeps TypeScript scaffold used to build and deploy a bot to the Screeps MMO. Keep changes minimal, safe, and easy to validate.

## Core principles

- Prefer small, targeted edits over large refactors.
- Preserve deploy safety: never commit credentials or tokens.
- Keep TypeScript strict and readable.
- Validate with the repository build before handing off work.
- Update the README when the workflow or deployment instructions change.

## Preferred task types

- Small feature work in `src/`
- Build and deployment automation fixes in `.github/workflows/`
- Documentation improvements that reduce setup confusion
- Security-safe workflow adjustments using GitHub Actions secrets

## Avoid

- Hardcoded Screeps credentials or tokens
- Unnecessary new dependencies
- Broad architectural rewrites without a clear need
- Workflow changes that bypass verification or security checks

## Build workflow

```bash
npm ci
npm run build
```

## Deployment guidance

- Use `screeps.json` for local config only.
- Prefer environment variables or GitHub secrets in CI.
- Keep secrets out of source control.
- Treat deployment scripts as fragile operational tooling, not as a place to hide custom logic.

## Repository conventions

- Source code lives in `src/`.
- Root scripts are defined in `package.json`.
- CI workflows live under `.github/workflows/`.
- Keep helper and automation files in the repo root or `.github/` as needed.

## Completion expectations

Before considering a change finished, verify:

1. The project still builds.
2. The changes are limited to the requested scope.
3. The README and workflow docs reflect any changed behavior.
4. No secrets were added to source control.
