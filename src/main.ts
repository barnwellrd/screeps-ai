import { info, error } from './lib/logger';
import * as roleHarvester from './roles/harvester';
import * as roleBuilder from './roles/builder';
import * as roleUpgrader from './roles/upgrader';
import * as roleRepairer from './roles/repairer';
import * as roleDefender from './roles/defender';
import * as roleClaimer from './roles/claimer';

type RoleName = 'harvester' | 'builder' | 'upgrader' | 'repairer' | 'defender' | 'claimer';

function getBodyPartsForRole(role: RoleName, room: Room): BodyPartConstant[] {
  const maxEnergy = room.energyCapacityAvailable || room.energyAvailable || 300;
  const patternMap: Record<RoleName, BodyPartConstant[]> = {
    harvester: [WORK, WORK, CARRY, MOVE],
    builder: [WORK, WORK, CARRY, MOVE],
    upgrader: [WORK, WORK, CARRY, MOVE],
    repairer: [WORK, WORK, CARRY, MOVE],
    defender: [TOUGH, ATTACK, MOVE, MOVE],
    claimer: [CLAIM, MOVE],
  };

  const pattern = patternMap[role];
  const body: BodyPartConstant[] = [];
  let budget = maxEnergy;
  for (const part of pattern) {
    const cost = BODYPART_COST[part];
    if (cost <= budget) {
      body.push(part);
      budget -= cost;
    }
  }
  if (body.length === 0) {
    return role === 'defender' ? [TOUGH, MOVE] : [WORK, CARRY, MOVE];
  }
  return body;
}

function countCreepsByRole(room: Room): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const name in Game.creeps) {
    const creep: any = Game.creeps[name];
    if (creep.room.name !== room.name) continue;
    const role = creep.memory.role || 'harvester';
    counts[role] = (counts[role] || 0) + 1;
  }
  return counts;
}

function findExpansionTarget(room: Room): string | null {
  const exits = Game.map.describeExits(room.name) as Record<string, string>;
  for (const dir of Object.keys(exits)) {
    const targetName = exits[dir];
    if (!targetName) continue;
    const targetRoom = Game.rooms[targetName];
    if (!targetRoom || !targetRoom.controller) continue;
    if (!targetRoom.controller.owner && (!targetRoom.controller.reservation || targetRoom.controller.reservation.username !== (Game as any).me?.username)) {
      return targetName;
    }
  }
  return null;
}

function desiredRoleCounts(room: Room): Record<RoleName, number> {
  const sources = room.find(FIND_SOURCES).length;
  const constructionSites = room.find(FIND_CONSTRUCTION_SITES).length;
  const damaged = room.find(FIND_STRUCTURES, {
    filter: (structure: any) => structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL && structure.structureType !== STRUCTURE_RAMPART,
  }).length;
  const enemies = room.find(FIND_HOSTILE_CREEPS).length;
  const controllerLevel = room.controller ? room.controller.level : 1;

  const desired: Record<RoleName, number> = {
    harvester: Math.max(2, sources * 2),
    builder: constructionSites > 0 ? Math.max(1, Math.min(2, Math.ceil(constructionSites / 3))) : 1,
    upgrader: Math.max(1, Math.min(4, controllerLevel)),
    repairer: damaged > 0 ? 1 : 0,
    defender: enemies > 0 ? 2 : 0,
    claimer: room.controller && room.controller.level >= 2 && findExpansionTarget(room) ? 1 : 0,
  };

  return desired;
}

function spawnCreep(spawn: StructureSpawn, role: RoleName, room: Room): boolean {
  const body = getBodyPartsForRole(role, room);
  const name = `${role}-${Game.time}-${Math.random().toString(36).slice(2, 6)}`;
  const result = (spawn as any).spawnCreep(body, name, {
    memory: {
      role,
      targetRoom: role === 'claimer' ? findExpansionTarget(room) : undefined,
    },
  });

  if (result === OK) {
    info(`Spawned ${name} as ${role} in ${room.name}`);
    return true;
  }
  if (result !== ERR_NOT_ENOUGH_ENERGY && result !== ERR_BUSY && result !== ERR_RCL_NOT_ENOUGH) {
    error(`Failed to spawn ${role} in ${room.name}: ${result}`);
  }
  return false;
}

function ensureSpawnsForRoom(room: Room) {
  const spawns = room.find(FIND_MY_SPAWNS);
  if (spawns.length === 0) return;

  const counts = countCreepsByRole(room);
  const desired = desiredRoleCounts(room);
  const priorities: RoleName[] = ['defender', 'claimer', 'harvester', 'builder', 'repairer', 'upgrader'];

  for (const spawn of spawns) {
    if ((spawn as any).spawning) continue;
    for (const role of priorities) {
      const minimum = desired[role] || 0;
      if (minimum === 0) continue;
      if ((counts[role] || 0) >= minimum) continue;
      if (spawnCreep(spawn, role, room)) {
        return;
      }
      break;
    }
  }
}

export function loop() {
  try {
    const cpuUsed = (Game.cpu && (Game.cpu.getUsed as any) ? (Game.cpu.getUsed as any)() : 0);
    if (cpuUsed && cpuUsed > 45) {
      info(`High CPU usage detected: ${cpuUsed}, skipping heavy tasks this tick.`);
      return;
    }

    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName];
      if (room.controller && room.controller.my) {
        ensureSpawnsForRoom(room);
      }
    }

    for (const name in Game.creeps) {
      const creep: any = Game.creeps[name];
      try {
        const role = creep.memory.role || 'harvester';
        switch (role) {
          case 'harvester':
            roleHarvester.run(creep);
            break;
          case 'builder':
            roleBuilder.run(creep);
            break;
          case 'upgrader':
            roleUpgrader.run(creep);
            break;
          case 'repairer':
            roleRepairer.run(creep);
            break;
          case 'defender':
            roleDefender.run(creep);
            break;
          case 'claimer':
            roleClaimer.run(creep);
            break;
          default:
            roleHarvester.run(creep);
            break;
        }
      } catch (e) {
        error(`Error running creep ${name}: ${e}`);
        const mem: any = (Memory as any);
        if (!mem.errors) mem.errors = {};
        mem.errors[name] = (mem.errors[name] || 0) + 1;
      }
    }
  } catch (e) {
    console.log('Top-level loop error: ' + e);
  }
}

declare const global: any;
declare const module: any;
module.exports.loop = loop;
global.loop = loop;
