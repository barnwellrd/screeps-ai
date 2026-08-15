export function run(creep: any) {
  try {
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      const source = (creep.pos as any).findClosestByPath(FIND_STRUCTURES as any, {
        filter: (s: any) => {
          if (!s || !s.store) return false;
          return (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE || s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        }
      }) as any;

      if (source) {
        if ((creep.withdraw as any)(source, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          (creep.moveTo as any)(source, { visualizePathStyle: { stroke: '#ffffff' } });
        }
        return;
      }
    }

    const controller = (creep.room as any).controller as any;
    if (!controller) return;
    if ((creep.upgradeController as any)(controller) == ERR_NOT_IN_RANGE) {
      (creep.moveTo as any)(controller, { visualizePathStyle: { stroke: '#ffffff' } });
    }
  } catch (e) {
    console.log(`upgrader ${creep.name} error: ${e}`);
  }
}
