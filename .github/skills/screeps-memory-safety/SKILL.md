---
name: screeps-memory-safety
description: Keep Screeps Memory stable, versioned, and pruned so agents do not leak stale state or invalid data across ticks.
---

# Screeps Memory Safety

## When to use this skill

Use this whenever you are writing or reviewing Screeps code that touches `Memory`, persistent room state, creep assignments, or long-lived game data.

## Core rules

- Treat `Memory` as a versioned schema, not a loose object bag.
- Create a top-level metadata object such as `Memory.meta` with a `version` field and update it when you change the schema.
- Prune stale keys on every relevant tick or initialization path.
- Keep data compact; avoid storing full game objects, circular structures, or large arrays you can reconstruct.
- Prefer stable IDs (creep names, room names, source IDs) over ephemeral references.

## Correct patterns

```ts
if (!Memory.meta || Memory.meta.version !== 1) {
  Memory.meta = { version: 1 };
  Memory.rooms = {};
}

Memory.rooms[roomName] ??= {
  harvesters: [],
  lastSeen: Game.time,
};

for (const roomName in Memory.rooms) {
  if (!Game.rooms[roomName]) {
    delete Memory.rooms[roomName];
  }
}
```

## Common pitfalls

- Writing directly to `Memory.creeps = Game.creeps` without pruning old entries.
- Storing large objects from `Game` or `RoomPosition` directly instead of IDs.
- Assuming memory is automatically migrated when code changes.
- Forgetting to remove dead creeps or obsolete room entries.

## Review checklist

Before accepting a Screeps memory change, confirm:

- the schema is explicit and versioned,
- obsolete data is cleaned up,
- the code does not store duplicated or stale game objects,
- the data remains compact enough to survive many ticks.
