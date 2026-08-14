export function run(creep: any) {
  try {
    const controller = (creep.room as any).controller as any;
    if (!controller) return;
    if ((creep.upgradeController as any)(controller) == ERR_NOT_IN_RANGE) {
      (creep.moveTo as any)(controller, { visualizePathStyle: { stroke: '#ffffff' } });
    }
  } catch (e) {
    console.log(`upgrader ${creep.name} error: ${e}`);
  }
}
