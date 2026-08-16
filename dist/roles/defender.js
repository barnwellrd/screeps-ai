"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const runtimeErrors_1 = require("./runtimeErrors");
function run(creep) {
    try {
        const hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (!hostile) {
            const home = Game.spawns[Object.keys(Game.spawns)[0]];
            if (home && creep.pos.getRangeTo(home) > 2) {
                creep.moveTo(home, { visualizePathStyle: { stroke: '#ff0000' } });
            }
            return;
        }
        if (creep.attack(hostile) === ERR_NOT_IN_RANGE) {
            creep.moveTo(hostile, { visualizePathStyle: { stroke: '#ff0000' } });
        }
    }
    catch (e) {
        (0, runtimeErrors_1.recordRuntimeError)({ creep: creep.name, role: 'defender', error: e });
        console.log(`defender ${creep.name} error: ${e}`);
    }
}
