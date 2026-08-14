export function run(creep: any) {
  try {
    // Initialize working state if not set
    if (creep.memory.working === undefined) {
      creep.memory.working = false;
    }

    // If not working and have no energy, try to harvest/get energy
    if (!creep.memory.working && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      const containerTarget = (creep.pos as any).findClosestByPath(FIND_STRUCTURES as any, {
        filter: (s: any) => (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
      }) as any;

      if (containerTarget) {
        if ((creep.withdraw as any)(containerTarget, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          (creep.moveTo as any)(containerTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
        return;
      }

      const source = (creep.pos as any).findClosestByPath(FIND_SOURCES as any) as any;
      if (source) {
        if ((creep.harvest as any)(source) == ERR_NOT_IN_RANGE) {
          (creep.moveTo as any)(source, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
      }
      return;
    }

    // If have energy, switch to working mode
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      creep.memory.working = true;
    }

    // If working, upgrade the controller
    if (creep.memory.working) {
      const controller = (creep.room as any).controller as any;
      if (!controller) {
        creep.memory.working = false;
        return;
      }
      if ((creep.upgradeController as any)(controller) == ERR_NOT_IN_RANGE) {
        (creep.moveTo as any)(controller, { visualizePathStyle: { stroke: '#0000ff' } });
      }
    }
  } catch (e) {
    console.log(`upgrader ${creep.name} error: ${e}`);
  }
}
