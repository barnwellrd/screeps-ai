export function run(creep: any) {
  try {
    if (creep.store.getFreeCapacity() > 0) {
      const source = (creep.pos as any).findClosestByPath(FIND_SOURCES as any) as any;
      if (!source) return;
      if ((creep.harvest as any)(source) == ERR_NOT_IN_RANGE) {
        (creep.moveTo as any)(source, { visualizePathStyle: { stroke: '#ffaa00' } });
      }
      return;
    }

    const target = (creep.pos as any).findClosestByPath(FIND_STRUCTURES as any, {
      filter: (s: any) => {
        if (!s || !s.store) return false;
        return (
          (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE || s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) &&
          s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        );
      }
    }) as any;

    if (target) {
      if ((creep.transfer as any)(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        (creep.moveTo as any)(target, { visualizePathStyle: { stroke: '#ffffff' } });
      }
    }
  } catch (e) {
    console.log(`harvester ${creep.name} error: ${e}`);
  }
}
