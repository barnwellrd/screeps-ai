import { info, error, metrics } from './lib/logger';
import { updateRoomMetrics } from './lib/roomState';
import * as roleHarvester from './roles/harvester';
import * as roleMiner from './roles/miner';
import * as roleCarrier from './roles/carrier';
import * as roleBuilder from './roles/builder';
import * as roleUpgrader from './roles/upgrader';
import * as roleGuard from './roles/guard';
import { run as runSpawnManager } from './manager/spawnManager';

export const loop = function() {
  try {
    // Clean stale creep memory to avoid accumulating dead entries and wasting Memory
    for (const name in Memory.creeps) {
      if (!Game.creeps[name]) {
        delete Memory.creeps[name];
      }
    }

    // Basic CPU safeguard: skip non-critical work if CPU is nearly exhausted
    const cpuUsed = (Game.cpu && (Game.cpu.getUsed as any) ? (Game.cpu.getUsed as any)() : 0);
    if (cpuUsed && cpuUsed > 45) {
      info(`High CPU usage detected: ${cpuUsed}, skipping heavy tasks this tick.`);
      return;
    }

    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName];
      const roomMetrics = updateRoomMetrics(room);
      if (Game.time % 25 === 0) {
        const roles = Object.keys(roomMetrics.roles)
          .filter((key) => roomMetrics.roles[key] > 0)
          .map((key) => `${key}:${roomMetrics.roles[key]}`)
          .join(', ');
        metrics(`Room ${roomMetrics.name}: energy ${roomMetrics.energyAvailable}/${roomMetrics.energyCapacityAvailable}, sites ${roomMetrics.constructionSites}, repairs ${roomMetrics.repairTargets}, hostiles ${roomMetrics.hostileCount}, roles ${roles}`);
      }
    }

    runSpawnManager();

    for (const name in Game.creeps) {
      const creep: any = Game.creeps[name];
      try {
        const role = creep.memory.role || 'harvester';
        switch (role) {
          case 'harvester':
            roleHarvester.run(creep);
            break;
          case 'miner':
            roleMiner.run(creep);
            break;
          case 'carrier':
            roleCarrier.run(creep);
            break;
          case 'builder':
            roleBuilder.run(creep);
            break;
          case 'upgrader':
            roleUpgrader.run(creep);
            break;
          case 'guard':
            roleGuard.run(creep);
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
};

// Expose global loop required by some loaders
declare const global: any;

global.loop = loop;
