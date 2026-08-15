"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
function run(creep) {
    try {
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            const source = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => {
                    if (!s || !s.store)
                        return false;
                    return (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE || s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            if (source) {
                if (creep.withdraw(source, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, { visualizePathStyle: { stroke: '#00ff00' } });
                }
                return;
            }
        }
        const repairTarget = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (s) => s.hits < s.hitsMax * 0.7 && s.structureType !== STRUCTURE_WALL
        });
        if (repairTarget) {
            if (creep.repair(repairTarget) == ERR_NOT_IN_RANGE) {
                creep.moveTo(repairTarget, { visualizePathStyle: { stroke: '#ffff00' } });
            }
            return;
        }
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
