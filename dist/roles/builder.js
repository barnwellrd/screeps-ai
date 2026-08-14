"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
function run(creep) {
    try {
        const target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if (!target)
            return;
        if (creep.build(target) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: { stroke: '#00ff00' } });
        }
    }
    catch (e) {
        console.log(`builder ${creep.name} error: ${e}`);
    }
}
exports.run = run;
