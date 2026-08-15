export function run(creep: any) {
  try {
    const hostile = (creep.pos as any).findClosestByRange(FIND_HOSTILE_CREEPS as any) as any;
    if (!hostile) {
      if (creep.hits < creep.hitsMax * 0.8) {
        const repairTarget = (creep.pos as any).findClosestByPath(FIND_MY_STRUCTURES as any, {
          filter: (structure: any) => structure.hits < structure.hitsMax
        }) as any;
        if (repairTarget) {
          if ((creep.moveTo as any)(repairTarget, { visualizePathStyle: { stroke: '#ff0000' } }) == ERR_NOT_IN_RANGE) {
            return;
          }
        }
      }
      const controller = (creep.room as any).controller as any;
      if (controller) {
        if ((creep.moveTo as any)(controller, { visualizePathStyle: { stroke: '#ff0000' } }) == ERR_NOT_IN_RANGE) {
          return;
        }
      }
      return;
    }

    if ((creep.attack as any)(hostile) == ERR_NOT_IN_RANGE) {
      (creep.moveTo as any)(hostile, { visualizePathStyle: { stroke: '#ff0000' } });
    }
  } catch (e) {
    console.log(`guard ${creep.name} error: ${e}`);
  }
}
