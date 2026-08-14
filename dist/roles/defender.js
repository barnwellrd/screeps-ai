"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
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
        console.log(`defender ${creep.name} error: ${e}`);
    }
}
exports.run = run;
