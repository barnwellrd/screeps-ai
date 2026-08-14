export function run(creep: any) {
  try {
    const target = (creep.pos as any).findClosestByPath(FIND_CONSTRUCTION_SITES as any) as any;
    if (!target) return;
    if ((creep.build as any)(target) == ERR_NOT_IN_RANGE) {
      (creep.moveTo as any)(target, { visualizePathStyle: { stroke: '#00ff00' } });
    }
  } catch (e) {
    console.log(`builder ${creep.name} error: ${e}`);
  }
}
