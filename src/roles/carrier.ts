export function run(creep: any) {
  try {
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      const source = (creep.pos as any).findClosestByPath(FIND_STRUCTURES as any, {
        filter: (s: any) => {
          if (!s || !s.store) return false;
          return (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        }
      }) as any;

      if (source) {
        if ((creep.withdraw as any)(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          (creep.moveTo as any)(source, { visualizePathStyle: { stroke: '#00ffff' } });
        }
        return;
      }
    }

    const target = (creep.pos as any).findClosestByPath(FIND_STRUCTURES as any, {
      filter: (s: any) => {
        if (!s || !s.store) return false;
        return (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_TOWER || s.structureType === STRUCTURE_STORAGE) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
      }
    }) as any;

    if (target) {
      if ((creep.transfer as any)(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        (creep.moveTo as any)(target, { visualizePathStyle: { stroke: '#00ffff' } });
      }
      return;
    }

    const controller = (creep.room as any).controller as any;
    if (controller && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      if ((creep.upgradeController as any)(controller) === ERR_NOT_IN_RANGE) {
        (creep.moveTo as any)(controller, { visualizePathStyle: { stroke: '#ffffff' } });
      }
    }
  } catch (e) {
    console.log(`carrier ${creep.name} error: ${e}`);
  }
}
