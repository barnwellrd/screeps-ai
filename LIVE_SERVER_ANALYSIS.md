# Screeps live-server analysis and suggestions

## Current state

This bot is a small prototype that already has the basic runtime structure:

- a main loop in `src/main.ts`
- creep dispatch by role
- role files for harvester, builder, and upgrader
- console logging helper functions

That means the code is structured enough to run, but it is not yet a robust live-server economy or defense bot.

## What the current logic does well

- It boots cleanly and handles errors without crashing the whole loop.
- It guards against high CPU by stopping expensive work if `Game.cpu.getUsed()` rises above a threshold.
- It routes creeps by `creep.memory.role` and falls back to harvester if unknown.
- The basic role behavior is functional in a minimal room setup.

## Main weaknesses in a live server

### 1. No autonomous spawn management

The bot does not create or maintain a target number of creeps. In a live server, this means:

- no ramp-up during early game
- no automatic replacement of dead creeps
- no role balancing as room resources change

This is the biggest missing piece.

### 2. Harvester logic is too simple

The harvester currently:

- finds the nearest source
- harvests until full
- transfers directly to spawn/extension if it has energy

Problems:

- it ignores containers, storage, links, and towers
- it does not prioritize room energy distribution
- it does not handle long-distance hauling or multiple resource paths
- it can cause energy bottlenecks when the room expands

### 3. Builder and upgrader are not room-aware

The builder only builds the closest construction site and the upgrader only upgrades the controller when in range.

Missing behavior:

- build priorities by urgency
- repair logic when structures are damaged
- pause and resume behavior when energy is low
- energy checks before acting

### 4. No room economy model

A live server bot needs a simulation of economy state:

- available energy
- spawn queue demand
- build/repair backlog
- controller upgrade pressure
- room energy production vs. consumption

Without that, the bot is reactive instead of strategic.

### 5. No defense / hostile creep handling

There is no logic to react to enemy creeps, room invasions, or tower management.

For a live server, defense is not optional. Even a moderate hostile presence can disrupt a room.

### 6. No memory-driven planning

There is no use of `Memory` for room-level planning beyond error tracking. This means the bot cannot:

- remember source assignments
- track construction priorities
- persist room state between ticks
- coordinate multiple creeps intelligently

## Recommended direction

### Priority 1: add a room planner / spawn manager

Implement a `RoomPlanner` or `spawnManager` module that:

- tracks current creeps by role
- sets target role counts based on room level
- spawns replacement creeps when needed
- reacts to energy surplus or shortage

Example role targets:

- 3 to 5 harvesters early game
- 1 to 2 builders when construction sites exist
- 1 upgrader for early controller growth
- 1 reserver or guard if needed for specific room scenarios

### Priority 2: split roles into real responsibilities

Use a cleaner creep model:

- `miner`: harvest source and deposit into container or storage
- `carrier`: move energy from container/storage to spawn/extension
- `builder`: construct and repair priority targets
- `upgrader`: upgrade controller when energy is available
- `guard` / `defender`: handle hostile activity

This is much more stable than a single role that tries to do everything.

### Priority 3: support containers and storage

The next major upgrade should be:

- assign miners to nearby sources
- store energy in containers
- let carriers use those containers as supply
- keep spawns/extensions topped up without wasting every harvester on direct delivery

This greatly improves efficiency and survival in live play.

### Priority 4: add repair and emergency logic

Repair logic should trigger when:

- a structure is below a threshold
- energy reserves are healthy
- a tower or spawn is damaged

This keeps the room functional and avoids cascading failures.

### Priority 5: add defense and threat handling

At minimum:

- detect hostile creeps in room
- prioritize retreat or tower response
- stop risky upgrades/builds if the room is under attack

## Suggested implementation order

1. Add a spawn and role-count manager.
2. Add container-aware mining and carrying.
3. Add repair logic and build priority ordering.
4. Add room-memory state tracking.
5. Add hostile creep detection and defense checks.
6. Add logging metrics for creep counts, energy flow, and CPU usage.

## Recommended next coding changes

- Create a `src/manager/spawnManager.ts` module.
- Create a `src/room/roomState.ts` or `src/lib/roomMemory.ts` module.
- Rewrite `src/roles/harvester.ts` into a miner + carrier split.
- Extend `builder.ts` to repair damaged structures and prioritize build targets.
- Add a `defense.ts` module and call it before regular creep work when hostiles are detected.

## Bottom line

The current bot is a useful sandbox starting point, but it is not yet a competitive live-server strategy. The strongest improvement area is economic planning and role management, not just minor behavior tweaks.

If this project is meant to run in a live Screeps server, the next milestone should be:

- stable creep population management
- miner/carrier split
- container-based energy flow
- repair and defense logic

Those changes will matter much more than micro-optimizing the current role methods.
