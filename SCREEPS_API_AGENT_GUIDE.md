# Screeps API quick reference for AI agents

This project targets the Screeps game API documented at https://docs.screeps.com/ and is meant to help code-generation agents stay within the actual game model instead of assuming ordinary Node.js or browser semantics.

## Core runtime model

- Screeps is tick-based: `Game.time` increments every tick and world state is reloaded each tick.
- The main globals are `Game`, `Memory`, `RawMemory`, and `PathFinder`.
- Most game worlds are accessed through global objects such as `Game.creeps`, `Game.rooms`, `Game.spawns`, and `Game.structures`.
- `Memory` is persistent across ticks, but you must version and prune keys yourself.
- `Game.getObjectById(id)` only works for objects in rooms currently visible to your account.

## High-value API surfaces

### Global state

- `Game.time`: current tick.
- `Game.cpu`: CPU usage, tick limit, bucket, and shard allocation helpers.
- `Game.gcl` / `Game.gpl`: global control and power level objects.
- `Game.map`: world map access.
- `Game.market`: market access.
- `Game.shard`: current shard metadata.
- `Game.rooms`: visible rooms keyed by room name.
- `Game.creeps`, `Game.spawns`, `Game.structures`, `Game.flags`, `Game.constructionSites`

### Room and object APIs

- `Room` exposes terrain, vision, controller, storage, sources, exits, and find helpers.
- `Creep` exposes movement, harvesting, building, upgrading, attacking, carrying energy, and memory.
- `StructureSpawn` is the primary creep creation API (`spawnCreep`).
- `Structure` and subtype objects (`StructureExtension`, `StructureTower`, etc.) are accessed through `Game.structures` and room structures.
- `RoomPosition` and `PathFinder` are the main route-planning primitives for movement and pathing.

### CPU and resource awareness

- Use `Game.cpu.getUsed()` to track budget consumption during a tick.
- Respect `Game.cpu.tickLimit` and avoid expensive logic in large rooms or high-creep counts.
- The bucket accumulates unused CPU over time; the bucket is not a free unlimited resource.
- Large or repeated loops should be avoided when generating code for the game loop.

## Important constraints and common pitfalls

### 1. Visibility is limited

Do not assume `Game.getObjectById()` or a room object is available for every room in the world.

- Rooms are only visible if you have a creep, owned structure, or otherwise relevant visibility.
- Agents should not write code that depends on unseen rooms unless the logic explicitly checks room visibility first.

### 2. Memory is persistent but structured

- `Memory` survives between ticks, but is not automatically versioned.
- Reuse a stable schema, clear stale keys, and avoid storing large or unbounded objects.
- A common agent mistake is to assume the memory layout is free-form and self-healing; it is not.

### 3. Ticks are the unit of execution

- The game loop runs tick-by-tick; most behavior is stateful across ticks rather than continuous.
- Agents should avoid writing code that expects a single long-lived process or asynchronous operation model.
- `moveTo`, `harvest`, `build`, and similar calls are game actions scheduled per tick, not ordinary async calls.

### 4. CPU budgets are real

- The game is intentionally constrained by CPU and memory allocation.
- Code should prefer efficient loops, cached lookups, and cheap early exits.
- Agents should avoid generating heavy recursion or repetitive `findClosestByPath` loops without caching results.

### 5. Use valid Screeps APIs, not generic JavaScript assumptions

- Do not assume browser APIs, DOM APIs, network requests, or file system access are available.
- Do not assume `fetch`, `setInterval`, `localStorage`, or other runtime features exist in the game VM.
- Use the Screeps global API and the type definitions from `@types/screeps` when writing TypeScript.

## Recommended agent prompt patterns

When generating Screeps code, instruct the agent to:

- target the global `Game` / `Memory` model and tick-based loops,
- validate room visibility before using room or object references,
- keep `Memory` schema stable and trimmed,
- budget CPU by avoiding per-tick expensive searches,
- use `RoomPosition` / `PathFinder` patterns instead of hard-coded assumptions,
- prefer simple, deterministic logic that works across many ticks.

## Short reliability checklist

Before accepting generated Screeps logic, verify:

- `Game.time` or room state is being used correctly,
- visibility assumptions are guarded,
- memory keys are versioned and cleaned up,
- CPU-heavy loops are avoided,
- all object access names match Screeps API names exactly.

## Suggested future skill areas

These are the highest-value skill bundles to add later if the coding workflow repeatedly hits the same mistakes:

1. `screeps-memory-safety`: enforce stable memory schemas and cleanup patterns.
2. `screeps-visibility-checks`: require room-visibility guards before room/object API use.
3. `screeps-cpu-budgeting`: remind agents to minimize loop cost and use efficient patterns.
4. `screeps-api-typing`: prefer `@types/screeps` and canonical object names.
5. `screeps-pathing`: prefer `RoomPosition` and `PathFinder` patterns over ad hoc movement logic.

This document is intentionally short and aimed at reducing the most common generation mistakes when working with Screeps code.
