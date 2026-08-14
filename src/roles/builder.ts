import { tryAcquireEnergy, updateWorkingState } from './workerEnergy';

export function run(creep: any) {
  try {
    updateWorkingState(creep);
    if (!creep.memory.working) {
      tryAcquireEnergy(creep);
      return;
    }

    const target = (creep.pos as any).findClosestByPath(FIND_CONSTRUCTION_SITES as any) as any;
    if (!target) {
      const controller = (creep.room as any).controller as any;
      if (controller) {
        const upgradeResult = (creep.upgradeController as any)(controller);
        if (upgradeResult == ERR_NOT_IN_RANGE) {
          (creep.moveTo as any)(controller, { visualizePathStyle: { stroke: '#00ff99' } });
        } else if (upgradeResult == ERR_NOT_ENOUGH_RESOURCES) {
          creep.memory.working = false;
        }
      } else {
        creep.memory.working = false;
      }
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
