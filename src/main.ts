import { info, error } from './lib/logger';
import * as roleHarvester from './roles/harvester';
import * as roleBuilder from './roles/builder';
import * as roleUpgrader from './roles/upgrader';
import * as roleRepairer from './roles/repairer';
import * as roleDefender from './roles/defender';
import * as roleClaimer from './roles/claimer';
import { recordRuntimeError } from './roles/runtimeErrors';
import { updateRoomMetrics } from './lib/roomState';

type RoleName = 'harvester' | 'builder' | 'upgrader' | 'repairer' | 'defender' | 'claimer';

const BODY_RECIPES: Record<RoleName, BodyPartConstant[][]> = {
  harvester: [
    [WORK, WORK, CARRY, MOVE],
    [WORK, CARRY, MOVE],
    [WORK, MOVE],
    [WORK],
    [MOVE],
  ],
  builder: [
    [WORK, WORK, CARRY, MOVE],
    [WORK, CARRY, MOVE],
    [WORK, MOVE],
    [WORK],
    [MOVE],
  ],
  upgrader: [
    [WORK, WORK, CARRY, MOVE],
    [WORK, CARRY, MOVE],
    [WORK, MOVE],
    [WORK],
    [MOVE],
  ],
  repairer: [
    [WORK, WORK, CARRY, MOVE],
    [WORK, CARRY, MOVE],
    [WORK, MOVE],
    [WORK],
    [MOVE],
  ],
  defender: [
    [TOUGH, ATTACK, MOVE],
    [TOUGH, MOVE],
    [ATTACK, MOVE],
    [MOVE],
  ],
  claimer: [
    [CLAIM, MOVE],
  ],
};

function getMyUsername(): string | null {
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName];
    if (room.controller && room.controller.my && room.controller.owner) {
      return room.controller.owner.username;
    }
  }
  return null;
}

function bodyCost(parts: BodyPartConstant[]): number {
  return parts.reduce((sum, part) => sum + BODYPART_COST[part], 0);
}

function getIdealBodyPartCount(role: RoleName, room: Room): number {
  const body = getBodyPartsForRole(role, room);
  return body ? body.length : 0;
}

function getBodyPartsForRole(role: RoleName, room: Room): BodyPartConstant[] | null {
  const maxEnergy = room.energyCapacityAvailable || room.energyAvailable || 300;
  const recipes = BODY_RECIPES[role];
  const minBody = recipes[recipes.length - 1];
  const minCost = bodyCost(minBody);
  if (maxEnergy < minCost) {
    return null;
  }

  const body: BodyPartConstant[] = [];
  let remainingEnergy = maxEnergy;

  while (body.length < 50) {
    let addedRecipe = false;
    for (const recipe of recipes) {
      const cost = bodyCost(recipe);
      if (cost > remainingEnergy || body.length + recipe.length > 50) {
        continue;
      }
      body.push(...recipe);
      remainingEnergy -= cost;
      addedRecipe = true;
      break;
    }

    if (!addedRecipe) {
      break;
    }
  }

  if (body.length === 0) {
    for (const part of minBody) {
      body.push(part);
    }
  }

  if (body.length === 0) {
    return null;
  }
  return body;
}

function findExpansionTarget(room: Room): string | null {
  const exits = Game.map.describeExits(room.name) as Record<string, string>;
  const myUsername = getMyUsername();
  for (const dir of Object.keys(exits)) {
    const targetName = exits[dir];
    if (!targetName) continue;
    const targetRoom = Game.rooms[targetName];
    if (!targetRoom || !targetRoom.controller) continue;
    if (
      !targetRoom.controller.owner &&
      (!targetRoom.controller.reservation || targetRoom.controller.reservation.username !== myUsername)
    ) {
      return targetName;
    }
  }
  return null;
}

function desiredRoleCounts(room: Room, metrics?: { sourceCount: number; constructionSites: number; repairTargets: number; hostileCount: number; controllerLevel: number; storedEnergy: number; spawnEnergyFree: number; }): Record<RoleName, number> {
  const sources = metrics ? metrics.sourceCount : room.find(FIND_SOURCES).length;
  const constructionSites = metrics ? metrics.constructionSites : room.find(FIND_CONSTRUCTION_SITES).length;
  const damaged = metrics ? metrics.repairTargets : room.find(FIND_STRUCTURES, {
    filter: (structure: any) => structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL && structure.structureType !== STRUCTURE_RAMPART,
  }).length;
  const enemies = metrics ? metrics.hostileCount : room.find(FIND_HOSTILE_CREEPS).length;
  const controllerLevel = metrics ? metrics.controllerLevel : (room.controller ? room.controller.level : 1);
  const storedEnergy = metrics ? metrics.storedEnergy : room.find(FIND_STRUCTURES, {
    filter: (structure: any) =>
      (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE) &&
      structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
  }).reduce((sum: number, structure: any) => sum + structure.store.getUsedCapacity(RESOURCE_ENERGY), 0);
  const spawnEnergyFree = metrics ? metrics.spawnEnergyFree : room.find(FIND_STRUCTURES, {
    filter: (structure: any) =>
      (structure.structureType === STRUCTURE_SPAWN || structure.structureType === STRUCTURE_EXTENSION) &&
      structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
  }).reduce((sum: number, structure: any) => sum + structure.store.getFreeCapacity(RESOURCE_ENERGY), 0);

  const upgraderTarget =
    controllerLevel <= 2 ? 1 : storedEnergy >= 2000 ? 3 : storedEnergy >= 800 ? 2 : 1;
  const builderTarget =
    constructionSites > 0
      ? Math.max(1, Math.min(3, Math.ceil(constructionSites / 4)))
      : spawnEnergyFree > 0
      ? 0
      : 1;

  const desired: Record<RoleName, number> = {
    harvester: Math.max(2, sources * 2),
    builder: builderTarget,
    upgrader: upgraderTarget,
    repairer: damaged > 0 ? 1 : 0,
    defender: enemies > 0 ? 2 : 0,
    claimer: room.controller && room.controller.level >= 2 && findExpansionTarget(room) ? 1 : 0,
  };

  return desired;
}

function findGrowthReplacementRole(room: Room, metrics: any): RoleName | null {
  if (metrics.hostileCount > 0) {
    return null;
  }

  if (metrics.energyCapacityAvailable < 550 && metrics.storedEnergy < 1000) {
    return null;
  }

  const priorities: RoleName[] = ['harvester', 'upgrader', 'builder', 'repairer', 'defender', 'claimer'];
  for (const role of priorities) {
    const bodyStats = metrics.roleBodyStats && metrics.roleBodyStats[role];
    if (!bodyStats || bodyStats.count === 0) continue;
    const ideal = getIdealBodyPartCount(role, room);
    if (ideal === 0) continue;
    if (bodyStats.maxBodyParts >= ideal) continue;
    return role;
  }

  return null;
}

function summarizeRuntimeErrors(): string {
  const mem: any = Memory as any;
  const runtimeErrors = Array.isArray(mem.runtimeErrors) ? mem.runtimeErrors : [];
  if (runtimeErrors.length === 0) {
    return '[]';
  }
  return JSON.stringify(runtimeErrors.slice(-5));
}

function getRoadAnchor(room: Room): RoomPosition | null {
  const spawns = room.find(FIND_MY_SPAWNS);
  if (spawns.length > 0) {
    return spawns[0].pos;
  }
  if (room.storage) {
    return room.storage.pos;
  }
  if (room.controller) {
    return room.controller.pos;
  }
  return null;
}

function getRoadMatrix(room: Room): CostMatrix {
  const matrix = new PathFinder.CostMatrix();
  const structures = room.find(FIND_STRUCTURES);
  for (const structure of structures) {
    const pos = structure.pos;
    if (structure.structureType === STRUCTURE_ROAD || structure.structureType === STRUCTURE_CONTAINER) {
      matrix.set(pos.x, pos.y, 1);
      continue;
    }
    if (structure.structureType === STRUCTURE_RAMPART && ((structure as any).my || (structure as any).isPublic)) {
      continue;
    }
    if (
      structure.structureType === STRUCTURE_SPAWN ||
      structure.structureType === STRUCTURE_EXTENSION ||
      structure.structureType === STRUCTURE_TOWER ||
      structure.structureType === STRUCTURE_STORAGE ||
      structure.structureType === STRUCTURE_LINK ||
      structure.structureType === STRUCTURE_LAB ||
      structure.structureType === STRUCTURE_TERMINAL ||
      structure.structureType === STRUCTURE_OBSERVER ||
      structure.structureType === STRUCTURE_POWER_SPAWN ||
      structure.structureType === STRUCTURE_NUKER ||
      structure.structureType === STRUCTURE_WALL ||
      structure.structureType === STRUCTURE_PORTAL ||
      structure.structureType === STRUCTURE_KEEPER_LAIR ||
      structure.structureType === STRUCTURE_INVADER_CORE
    ) {
      matrix.set(pos.x, pos.y, 255);
    }
  }

  const sites = room.find(FIND_CONSTRUCTION_SITES);
  for (const site of sites) {
    const pos = site.pos;
    if (site.structureType === STRUCTURE_ROAD || site.structureType === STRUCTURE_CONTAINER) {
      matrix.set(pos.x, pos.y, 1);
      continue;
    }
    if (site.structureType === STRUCTURE_RAMPART) {
      continue;
    }
    matrix.set(pos.x, pos.y, 255);
  }

  return matrix;
}

function shouldBuildRoadAt(room: Room, pos: RoomPosition): boolean {
  const terrain = room.getTerrain().get(pos.x, pos.y);
  if (terrain === TERRAIN_MASK_WALL) {
    return false;
  }

  const structures = room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y) as any[];
  for (const structure of structures) {
    if (structure.structureType === STRUCTURE_ROAD || structure.structureType === STRUCTURE_CONTAINER) {
      return false;
    }
    if (structure.structureType === STRUCTURE_RAMPART && ((structure as any).my || (structure as any).isPublic)) {
      return false;
    }
    if (structure.structureType !== STRUCTURE_ROAD && structure.structureType !== STRUCTURE_CONTAINER) {
      return false;
    }
  }

  const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y) as any[];
  for (const site of sites) {
    if (site.structureType === STRUCTURE_ROAD || site.structureType === STRUCTURE_CONTAINER) {
      return false;
    }
    return false;
  }

  return true;
}

function getRoadPath(room: Room, origin: RoomPosition, destination: RoomPosition): RoomPosition[] {
  const result = PathFinder.search(
    origin,
    { pos: destination, range: 1 },
    {
      plainCost: 1,
      swampCost: 5,
      maxOps: 2000,
      roomCallback: (roomName: string) => {
        if (roomName !== room.name) {
          return false;
        }
        return getRoadMatrix(room);
      },
    }
  );

  if (result.incomplete) {
    return [];
  }

  return result.path;
}

function planRoadInfrastructure(room: Room): { created: number; planned: number } {
  const mem: any = Memory as any;
  if (!mem.roadPlanner) mem.roadPlanner = {};
  const roomMem: any = mem.roadPlanner[room.name] || {};
  mem.roadPlanner[room.name] = roomMem;

  const lastPlanned = roomMem.lastPlanned || 0;
  if (Game.time - lastPlanned < 200) {
    return { created: 0, planned: 0 };
  }

  const anchor = getRoadAnchor(room);
  if (!anchor) {
    return { created: 0, planned: 0 };
  }

  const targets: RoomPosition[] = [];
  for (const source of room.find(FIND_SOURCES)) {
    targets.push(source.pos);
  }
  if (room.controller) {
    targets.push(room.controller.pos);
  }

  let created = 0;
  let planned = 0;
  const limit = 6;

  for (const target of targets) {
    const path = getRoadPath(room, anchor, target);
    if (path.length === 0) {
      continue;
    }

    planned += path.length;

    for (const step of path) {
      if (created >= limit) {
        break;
      }
      if (!shouldBuildRoadAt(room, step)) {
        continue;
      }
      const result = room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
      if (result === OK) {
        created++;
      }
    }
  }

  roomMem.lastPlanned = Game.time;
  roomMem.lastCreated = created;
  roomMem.lastPlannedSites = planned;
  return { created, planned };
}

function spawnCreep(spawn: StructureSpawn, role: RoleName, room: Room): boolean {
  const body = getBodyPartsForRole(role, room);
  if (!body) return false;
  const name = `${role}-${Game.time}-${Math.random().toString(36).slice(2, 6)}`;
  const result = (spawn as any).spawnCreep(body, name, {
    memory: {
      role,
      homeRoom: room.name,
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

  const metrics: any = updateRoomMetrics(room);
  const counts = metrics.roles;
  const desired = desiredRoleCounts(room, metrics);
  if ((counts.harvester || 0) === 0) desired.harvester = Math.max(desired.harvester, 1);
  if ((counts.upgrader || 0) === 0) desired.upgrader = Math.max(desired.upgrader, 1);
  if ((counts.builder || 0) === 0 && room.find(FIND_CONSTRUCTION_SITES).length > 0) {
    desired.builder = Math.max(desired.builder, 1);
  }

  const growthRole = findGrowthReplacementRole(room, metrics);
  if (growthRole) {
    desired[growthRole] = Math.max(desired[growthRole] || 0, (counts[growthRole] || 0) + 1);
  }

  const enemies = room.find(FIND_HOSTILE_CREEPS).length;
  const priorities: RoleName[] =
    enemies > 0
      ? ['defender', 'harvester', 'upgrader', 'builder', 'repairer', 'claimer']
      : ['harvester', 'upgrader', 'builder', 'repairer', 'claimer', 'defender'];

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
        const roadPlan = planRoadInfrastructure(room);
        if (roadPlan.created > 0) {
          info(`[ROAD] room=${room.name} created=${roadPlan.created} planned=${roadPlan.planned}`);
        }
      }
    }
    const roleCounts: Record<string, number> = {};
    let workerEnergy = 0;
    let harvesterEnergy = 0;

    for (const name in Game.creeps) {
      const creep: any = Game.creeps[name];
      try {
        const role = creep.memory.role || 'harvester';
        roleCounts[role] = (roleCounts[role] || 0) + 1;
        const creepEnergy = creep.store && creep.store.getUsedCapacity ? creep.store.getUsedCapacity(RESOURCE_ENERGY) : 0;
        if (role === 'harvester') {
          harvesterEnergy += creepEnergy;
        } else {
          workerEnergy += creepEnergy;
        }
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
        recordRuntimeError({ creep: name, role: creep.memory.role || 'unknown', error: e });
      }
    }

    if ((Game.time as any) % 50 === 0) {
      const roomSummaries: any[] = [];
      for (const roomName in Game.rooms) {
        const room: any = Game.rooms[roomName];
        const structures = room.find(FIND_STRUCTURES as any) as any[];
        let spawnExtensionFree = 0;
        let spawnExtensionUsed = 0;
        let storedEnergy = 0;
        let roadStructures = 0;
        let roadSites = 0;

        for (const s of structures) {
          if (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) {
            spawnExtensionFree += s.store.getFreeCapacity(RESOURCE_ENERGY);
            spawnExtensionUsed += s.store.getUsedCapacity(RESOURCE_ENERGY);
          }
          if (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) {
            storedEnergy += s.store.getUsedCapacity(RESOURCE_ENERGY);
          }
          if (s.structureType == STRUCTURE_ROAD) {
            roadStructures++;
          }
        }

        roadSites = room.find(FIND_CONSTRUCTION_SITES as any, {
          filter: (site: any) => site.structureType == STRUCTURE_ROAD,
        }).length;

        roomSummaries.push({
          room: roomName,
          desiredRoles: desiredRoleCounts(room),
          spawnExtUsed: spawnExtensionUsed,
          spawnExtFree: spawnExtensionFree,
          storedEnergy,
          roadStructures,
          roadSites,
          constructionSites: room.find(FIND_CONSTRUCTION_SITES as any).length,
          controllerProgress:
            room.controller && room.controller.progressTotal
              ? `${room.controller.progress}/${room.controller.progressTotal}`
              : 'n/a',
        });
      }

      info(
        `[STATE] tick=${Game.time} roles=${JSON.stringify(roleCounts)} ` +
          `harvesterEnergy=${harvesterEnergy} workerEnergy=${workerEnergy} rooms=${JSON.stringify(roomSummaries)}`
      );
      info(`[ERRORS] shard=${(Game as any).shard ? (Game as any).shard.name : 'unknown'} recent=${summarizeRuntimeErrors()}`);
    }
  } catch (e) {
    recordRuntimeError({ role: 'main', error: e });
    console.log('Top-level loop error: ' + e);
  }
};

declare const global: any;
declare const module: any;
module.exports.loop = loop;
global.loop = loop;
