import { tryAcquireEnergy, updateWorkingState } from '../lib/workerEnergy';

export function run(creep: any) {
  try {
    updateWorkingState(creep);
    if (!creep.memory.working) {
      tryAcquireEnergy(creep);
      return;
    }

    const controller = (creep.room as any).controller as any;
    if (!controller) {
      creep.memory.working = false;
      return;
    }
    const upgradeResult = (creep.upgradeController as any)(controller);
    if (upgradeResult == ERR_NOT_IN_RANGE) {
      (creep.moveTo as any)(controller, { visualizePathStyle: { stroke: '#0000ff' } });
    } else if (upgradeResult == ERR_NOT_ENOUGH_RESOURCES) {
      creep.memory.working = false;
    }
  } catch (e) {
    console.log(`upgrader ${creep.name} error: ${e}`);
  }
}
