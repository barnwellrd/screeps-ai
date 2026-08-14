---
name: screeps-pathing
description: Use Screeps-native movement and pathing primitives so logic works with the game loop, terrain, and room positions instead of ad hoc assumptions.
---

# Screeps Pathing

## When to use this skill

Use this whenever the plan includes movement across rooms, terrain navigation, avoiding obstacles, or finding destinations, sources, or structures.

## Core rules

- Prefer `RoomPosition` and pathfinding APIs (`moveTo`, `findClosestByPath`, `PathFinder`) over manual coordinate math.
- Use the Screeps game loop semantics: movement is resolved per tick, not as continuous JavaScript state.
- Validate the target exists before pathing to it.
- Consider wall / obstacle / terrain constraints; do not assume direct linear movement is valid.

## Correct patterns

```ts
const source = creep.pos.findClosestByRange(FIND_SOURCES);
if (!source) {
  return;
}

if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
  creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
}
```

```ts
const target = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
if (target) {
  creep.moveTo(target);
}
```

## Common pitfalls

- Hard-coding movement vectors or assuming a straight path across walls or terrain.
- Ignoring `ERR_NOT_IN_RANGE` and attempting actions without moving to the target.
- Using ad hoc JavaScript path logic that does not respect Screeps terrain or pathfinding rules.
- Treating movement as an asynchronous process instead of a tick-based action.

## Review checklist

Before accepting a Screeps movement solution, confirm:

- pathing uses Screeps-native APIs,
- the target is validated before moving,
- the logic handles movement failure and range checks,
- the movement is consistent with the tick-based game loop and room terrain.
