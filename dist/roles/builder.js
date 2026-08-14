"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const workerEnergy_1 = require("../lib/workerEnergy");
function run(creep) {
    try {
        (0, workerEnergy_1.updateWorkingState)(creep);
        if (!creep.memory.working) {
            (0, workerEnergy_1.tryAcquireEnergy)(creep);
            return;
        }
        const target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if (!target) {
            const controller = creep.room.controller;
            if (controller) {
                const upgradeResult = creep.upgradeController(controller);
                if (upgradeResult == ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, { visualizePathStyle: { stroke: '#00ff99' } });
                }
                else if (upgradeResult == ERR_NOT_ENOUGH_RESOURCES) {
                    creep.memory.working = false;
                }
            }
            else {
                creep.memory.working = false;
            }
            return;
        }
        const buildResult = creep.build(target);
        if (buildResult == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: { stroke: '#00ff00' } });
        }
        else if (buildResult == ERR_NOT_ENOUGH_RESOURCES) {
            creep.memory.working = false;
        }
    }
    catch (e) {
        console.log(`builder ${creep.name} error: ${e}`);
    }
}
exports.run = run;
