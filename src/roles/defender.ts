import { recordRuntimeError } from './runtimeErrors';

export function run(creep: any) {
  try {
    const hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS) as any;
    if (!hostile) {
      const home = Game.spawns[Object.keys(Game.spawns)[0]];
      if (home && creep.pos.getRangeTo(home) > 2) {
        (creep.moveTo as any)(home, { visualizePathStyle: { stroke: '#ff0000' } });
      }
      return;
    }

    if ((creep.attack as any)(hostile) === ERR_NOT_IN_RANGE) {
      (creep.moveTo as any)(hostile, { visualizePathStyle: { stroke: '#ff0000' } });
    }
  } catch (e) {
    recordRuntimeError({ creep: creep.name, role: 'defender', error: e });
    console.log(`defender ${creep.name} error: ${e}`);
  }
}
