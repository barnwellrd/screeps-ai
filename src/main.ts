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

    const roleCounts: Record<string, number> = {};
    let workerEnergy = 0;
    let harvesterEnergy = 0;

    for (const name in Game.creeps) {
      const creep: any = Game.creeps[name];
      try {
        const role = creep.memory.role || 'harvester';
        roleCounts[role] = (roleCounts[role] || 0) + 1;
        const creepEnergy = creep.store && creep.store.getUsedCapacity ? creep.store.getUsedCapacity(RESOURCE_ENERGY) : 0;
        if (role === 'harvester') {
          harvesterEnergy += creepEnergy;
        } else {
          workerEnergy += creepEnergy;
        }
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

    if ((Game.time as any) % 50 === 0) {
      const roomSummaries: any[] = [];
      for (const roomName in Game.rooms) {
        const room: any = Game.rooms[roomName];
        const structures = room.find(FIND_STRUCTURES as any) as any[];
        let spawnExtensionFree = 0;
        let spawnExtensionUsed = 0;
        let storedEnergy = 0;

        for (const s of structures) {
          if (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) {
            spawnExtensionFree += s.store.getFreeCapacity(RESOURCE_ENERGY);
            spawnExtensionUsed += s.store.getUsedCapacity(RESOURCE_ENERGY);
          }
          if (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) {
            storedEnergy += s.store.getUsedCapacity(RESOURCE_ENERGY);
          }
        }

        roomSummaries.push({
          room: roomName,
          spawnExtUsed: spawnExtensionUsed,
          spawnExtFree: spawnExtensionFree,
          storedEnergy,
          constructionSites: room.find(FIND_CONSTRUCTION_SITES as any).length,
          controllerProgress:
            room.controller && room.controller.progressTotal
              ? `${room.controller.progress}/${room.controller.progressTotal}`
              : 'n/a',
        });
      }

      info(
        `[STATE] tick=${Game.time} roles=${JSON.stringify(roleCounts)} ` +
          `harvesterEnergy=${harvesterEnergy} workerEnergy=${workerEnergy} rooms=${JSON.stringify(roomSummaries)}`
      );
    }
  } catch (e) {
    // top-level catch to avoid uncaught exceptions
    console.log('Top-level loop error: ' + e);
  }
};

// Expose global loop required by some loaders
declare const global: any;

global.loop = loop;
