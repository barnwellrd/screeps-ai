export interface RoomMetrics {
  name: string;
  energyAvailable: number;
  energyCapacityAvailable: number;
  sourceCount: number;
  controllerLevel: number;
  constructionSites: number;
  repairTargets: number;
  storedEnergy: number;
  spawnEnergyFree: number;
  hostileCount: number;
  roles: Record<string, number>;
  roleBodyStats: Record<string, { count: number; bodyParts: number; minBodyParts: number; maxBodyParts: number }>;
  lastUpdated: number;
}

export function updateRoomMetrics(room: any): RoomMetrics {
  const roles: Record<string, number> = { harvester: 0, miner: 0, carrier: 0, builder: 0, upgrader: 0, guard: 0 };
  const roleBodyStats: Record<string, { count: number; bodyParts: number; minBodyParts: number; maxBodyParts: number }> = {};
  const creeps = room.find(FIND_MY_CREEPS);
  for (const creep of creeps) {
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
    if (structure.hits < structure.hitsMax * 0.7 && structure.structureType !== STRUCTURE_WALL) {
      repairTargets++;
    }
    if (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE) {
      storedEnergy += structure.store.getUsedCapacity(RESOURCE_ENERGY) || 0;
    }
    if (structure.structureType === STRUCTURE_SPAWN || structure.structureType === STRUCTURE_EXTENSION) {
      spawnEnergyFree += structure.store.getFreeCapacity(RESOURCE_ENERGY) || 0;
    }
  }

  const metrics: RoomMetrics = {
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

  const mem: any = Memory as any;
  if (!mem.rooms) mem.rooms = {};
  mem.rooms[room.name] = metrics;
  return metrics;
}

export function getRoomMetrics(roomName: string): RoomMetrics | undefined {
  const mem: any = Memory as any;
  if (!mem.rooms) return undefined;
  return mem.rooms[roomName];
}
