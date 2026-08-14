export function run(creep: any) {
  try {
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE || FIND_SOURCES);
      if (source) {
        if ((creep.harvest as any)(source) === ERR_NOT_IN_RANGE) {
          (creep.moveTo as any)(source, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
        return;
      }
    }

    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (structure: any) => structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL && structure.structureType !== STRUCTURE_RAMPART,
    }) as any;

    if (!target) {
      const controller = creep.room.controller;
      if (controller && (creep.upgradeController as any)(controller) === ERR_NOT_IN_RANGE) {
        (creep.moveTo as any)(controller, { visualizePathStyle: { stroke: '#ffffff' } });
      }
      return;
    }

    if ((creep.repair as any)(target) === ERR_NOT_IN_RANGE) {
      (creep.moveTo as any)(target, { visualizePathStyle: { stroke: '#00ff00' } });
    }
  } catch (e) {
    console.log(`repairer ${creep.name} error: ${e}`);
  }
}
