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
        const controller = creep.room.controller;
        if (!controller) {
            creep.memory.working = false;
            return;
        }
        const upgradeResult = creep.upgradeController(controller);
        if (upgradeResult == ERR_NOT_IN_RANGE) {
            creep.moveTo(controller, { visualizePathStyle: { stroke: '#0000ff' } });
        }
        else if (upgradeResult == ERR_NOT_ENOUGH_RESOURCES) {
            creep.memory.working = false;
        }
    }
    catch (e) {
        console.log(`upgrader ${creep.name} error: ${e}`);
    }
}
exports.run = run;
