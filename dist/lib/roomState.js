"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoomMetrics = exports.updateRoomMetrics = void 0;
function updateRoomMetrics(room) {
    const roles = { harvester: 0, miner: 0, carrier: 0, builder: 0, upgrader: 0, guard: 0 };
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        if (creep.room && creep.room.name !== room.name)
            continue;
        const role = (creep.memory && creep.memory.role) || 'harvester';
        roles[role] = (roles[role] || 0) + 1;
    }
    const metrics = {
        name: room.name,
        energyAvailable: room.energyAvailable || 0,
        energyCapacityAvailable: room.energyCapacityAvailable || 0,
        constructionSites: room.find(FIND_CONSTRUCTION_SITES).length,
        repairTargets: room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.hits < structure.hitsMax * 0.7 && structure.structureType !== STRUCTURE_WALL
        }).length,
        hostileCount: room.find(FIND_HOSTILE_CREEPS).length,
        roles,
        lastUpdated: Game.time
    };
    const mem = Memory;
    if (!mem.rooms)
        mem.rooms = {};
    mem.rooms[room.name] = metrics;
    return metrics;
}
exports.updateRoomMetrics = updateRoomMetrics;
function getRoomMetrics(roomName) {
    const mem = Memory;
    if (!mem.rooms)
        return undefined;
    return mem.rooms[roomName];
}
exports.getRoomMetrics = getRoomMetrics;
