export function run(creep: any) {
  try {
    // Initialize working state if not set
    if (creep.memory.working === undefined) {
      creep.memory.working = false;
    }

    // If not working and have no energy, try to harvest/get energy
    if (!creep.memory.working && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      // Try to get energy from source, container, or storage
      let target = (creep.pos as any).findClosestByPath(FIND_STRUCTURES as any, {
        filter: (s: any) => (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) && s.store.getAmount(RESOURCE_ENERGY) > 0
      }) as any;

      if (!target) {
        // If no container/storage, try to harvest from source directly
        target = (creep.pos as any).findClosestByPath(FIND_SOURCES as any) as any;
      }

      if (target) {
        if ((target.harvest as any)) {
          // It's a source
          if ((creep.harvest as any)(target) == ERR_NOT_IN_RANGE) {
            (creep.moveTo as any)(target, { visualizePathStyle: { stroke: '#ffaa00' } });
          }
        } else {
          // It's a container/storage - withdraw energy
          if ((creep.withdraw as any)(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            (creep.moveTo as any)(target, { visualizePathStyle: { stroke: '#ffaa00' } });
          }
        }
      }
      return;
    }

    // If have energy, switch to working mode
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      creep.memory.working = true;
    }

    // If working, find and build construction sites
    if (creep.memory.working) {
      const target = (creep.pos as any).findClosestByPath(FIND_CONSTRUCTION_SITES as any) as any;
      if (!target) {
        // No construction sites - go idle and reset
        creep.memory.working = false;
        return;
      }
      if ((creep.build as any)(target) == ERR_NOT_IN_RANGE) {
        (creep.moveTo as any)(target, { visualizePathStyle: { stroke: '#00ff00' } });
      }
    }
  } catch (e) {
    console.log(`builder ${creep.name} error: ${e}`);
  }
}
