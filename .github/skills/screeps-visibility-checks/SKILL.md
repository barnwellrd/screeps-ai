---
name: screeps-visibility-checks
description: Guard all room and object access with visibility checks before using Screeps APIs that depend on known world state.
---

# Screeps Visibility Checks

## When to use this skill

Use this whenever the logic reads `Game.rooms`, room objects, `Game.getObjectById()`, exits, or map data or when a plan depends on room data being visible.

## Core rules

- Do not assume every room is visible or every object can be accessed.
- Check `Game.rooms[roomName]` or `room` existence before using room APIs.
- Check `Game.getObjectById(id)` return values before dereferencing them.
- Treat unseen or partially visible rooms as valid states, not as impossible conditions.

## Correct patterns

```ts
const room = Game.rooms[roomName];
if (!room) {
  return;
}

const target = Game.getObjectById<Source>(sourceId);
if (!target) {
  return;
}

const exitDir = creep.pos.findClosestByRange(FIND_EXIT_TOP);
if (!exitDir) {
  return;
}
```

## Common pitfalls

- Assuming `Game.rooms[roomName]` always exists.
- Using `room.controller` without checking whether the room is owned or visible.
- Calling `Game.getObjectById()` and immediately using the result without null handling.
- Writing logic that depends on hidden rooms or stale IDs from previous ticks.

## Review checklist

Before accepting a Screeps change, confirm:

- all room-level reads are guarded,
- all object IDs are checked before use,
- hidden or stale data paths degrade gracefully,
- the code does not assume global visibility in a partial-vision world.
