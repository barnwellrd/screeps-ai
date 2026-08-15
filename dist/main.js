// BUILD_TIMESTAMP: 2026-08-15T14:32:28.725Z
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loop = void 0;
const logger_1 = require("./lib/logger");
const roleHarvester = __importStar(require("./roles/harvester"));
const roleBuilder = __importStar(require("./roles/builder"));
const roleUpgrader = __importStar(require("./roles/upgrader"));
const roleRepairer = __importStar(require("./roles/repairer"));
const roleDefender = __importStar(require("./roles/defender"));
const roleClaimer = __importStar(require("./roles/claimer"));
const runtimeErrors_1 = require("./roles/runtimeErrors");
function getMyUsername() {
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (room.controller && room.controller.my && room.controller.owner) {
            return room.controller.owner.username;
        }
    }
    return null;
}
function getBodyPartsForRole(role, room) {
    const maxEnergy = room.energyCapacityAvailable || room.energyAvailable || 300;
    const patternMap = {
        harvester: [WORK, WORK, CARRY, MOVE],
        builder: [WORK, WORK, CARRY, MOVE],
        upgrader: [WORK, WORK, CARRY, MOVE],
        repairer: [WORK, WORK, CARRY, MOVE],
        defender: [TOUGH, ATTACK, MOVE, MOVE],
        claimer: [CLAIM, MOVE],
    };
    const pattern = patternMap[role];
    const minBodyMap = {
        harvester: [WORK, CARRY, MOVE],
        builder: [WORK, CARRY, MOVE],
        upgrader: [WORK, CARRY, MOVE],
        repairer: [WORK, CARRY, MOVE],
        defender: [TOUGH, ATTACK, MOVE],
        claimer: [CLAIM, MOVE],
    };
    const minBody = minBodyMap[role];
    const minCost = minBody.reduce((sum, part) => sum + BODYPART_COST[part], 0);
    if (maxEnergy < minCost) {
        return null;
    }
    const body = [];
    let budget = maxEnergy;
    const patternCost = pattern.reduce((sum, part) => sum + BODYPART_COST[part], 0);
    while (patternCost <= budget && body.length + pattern.length <= 50) {
        for (const part of pattern) {
            body.push(part);
            budget -= BODYPART_COST[part];
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
function countCreepsByRole(room) {
    const counts = {};
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        if ((creep.memory.homeRoom || creep.room.name) !== room.name)
            continue;
        const role = creep.memory.role || 'harvester';
        counts[role] = (counts[role] || 0) + 1;
    }
    return counts;
}
function findExpansionTarget(room) {
    const exits = Game.map.describeExits(room.name);
    const myUsername = getMyUsername();
    for (const dir of Object.keys(exits)) {
        const targetName = exits[dir];
        if (!targetName)
            continue;
        const targetRoom = Game.rooms[targetName];
        if (!targetRoom || !targetRoom.controller)
            continue;
        if (!targetRoom.controller.owner &&
            (!targetRoom.controller.reservation || targetRoom.controller.reservation.username !== myUsername)) {
            return targetName;
        }
    }
    return null;
}
function desiredRoleCounts(room) {
    const sources = room.find(FIND_SOURCES).length;
    const constructionSites = room.find(FIND_CONSTRUCTION_SITES).length;
    const damaged = room.find(FIND_STRUCTURES, {
        filter: (structure) => structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL && structure.structureType !== STRUCTURE_RAMPART,
    }).length;
    const enemies = room.find(FIND_HOSTILE_CREEPS).length;
    const controllerLevel = room.controller ? room.controller.level : 1;
    const storedEnergy = room.find(FIND_STRUCTURES, {
        filter: (structure) => (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE) &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
    }).reduce((sum, structure) => sum + structure.store.getUsedCapacity(RESOURCE_ENERGY), 0);
    const spawnEnergyFree = room
        .find(FIND_STRUCTURES, {
        filter: (structure) => (structure.structureType === STRUCTURE_SPAWN || structure.structureType === STRUCTURE_EXTENSION) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
    })
        .reduce((sum, structure) => sum + structure.store.getFreeCapacity(RESOURCE_ENERGY), 0);
    const upgraderTarget = controllerLevel <= 2 ? 1 : storedEnergy >= 2000 ? 3 : storedEnergy >= 800 ? 2 : 1;
    const builderTarget = constructionSites > 0
        ? Math.max(1, Math.min(3, Math.ceil(constructionSites / 4)))
        : spawnEnergyFree > 0
            ? 0
            : 1;
    const desired = {
        harvester: Math.max(2, sources * 2),
        builder: builderTarget,
        upgrader: upgraderTarget,
        repairer: damaged > 0 ? 1 : 0,
        defender: enemies > 0 ? 2 : 0,
        claimer: room.controller && room.controller.level >= 2 && findExpansionTarget(room) ? 1 : 0,
    };
    return desired;
}
function summarizeRuntimeErrors() {
    const mem = Memory;
    const runtimeErrors = Array.isArray(mem.runtimeErrors) ? mem.runtimeErrors : [];
    if (runtimeErrors.length === 0) {
        return '[]';
    }
    return JSON.stringify(runtimeErrors.slice(-5));
}
function getRoadAnchor(room) {
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
function getRoadMatrix(room) {
    const matrix = new PathFinder.CostMatrix();
    const structures = room.find(FIND_STRUCTURES);
    for (const structure of structures) {
        const pos = structure.pos;
        if (structure.structureType === STRUCTURE_ROAD || structure.structureType === STRUCTURE_CONTAINER) {
            matrix.set(pos.x, pos.y, 1);
            continue;
        }
        if (structure.structureType === STRUCTURE_RAMPART && (structure.my || structure.isPublic)) {
            continue;
        }
        if (structure.structureType === STRUCTURE_SPAWN ||
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
            structure.structureType === STRUCTURE_INVADER_CORE) {
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
function shouldBuildRoadAt(room, pos) {
    const terrain = room.getTerrain().get(pos.x, pos.y);
    if (terrain === TERRAIN_MASK_WALL) {
        return false;
    }
    const structures = room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y);
    for (const structure of structures) {
        if (structure.structureType === STRUCTURE_ROAD || structure.structureType === STRUCTURE_CONTAINER) {
            return false;
        }
        if (structure.structureType === STRUCTURE_RAMPART && (structure.my || structure.isPublic)) {
            return false;
        }
        if (structure.structureType !== STRUCTURE_ROAD && structure.structureType !== STRUCTURE_CONTAINER) {
            return false;
        }
    }
    const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y);
    for (const site of sites) {
        if (site.structureType === STRUCTURE_ROAD || site.structureType === STRUCTURE_CONTAINER) {
            return false;
        }
        return false;
    }
    return true;
}
function getRoadPath(room, origin, destination) {
    const result = PathFinder.search(origin, { pos: destination, range: 1 }, {
        plainCost: 1,
        swampCost: 5,
        maxOps: 2000,
        roomCallback: (roomName) => {
            if (roomName !== room.name) {
                return false;
            }
            return getRoadMatrix(room);
        },
    });
    if (result.incomplete) {
        return [];
    }
    return result.path;
}
function planRoadInfrastructure(room) {
    const mem = Memory;
    if (!mem.roadPlanner)
        mem.roadPlanner = {};
    const roomMem = mem.roadPlanner[room.name] || {};
    mem.roadPlanner[room.name] = roomMem;
    const lastPlanned = roomMem.lastPlanned || 0;
    if (Game.time - lastPlanned < 200) {
        return { created: 0, planned: 0 };
    }
    const anchor = getRoadAnchor(room);
    if (!anchor) {
        return { created: 0, planned: 0 };
    }
    const targets = [];
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
function spawnCreep(spawn, role, room) {
    const body = getBodyPartsForRole(role, room);
    if (!body)
        return false;
    const name = `${role}-${Game.time}-${Math.random().toString(36).slice(2, 6)}`;
    const result = spawn.spawnCreep(body, name, {
        memory: {
            role,
            homeRoom: room.name,
            targetRoom: role === 'claimer' ? findExpansionTarget(room) : undefined,
        },
    });
    if (result === OK) {
        (0, logger_1.info)(`Spawned ${name} as ${role} in ${room.name}`);
        return true;
    }
    if (result !== ERR_NOT_ENOUGH_ENERGY && result !== ERR_BUSY && result !== ERR_RCL_NOT_ENOUGH) {
        (0, logger_1.error)(`Failed to spawn ${role} in ${room.name}: ${result}`);
    }
    return false;
}
function ensureSpawnsForRoom(room) {
    const spawns = room.find(FIND_MY_SPAWNS);
    if (spawns.length === 0)
        return;
    const counts = countCreepsByRole(room);
    const desired = desiredRoleCounts(room);
    if ((counts.harvester || 0) === 0)
        desired.harvester = Math.max(desired.harvester, 1);
    if ((counts.upgrader || 0) === 0)
        desired.upgrader = Math.max(desired.upgrader, 1);
    if ((counts.builder || 0) === 0 && room.find(FIND_CONSTRUCTION_SITES).length > 0) {
        desired.builder = Math.max(desired.builder, 1);
    }
    const enemies = room.find(FIND_HOSTILE_CREEPS).length;
    const priorities = enemies > 0
        ? ['defender', 'harvester', 'upgrader', 'builder', 'repairer', 'claimer']
        : ['harvester', 'upgrader', 'builder', 'repairer', 'claimer', 'defender'];
    for (const spawn of spawns) {
        if (spawn.spawning)
            continue;
        for (const role of priorities) {
            const minimum = desired[role] || 0;
            if (minimum === 0)
                continue;
            if ((counts[role] || 0) >= minimum)
                continue;
            if (spawnCreep(spawn, role, room)) {
                return;
            }
            break;
        }
    }
}
function loop() {
    try {
        const cpuUsed = (Game.cpu && Game.cpu.getUsed ? Game.cpu.getUsed() : 0);
        if (cpuUsed && cpuUsed > 45) {
            (0, logger_1.info)(`High CPU usage detected: ${cpuUsed}, skipping heavy tasks this tick.`);
            return;
        }
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (room.controller && room.controller.my) {
                ensureSpawnsForRoom(room);
                const roadPlan = planRoadInfrastructure(room);
                if (roadPlan.created > 0) {
                    (0, logger_1.info)(`[ROAD] room=${room.name} created=${roadPlan.created} planned=${roadPlan.planned}`);
                }
            }
        }
        const roleCounts = {};
        let workerEnergy = 0;
        let harvesterEnergy = 0;
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            try {
                const role = creep.memory.role || 'harvester';
                roleCounts[role] = (roleCounts[role] || 0) + 1;
                const creepEnergy = creep.store && creep.store.getUsedCapacity ? creep.store.getUsedCapacity(RESOURCE_ENERGY) : 0;
                if (role === 'harvester') {
                    harvesterEnergy += creepEnergy;
                }
                else {
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
            }
            catch (e) {
                (0, logger_1.error)(`Error running creep ${name}: ${e}`);
                (0, runtimeErrors_1.recordRuntimeError)({ creep: name, role: creep.memory.role || 'unknown', error: e });
            }
        }
        if (Game.time % 50 === 0) {
            const roomSummaries = [];
            for (const roomName in Game.rooms) {
                const room = Game.rooms[roomName];
                const structures = room.find(FIND_STRUCTURES);
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
                roadSites = room.find(FIND_CONSTRUCTION_SITES, {
                    filter: (site) => site.structureType == STRUCTURE_ROAD,
                }).length;
                roomSummaries.push({
                    room: roomName,
                    desiredRoles: desiredRoleCounts(room),
                    spawnExtUsed: spawnExtensionUsed,
                    spawnExtFree: spawnExtensionFree,
                    storedEnergy,
                    roadStructures,
                    roadSites,
                    constructionSites: room.find(FIND_CONSTRUCTION_SITES).length,
                    controllerProgress: room.controller && room.controller.progressTotal
                        ? `${room.controller.progress}/${room.controller.progressTotal}`
                        : 'n/a',
                });
            }
            (0, logger_1.info)(`[STATE] tick=${Game.time} roles=${JSON.stringify(roleCounts)} ` +
                `harvesterEnergy=${harvesterEnergy} workerEnergy=${workerEnergy} rooms=${JSON.stringify(roomSummaries)}`);
            (0, logger_1.info)(`[ERRORS] shard=${Game.shard ? Game.shard.name : 'unknown'} recent=${summarizeRuntimeErrors()}`);
        }
    }
    catch (e) {
        (0, runtimeErrors_1.recordRuntimeError)({ role: 'main', error: e });
        console.log('Top-level loop error: ' + e);
    }
}
exports.loop = loop;
;
module.exports.loop = loop;
global.loop = loop;
