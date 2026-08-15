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
                    return (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            if (source) {
                if (creep.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, { visualizePathStyle: { stroke: '#00ffff' } });
                }
                return;
            }
        }
        const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (s) => {
                if (!s || !s.store)
                    return false;
                return (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_TOWER || s.structureType === STRUCTURE_STORAGE) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });
        if (target) {
            if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#00ffff' } });
            }
            return;
        }
        const controller = creep.room.controller;
        if (controller && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, { visualizePathStyle: { stroke: '#ffffff' } });
            }
        }
    }
    catch (e) {
        console.log(`carrier ${creep.name} error: ${e}`);
    }
}
exports.run = run;
