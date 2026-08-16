"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRoomMetrics = updateRoomMetrics;
exports.getRoomMetrics = getRoomMetrics;
function updateRoomMetrics(room) {
    const roles = { harvester: 0, miner: 0, carrier: 0, builder: 0, upgrader: 0, guard: 0 };
    const roleBodyStats = {};
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        const home = (creep.memory && creep.memory.homeRoom) || (creep.room && creep.room.name);
        if (home !== room.name)
            continue;
        const bodyParts = Array.isArray(creep.body) ? creep.body.length : 0;
        const role = (creep.memory && creep.memory.role) || 'harvester';
        roles[role] = (roles[role] || 0) + 1;
        const existing = roleBodyStats[role] || { count: 0, bodyParts: 0, minBodyParts: Number.POSITIVE_INFINITY, maxBodyParts: 0 };
        existing.count += 1;
        existing.bodyParts += bodyParts;
        existing.minBodyParts = Math.min(existing.minBodyParts, bodyParts);
        existing.maxBodyParts = Math.max(existing.maxBodyParts, bodyParts);
        roleBodyStats[role] = existing;
    }
    for (const role of Object.keys(roleBodyStats)) {
        if (roleBodyStats[role].minBodyParts === Number.POSITIVE_INFINITY) {
            roleBodyStats[role].minBodyParts = 0;
        }
    }
    const structures = room.find(FIND_STRUCTURES);
    let storedEnergy = 0;
    let spawnEnergyFree = 0;
    let repairTargets = 0;
    for (const structure of structures) {
        if (structure.hits < structure.hitsMax &&
            structure.structureType !== STRUCTURE_WALL &&
            structure.structureType !== STRUCTURE_RAMPART) {
            repairTargets++;
        }
        if (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE) {
            storedEnergy += structure.store.getUsedCapacity(RESOURCE_ENERGY) || 0;
        }
        if (structure.structureType === STRUCTURE_SPAWN || structure.structureType === STRUCTURE_EXTENSION) {
            spawnEnergyFree += structure.store.getFreeCapacity(RESOURCE_ENERGY) || 0;
        }
    }
    const metrics = {
        name: room.name,
        energyAvailable: room.energyAvailable || 0,
        energyCapacityAvailable: room.energyCapacityAvailable || 0,
        sourceCount: room.find(FIND_SOURCES).length,
        controllerLevel: room.controller ? room.controller.level : 0,
        constructionSites: room.find(FIND_CONSTRUCTION_SITES).length,
        repairTargets,
        storedEnergy,
        spawnEnergyFree,
        hostileCount: room.find(FIND_HOSTILE_CREEPS).length,
        roles,
        roleBodyStats,
        lastUpdated: Game.time
    };
    const mem = Memory;
    if (!mem.rooms)
        mem.rooms = {};
    mem.rooms[room.name] = metrics;
    return metrics;
}
function getRoomMetrics(roomName) {
    const mem = Memory;
    if (!mem.rooms)
        return undefined;
    return mem.rooms[roomName];
}
