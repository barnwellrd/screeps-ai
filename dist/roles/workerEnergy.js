"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWorkingState = updateWorkingState;
exports.tryAcquireEnergy = tryAcquireEnergy;
function updateWorkingState(creep) {
    if (creep.memory.working === undefined) {
        creep.memory.working = false;
    }
    if (creep.memory.working && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.working = false;
    }
    else if (!creep.memory.working && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.working = true;
    }
}
function tryAcquireEnergy(creep) {
    const structureTarget = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s) => (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) &&
            s.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
    });
    if (structureTarget) {
        if (creep.withdraw(structureTarget, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(structureTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
        return true;
    }
    const droppedTarget = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
        filter: (r) => r.resourceType == RESOURCE_ENERGY && r.amount > 0,
    });
    if (droppedTarget) {
        if (creep.pickup(droppedTarget) == ERR_NOT_IN_RANGE) {
            creep.moveTo(droppedTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
        return true;
    }
    const source = creep.pos.findClosestByPath(FIND_SOURCES);
    if (source) {
        if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
        return true;
    }
    return false;
}
