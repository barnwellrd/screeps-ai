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

      // Priority 1: Try spawn/extension
      const spawn = (creep.pos as any).findClosestByPath(FIND_STRUCTURES as any, {
        filter: (s: any) => (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
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

      // Priority 4: Direct transfer to nearby builder/upgrader if very close
      if (!transferred) {
        const ally = (creep.pos as any).findClosestByPath(FIND_MY_CREEPS as any, {
          filter: (c: any) => (c.memory.role == 'builder' || c.memory.role == 'upgrader') && c.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        }) as any;
        if (ally && (creep.pos as any).getRangeTo(ally) <= 1) {
          (creep.transfer as any)(ally, RESOURCE_ENERGY);
        }
      }
    }
  } catch (e) {
    console.log(`harvester ${creep.name} error: ${e}`);
  }
}
