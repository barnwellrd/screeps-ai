import { info, error } from './lib/logger';
import * as roleHarvester from './roles/harvester';
import * as roleBuilder from './roles/builder';
import * as roleUpgrader from './roles/upgrader';

export const loop = function() {
  try {
    // Basic CPU safeguard: skip non-critical work if CPU is nearly exhausted
    const cpuUsed = (Game.cpu && (Game.cpu.getUsed as any) ? (Game.cpu.getUsed as any)() : 0);
    if (cpuUsed && cpuUsed > 45) {
      info(`High CPU usage detected: ${cpuUsed}, skipping heavy tasks this tick.`);
      return;
    }

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
        if (!Memory.errors) Memory.errors = {} as any;
        Memory.errors[name] = (Memory.errors[name] || 0) + 1;
      }
    }
  } catch (e) {
    // top-level catch to avoid uncaught exceptions
    console.log('Top-level loop error: ' + e);
  }
};

// Expose global loop required by some loaders
declare global {
  interface Global { loop: () => void }
}

global.loop = loop;
