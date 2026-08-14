"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
function run(creep) {
    try {
        // Initialize working state if not set
        if (creep.memory.working === undefined) {
            creep.memory.working = false;
        }
        // If not working and have no energy, try to harvest/get energy
        if (!creep.memory.working && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            const containerTarget = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            });
            if (containerTarget) {
                if (creep.withdraw(containerTarget, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(containerTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }
            const source = creep.pos.findClosestByPath(FIND_SOURCES);
            if (source) {
                if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            }
            return;
        }
        // If have energy, switch to working mode
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            creep.memory.working = true;
        }
        // If working, find and build construction sites
        if (creep.memory.working) {
            const target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
            if (!target) {
                // No construction sites - go idle and reset
                creep.memory.working = false;
                return;
            }
            if (creep.build(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#00ff00' } });
            }
        }
    }
    catch (e) {
        console.log(`builder ${creep.name} error: ${e}`);
    }
}
exports.run = run;
