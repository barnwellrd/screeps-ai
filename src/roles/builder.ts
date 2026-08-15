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
          (creep.moveTo as any)(source, { visualizePathStyle: { stroke: '#00ff00' } });
        }
        return;
      }
    }

    const repairTarget = (creep.pos as any).findClosestByPath(FIND_STRUCTURES as any, {
      filter: (s: any) => s.hits < s.hitsMax * 0.7 && s.structureType !== STRUCTURE_WALL
    }) as any;

    if (repairTarget) {
      if ((creep.repair as any)(repairTarget) == ERR_NOT_IN_RANGE) {
        (creep.moveTo as any)(repairTarget, { visualizePathStyle: { stroke: '#ffff00' } });
      }
      return;
    }

    const target = (creep.pos as any).findClosestByPath(FIND_CONSTRUCTION_SITES as any) as any;
    if (!target) return;
    if ((creep.build as any)(target) == ERR_NOT_IN_RANGE) {
      (creep.moveTo as any)(target, { visualizePathStyle: { stroke: '#00ff00' } });
    }
  } catch (e) {
    console.log(`builder ${creep.name} error: ${e}`);
  }
}
