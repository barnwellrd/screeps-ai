import { tryAcquireEnergy, updateWorkingState } from '../lib/workerEnergy';

export function run(creep: any) {
  try {
    updateWorkingState(creep);
    if (!creep.memory.working) {
      tryAcquireEnergy(creep);
      return;
    }

    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (structure: any) => structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL && structure.structureType !== STRUCTURE_RAMPART,
    }) as any;

    if (!target) {
      const controller = creep.room.controller;
      if (controller) {
        const upgradeResult = (creep.upgradeController as any)(controller);
        if (upgradeResult === ERR_NOT_IN_RANGE) {
          (creep.moveTo as any)(controller, { visualizePathStyle: { stroke: '#ffffff' } });
        } else if (upgradeResult === ERR_NOT_ENOUGH_RESOURCES) {
          creep.memory.working = false;
        }
      } else {
        creep.memory.working = false;
      }
      return;
    }

    const repairResult = (creep.repair as any)(target);
    if (repairResult === ERR_NOT_IN_RANGE) {
      (creep.moveTo as any)(target, { visualizePathStyle: { stroke: '#00ff00' } });
    } else if (repairResult === ERR_NOT_ENOUGH_RESOURCES) {
      creep.memory.working = false;
    }
  } catch (e) {
    console.log(`repairer ${creep.name} error: ${e}`);
  }
}
