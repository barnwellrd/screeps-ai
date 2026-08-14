import { recordRuntimeError } from './runtimeErrors';

export function run(creep: any) {
  try {
    // If harvester has space, harvest
    if (creep.store.getFreeCapacity() > 0) {
      const source = (creep.pos as any).findClosestByPath(FIND_SOURCES as any) as any;
      if (!source) return;
      if ((creep.harvest as any)(source) == ERR_NOT_IN_RANGE) {
        (creep.moveTo as any)(source, { visualizePathStyle: { stroke: '#ffaa00' } });
      }
    } else {
      // Harvester is full - try to distribute energy to multiple targets
      let transferred = false;

      // Priority 1: Try spawn/extension/tower refill
      const spawn = (creep.pos as any).findClosestByPath(FIND_STRUCTURES as any, {
        filter: (s: any) =>
          (s.structureType == STRUCTURE_SPAWN ||
            s.structureType == STRUCTURE_EXTENSION ||
            s.structureType == STRUCTURE_TOWER) &&
          s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      }) as any;
      if (spawn) {
        if ((creep.transfer as any)(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          (creep.moveTo as any)(spawn, { visualizePathStyle: { stroke: '#ffffff' } });
        }
        transferred = true;
      }

      // Priority 2: Try container
      if (!transferred) {
        const container = (creep.pos as any).findClosestByPath(FIND_STRUCTURES as any, {
          filter: (s: any) => s.structureType == STRUCTURE_CONTAINER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        }) as any;
        if (container) {
          if ((creep.transfer as any)(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            (creep.moveTo as any)(container, { visualizePathStyle: { stroke: '#ffff00' } });
          }
          transferred = true;
        }
      }

      // Priority 3: Try storage
      if (!transferred) {
        const storage = (creep.pos as any).findClosestByPath(FIND_STRUCTURES as any, {
          filter: (s: any) => s.structureType == STRUCTURE_STORAGE && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        }) as any;
        if (storage) {
          if ((creep.transfer as any)(storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            (creep.moveTo as any)(storage, { visualizePathStyle: { stroke: '#ffff00' } });
          }
          transferred = true;
        }
      }

      // Priority 4: Direct transfer to nearby workers
      if (!transferred) {
        const ally = (creep.pos as any).findClosestByPath(FIND_MY_CREEPS as any, {
          filter: (c: any) =>
            (c.memory.role == 'builder' || c.memory.role == 'upgrader' || c.memory.role == 'repairer') &&
            c.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        }) as any;
        if (ally) {
          if ((creep.transfer as any)(ally, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            (creep.moveTo as any)(ally, { visualizePathStyle: { stroke: '#ffff00' } });
          }
          transferred = true;
        }
      }

      if (!transferred) {
        const idleAnchor = creep.room.controller || Game.spawns[Object.keys(Game.spawns)[0]];
        if (idleAnchor) {
          (creep.moveTo as any)(idleAnchor, { visualizePathStyle: { stroke: '#ffff00' } });
        }
      }
    }
  } catch (e) {
    recordRuntimeError({ creep: creep.name, role: 'harvester', error: e });
    console.log(`harvester ${creep.name} error: ${e}`);
  }
}
