"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const workerEnergy_1 = require("./workerEnergy");
const runtimeErrors_1 = require("./runtimeErrors");
function run(creep) {
    try {
        (0, workerEnergy_1.updateWorkingState)(creep);
        if (!creep.memory.working) {
            (0, workerEnergy_1.tryAcquireEnergy)(creep);
            return;
        }
        const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL && structure.structureType !== STRUCTURE_RAMPART,
        });
        if (!target) {
            const controller = creep.room.controller;
            if (controller) {
                const upgradeResult = creep.upgradeController(controller);
                if (upgradeResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, { visualizePathStyle: { stroke: '#ffffff' } });
                }
                else if (upgradeResult === ERR_NOT_ENOUGH_RESOURCES) {
                    creep.memory.working = false;
                }
            }
            else {
                creep.memory.working = false;
            }
            return;
        }
        const repairResult = creep.repair(target);
        if (repairResult === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: { stroke: '#00ff00' } });
        }
        else if (repairResult === ERR_NOT_ENOUGH_RESOURCES) {
            creep.memory.working = false;
        }
    }
    catch (e) {
        (0, runtimeErrors_1.recordRuntimeError)({ creep: creep.name, role: 'repairer', error: e });
        console.log(`repairer ${creep.name} error: ${e}`);
    }
}
exports.run = run;
