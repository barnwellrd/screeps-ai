"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
function run(creep) {
    try {
        const controller = creep.room.controller;
        if (!controller)
            return;
        if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE) {
            creep.moveTo(controller, { visualizePathStyle: { stroke: '#ffffff' } });
        }
    }
    catch (e) {
        console.log(`upgrader ${creep.name} error: ${e}`);
    }
}
exports.run = run;
