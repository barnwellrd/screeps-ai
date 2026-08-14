// BUILD_TIMESTAMP: 2026-08-14T15:48:24.510Z
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
    const body = [];
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
function countCreepsByRole(room) {
    const counts = {};
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        if (creep.room.name !== room.name)
            continue;
        const role = creep.memory.role || 'harvester';
        counts[role] = (counts[role] || 0) + 1;
    }
    return counts;
}
function findExpansionTarget(room) {
    var _a;
    const exits = Game.map.describeExits(room.name);
    for (const dir of Object.keys(exits)) {
        const targetName = exits[dir];
        if (!targetName)
            continue;
        const targetRoom = Game.rooms[targetName];
        if (!targetRoom || !targetRoom.controller)
            continue;
        if (!targetRoom.controller.owner && (!targetRoom.controller.reservation || targetRoom.controller.reservation.username !== ((_a = Game.me) === null || _a === void 0 ? void 0 : _a.username))) {
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
    const desired = {
        harvester: Math.max(2, sources * 2),
        builder: constructionSites > 0 ? Math.max(1, Math.min(2, Math.ceil(constructionSites / 3))) : 1,
        upgrader: Math.max(1, Math.min(4, controllerLevel)),
        repairer: damaged > 0 ? 1 : 0,
        defender: enemies > 0 ? 2 : 0,
        claimer: room.controller && room.controller.level >= 2 && findExpansionTarget(room) ? 1 : 0,
    };
    return desired;
}
function spawnCreep(spawn, role, room) {
    const body = getBodyPartsForRole(role, room);
    const name = `${role}-${Game.time}-${Math.random().toString(36).slice(2, 6)}`;
    const result = spawn.spawnCreep(body, name, {
        memory: {
            role,
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
    const priorities = ['defender', 'claimer', 'harvester', 'builder', 'repairer', 'upgrader'];
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
                const mem = Memory;
                if (!mem.errors)
                    mem.errors = {};
                mem.errors[name] = (mem.errors[name] || 0) + 1;
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
                for (const s of structures) {
                    if (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) {
                        spawnExtensionFree += s.store.getFreeCapacity(RESOURCE_ENERGY);
                        spawnExtensionUsed += s.store.getUsedCapacity(RESOURCE_ENERGY);
                    }
                    if (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) {
                        storedEnergy += s.store.getUsedCapacity(RESOURCE_ENERGY);
                    }
                }
                roomSummaries.push({
                    room: roomName,
                    spawnExtUsed: spawnExtensionUsed,
                    spawnExtFree: spawnExtensionFree,
                    storedEnergy,
                    constructionSites: room.find(FIND_CONSTRUCTION_SITES).length,
                    controllerProgress: room.controller && room.controller.progressTotal
                        ? `${room.controller.progress}/${room.controller.progressTotal}`
                        : 'n/a',
                });
            }
            (0, logger_1.info)(`[STATE] tick=${Game.time} roles=${JSON.stringify(roleCounts)} ` +
                `harvesterEnergy=${harvesterEnergy} workerEnergy=${workerEnergy} rooms=${JSON.stringify(roomSummaries)}`);
        }
    }
    catch (e) {
        console.log('Top-level loop error: ' + e);
    }
}
exports.loop = loop;
module.exports.loop = loop;
global.loop = loop;
