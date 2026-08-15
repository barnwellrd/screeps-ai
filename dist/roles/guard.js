"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
function run(creep) {
    try {
        const hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (!hostile) {
            if (creep.hits < creep.hitsMax * 0.8) {
                const repairTarget = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                    filter: (structure) => structure.hits < structure.hitsMax
                });
                if (repairTarget) {
                    if (creep.moveTo(repairTarget, { visualizePathStyle: { stroke: '#ff0000' } }) == ERR_NOT_IN_RANGE) {
                        return;
                    }
                }
            }
            const controller = creep.room.controller;
            if (controller) {
                if (creep.moveTo(controller, { visualizePathStyle: { stroke: '#ff0000' } }) == ERR_NOT_IN_RANGE) {
                    return;
                }
            }
            return;
        }
        if (creep.attack(hostile) == ERR_NOT_IN_RANGE) {
            creep.moveTo(hostile, { visualizePathStyle: { stroke: '#ff0000' } });
        }
    }
    catch (e) {
        console.log(`guard ${creep.name} error: ${e}`);
    }
}
exports.run = run;
