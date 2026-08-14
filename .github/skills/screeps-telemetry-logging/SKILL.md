---
name: screeps-telemetry-logging
description: Emit compact, structured runtime telemetry so the agent can trace game status, CPU usage, room state, and behavior changes without noisy output.
---

# Screeps Telemetry Logging

## When to use this skill

Use this when the agent needs to inspect or debug runtime state while keeping logs useful and cheap enough to run in the Screeps tick budget.

## Core rules

- Keep telemetry compact and structured.
- Log the state that matters: tick, CPU used, room count, creep counts, and the key metric for the current task.
- Prefer one summary per tick over per-creep dump logs.
- Use stable keys and minimal object shape so logs stay readable.

## Correct patterns

```ts
Memory.telemetry ??= {};
Memory.telemetry[Game.time] = {
  cpuUsed: Game.cpu.getUsed(),
  creeps: Object.keys(Game.creeps).length,
  rooms: Object.keys(Game.rooms).length,
};

if (Game.time % 100 === 0) {
  console.log('telemetry', JSON.stringify(Memory.telemetry[Game.time]));
}
```

```ts
const summary = {
  time: Game.time,
  bucket: Game.cpu.bucket,
  hi: Object.values(Game.creeps).filter(c => c.memory.role === 'harvester').length,
};
console.log('status', JSON.stringify(summary));
```

## Common pitfalls

- Logging every creep every tick, which creates noisy and expensive output.
- Logging full room objects or memory trees instead of summaries.
- Not pruning old telemetry entries in `Memory`.
- Forgetting to include CPU metrics when diagnosing behavior.

## Review checklist

Before accepting logging changes, confirm:

- the log is concise and structured,
- the data is targeted to the problem or decision point,
- old telemetry is pruned or bounded,
- the logging stays within CPU and memory constraints.
