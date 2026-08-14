import { tryAcquireEnergy, updateWorkingState } from '../lib/workerEnergy';

export function run(creep: any) {
  try {
    updateWorkingState(creep);
    if (!creep.memory.working) {
      tryAcquireEnergy(creep);
      return;
    }

    const target = (creep.pos as any).findClosestByPath(FIND_CONSTRUCTION_SITES as any) as any;
    if (!target) {
      creep.memory.working = false;
      return;
    }
    const buildResult = (creep.build as any)(target);
    if (buildResult == ERR_NOT_IN_RANGE) {
      (creep.moveTo as any)(target, { visualizePathStyle: { stroke: '#00ff00' } });
    } else if (buildResult == ERR_NOT_ENOUGH_RESOURCES) {
      creep.memory.working = false;
    }
  } catch (e) {
    console.log(`builder ${creep.name} error: ${e}`);
  }
}
