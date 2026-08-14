---
name: screeps-api-typing
description: Use the official Screeps API names and typings instead of generic JavaScript assumptions or browser-like APIs.
---

# Screeps API Typing

## When to use this skill

Use this whenever implementing or reviewing Screeps TypeScript, API calls, globals, room/object fields, or logic that might accidentally rely on browser or Node.js assumptions.

## Core rules

- Use the Screeps global objects and names exactly as defined by the API.
- Prefer `@types/screeps` and the canonical object prototypes (`Creep`, `Room`, `StructureSpawn`, `RoomPosition`, `PathFinder`, etc.).
- Do not assume browser globals like `document`, `window`, `fetch`, `localStorage`, or DOM APIs exist.
- Keep TypeScript types narrow and valid to the Screeps runtime.

## Correct patterns

```ts
const creep: Creep = Game.creeps[creepName];
if (!creep) {
  return;
}

const spawn: StructureSpawn | undefined = Object.values(Game.spawns)[0];
if (!spawn) {
  return;
}

spawn.spawnCreep([WORK, CARRY, MOVE]);
```

## Common pitfalls

- Using generic object access without the Screeps types.
- Assuming `fetch` or `setInterval` is available in the game VM.
- Writing code against browser DOM elements or Node.js filesystem APIs.
- Mixing in incorrect field names, such as API names that differ from the actual Screeps object model.

## Review checklist

Before accepting a Screeps change, confirm:

- all global names match the Screeps API,
- the code uses the official object types and methods,
- no browser or generic JS APIs were invented by the agent,
- TypeScript compiles cleanly against the project’s Screeps typings.
