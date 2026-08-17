"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
function run(creep) {
    try {
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => {
                    if (!s || !s.store)
                        return false;
                    return (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }
        }
        const sourceId = creep.memory.sourceId;
        let source = sourceId ? Game.getObjectById(sourceId) : null;
        if (!source) {
            source = creep.pos.findClosestByPath(FIND_SOURCES);
            if (source) {
                creep.memory.sourceId = source.id;
            }
        }
        if (!source)
            return;
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
    }
    catch (e) {
        console.log(`miner ${creep.name} error: ${e}`);
    }
}
