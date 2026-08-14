---
name: screeps-cpu-budgeting
description: Keep Screeps logic cheap, bounded, and efficient so CPU usage stays within the tick budget across large or busy rooms.
---

# Screeps CPU Budgeting

## When to use this skill

Use this whenever you are designing loops, room scanning code, pathfinding logic, or any behavior that can grow with the number of creeps, rooms, or structures.

## Core rules

- Remember that CPU is a hard budget each tick.
- Avoid repeated expensive searches (`find`, `findClosestByPath`, large nested loops) unless cached or necessary.
- Use early exits and cheap checks before expensive operations.
- Cache room data or IDs that are reused across ticks.
- Prefer simple deterministic logic over broad global scans when available.

## Correct patterns

```ts
const room = Game.rooms[roomName];
if (!room) {
  return;
}

const sources = room.find(FIND_SOURCES);
if (sources.length === 0) {
  return;
}

const target = creep.pos.findClosestByPath(sources);
if (!target) {
  return;
}
```

## Common pitfalls

- Running full-scene scans inside every creep loop.
- Recomputing paths or nearest objects repeatedly without caching.
- Building deeply nested loops over all creeps, room objects, and structures each tick.
- Ignoring `Game.cpu.getUsed()` or tick-limit constraints while drafting logic.

## Review checklist

Before accepting a Screeps change, confirm:

- expensive work is limited by room or tick scope,
- repeated find operations are minimized,
- the code exits early when data is unavailable,
- the algorithm scales with larger worlds without runaway CPU use.
