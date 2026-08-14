import { info, error } from './lib/logger';
import * as roleHarvester from './roles/harvester';
import * as roleBuilder from './roles/builder';
import * as roleUpgrader from './roles/upgrader';

function countCreepsByRole(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const name in Game.creeps) {
    const creep: any = Game.creeps[name];
    const role = creep.memory.role || 'harvester';
    counts[role] = (counts[role] || 0) + 1;
  }
  return counts;
}

function ensureSpawns() {
  const spawns = Object.values(Game.spawns || {});
  if (spawns.length === 0) return;

  const counts = countCreepsByRole();
  const desired: Array<{ role: string; min: number; body: BodyPartConstant[] }> = [
    { role: 'harvester', min: 2, body: [WORK, CARRY, MOVE] },
    { role: 'builder', min: 1, body: [WORK, CARRY, MOVE] },
    { role: 'upgrader', min: 1, body: [WORK, CARRY, MOVE] },
  ];

  for (const spawn of spawns) {
    if ((spawn as any).spawning) continue;
    for (const plan of desired) {
      const current = counts[plan.role] || 0;
      if (current >= plan.min) continue;

      const name = `${plan.role}-${Game.time}`;
      const result = (spawn as any).spawnCreep(plan.body, name, { memory: { role: plan.role } });
      if (result === OK) {
        info(`Spawned ${name} as ${plan.role}`);
        return;
      }
      if (result !== ERR_NOT_ENOUGH_ENERGY && result !== ERR_BUSY && result !== ERR_RCL_NOT_ENOUGH) {
        error(`Failed to spawn ${plan.role}: ${result}`);
      }
      break;
    }
  }
}

export function loop() {
  try {
    // Basic CPU safeguard: skip non-critical work if CPU is nearly exhausted
    const cpuUsed = (Game.cpu && (Game.cpu.getUsed as any) ? (Game.cpu.getUsed as any)() : 0);
    if (cpuUsed && cpuUsed > 45) {
      info(`High CPU usage detected: ${cpuUsed}, skipping heavy tasks this tick.`);
      return;
    }

    ensureSpawns();

    for (const name in Game.creeps) {
      const creep: any = Game.creeps[name];
      try {
        const role = creep.memory.role || 'harvester';
        switch (role) {
          case 'harvester':
            roleHarvester.run(creep);
            break;
          case 'builder':
            roleBuilder.run(creep);
            break;
          case 'upgrader':
            roleUpgrader.run(creep);
            break;
          default:
            // fallback: act as harvester
            roleHarvester.run(creep);
            break;
        }
      } catch (e) {
        error(`Error running creep ${name}: ${e}`);
        // store last error in Memory for later inspection
        const mem: any = (Memory as any);
        if (!mem.errors) mem.errors = {};
        mem.errors[name] = (mem.errors[name] || 0) + 1;
      }
    }
  } catch (e) {
    // top-level catch to avoid uncaught exceptions
    console.log('Top-level loop error: ' + e);
  }
}

// Expose loop to Screeps runtime and legacy global loaders.
declare const global: any;
declare const module: any;
module.exports.loop = loop;
global.loop = loop;
