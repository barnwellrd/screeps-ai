export interface RoomMetrics {
  name: string;
  energyAvailable: number;
  energyCapacityAvailable: number;
  constructionSites: number;
  repairTargets: number;
  hostileCount: number;
  roles: Record<string, number>;
  lastUpdated: number;
}

export function updateRoomMetrics(room: any): RoomMetrics {
  const roles: Record<string, number> = { harvester: 0, miner: 0, carrier: 0, builder: 0, upgrader: 0, guard: 0 };
  for (const name in Game.creeps) {
    const creep: any = Game.creeps[name];
    if (creep.room && creep.room.name !== room.name) continue;
    const role = (creep.memory && creep.memory.role) || 'harvester';
    roles[role] = (roles[role] || 0) + 1;
  }

  const metrics: RoomMetrics = {
    name: room.name,
    energyAvailable: room.energyAvailable || 0,
    energyCapacityAvailable: room.energyCapacityAvailable || 0,
    constructionSites: room.find(FIND_CONSTRUCTION_SITES).length,
    repairTargets: room.find(FIND_STRUCTURES, {
      filter: (structure: any) => structure.hits < structure.hitsMax * 0.7 && structure.structureType !== STRUCTURE_WALL
    }).length,
    hostileCount: room.find(FIND_HOSTILE_CREEPS).length,
    roles,
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
