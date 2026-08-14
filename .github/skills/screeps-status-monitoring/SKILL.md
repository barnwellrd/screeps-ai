---
name: screeps-status-monitoring
description: Monitor the runtime, room state, and CPU usage so the agent can assess current Screeps game status and make safe adjustments.
---

# Screeps Status Monitoring

## When to use this skill

Use this when the agent needs to assess live runtime conditions before changing strategy, deploying code, or diagnosing a failure in a Screeps script.

## Core rules

- Read `Game.time`, `Game.cpu`, visible rooms, and key room objects before making decisions.
- Watch room presence, ownership, creep counts, and structure health to understand the current status.
- Use `Memory` counters or snapshots to compare current state across ticks.
- Treat monitoring as a low-cost read path; do not scan everything every tick if a smaller aggregate is sufficient.

## Correct patterns

```ts
const status = {
  time: Game.time,
  cpuUsed: Game.cpu.getUsed(),
  bucket: Game.cpu.bucket,
  rooms: Object.keys(Game.rooms).length,
  creeps: Object.keys(Game.creeps).length,
};

console.log(JSON.stringify(status));
```

```ts
const roomStatus = Object.entries(Game.rooms).map(([roomName, room]) => ({
  roomName,
  controller: room.controller?.level ?? null,
  sources: room.find(FIND_SOURCES).length,
  creeps: room.find(FIND_MY_CREEPS).length,
}));
```

## Common pitfalls

- Making tactical decisions without checking `Game.cpu.getUsed()` or `Game.time`.
- Assuming every room is visible or fully populated.
- Logging too much raw data and exceeding the CPU budget.
- Forgetting to capture a stable summary for trend analysis across ticks.

## Review checklist

Before accepting a status-monitoring approach, confirm:

- it reads only the needed runtime signals,
- it handles missing rooms or objects gracefully,
- it emits concise summaries instead of excessive logs,
- it helps the agent make safe decisions without causing CPU pressure.
