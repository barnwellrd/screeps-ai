"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
function run(creep) {
    // Very small, safe behavior: move to nearest source and harvest
    try {
        const source = creep.pos.findClosestByPath(FIND_SOURCES);
        if (!source)
            return;
        if (creep.store.getFreeCapacity() > 0) {
            if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
        else {
            // find nearest spawn/extension to transfer
            const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
        }
    }
    catch (e) {
        console.log(`harvester ${creep.name} error: ${e}`);
    }
}
exports.run = run;
