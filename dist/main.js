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
const ROLE_TARGETS = {
    harvester: 2,
    builder: 1,
    upgrader: 1,
};
const BODY_TEMPLATES = [
    [WORK, WORK, CARRY, CARRY, MOVE],
    [WORK, CARRY, MOVE, MOVE],
    [WORK, CARRY, MOVE],
];
function bodyCost(body) {
    let total = 0;
    for (const part of body) {
        total += BODYPART_COST[part];
    }
    return total;
}
function buildBody(energyBudget) {
    const body = [];
    for (const template of BODY_TEMPLATES) {
        const templateCost = bodyCost(template);
        while (body.length + template.length <= 50 && bodyCost(body) + templateCost <= energyBudget) {
            body.push(...template);
        }
    }
    return body;
}
function countCreepsByRole() {
    const counts = {
        harvester: 0,
        builder: 0,
        upgrader: 0,
    };
    for (const name in Game.creeps) {
        const role = (Game.creeps[name].memory.role || 'harvester');
        if (counts[role] !== undefined) {
            counts[role] += 1;
        }
    }
    return counts;
}
function pickRoleToSpawn(room, counts) {
    const hasConstructionSites = room.find(FIND_CONSTRUCTION_SITES).length > 0;
    if (counts.harvester < ROLE_TARGETS.harvester) {
        return 'harvester';
    }
    if (hasConstructionSites && counts.builder < ROLE_TARGETS.builder) {
        return 'builder';
    }
    if (counts.upgrader < ROLE_TARGETS.upgrader) {
        return 'upgrader';
    }
    if (hasConstructionSites) {
        return 'builder';
    }
    return null;
}
function spawnCreeps() {
    const counts = countCreepsByRole();
    for (const spawnName in Game.spawns) {
        const spawn = Game.spawns[spawnName];
        if (spawn.spawning) {
            continue;
        }
        const role = pickRoleToSpawn(spawn.room, counts);
        if (!role) {
            continue;
        }
        const body = buildBody(spawn.room.energyAvailable);
        if (body.length === 0) {
            continue;
        }
        const creepName = `${role}-${spawn.room.name}-${Game.time}`;
        const result = spawn.spawnCreep(body, creepName, {
            memory: {
                role,
                homeRoom: spawn.room.name,
            },
        });
        if (result === OK) {
            counts[role] += 1;
            (0, logger_1.info)(`Spawned ${creepName} with ${body.length} parts in ${spawn.room.name}`);
            break;
        }
        if (result !== ERR_NOT_ENOUGH_ENERGY) {
            (0, logger_1.warn)(`Spawn ${spawn.name} failed to create ${role}: ${result}`);
        }
    }
}
const loop = function () {
    try {
        spawnCreeps();
        // Basic CPU safeguard: skip non-critical work if CPU is nearly exhausted
        const cpuUsed = (Game.cpu && Game.cpu.getUsed ? Game.cpu.getUsed() : 0);
        if (cpuUsed && cpuUsed > 45) {
            (0, logger_1.info)(`High CPU usage detected: ${cpuUsed}, skipping heavy tasks this tick.`);
            return;
        }
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
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
                    default:
                        // fallback: act as harvester
                        roleHarvester.run(creep);
                        break;
                }
            }
            catch (e) {
                (0, logger_1.error)(`Error running creep ${name}: ${e}`);
                // store last error in Memory for later inspection
                const mem = Memory;
                if (!mem.errors)
                    mem.errors = {};
                mem.errors[name] = (mem.errors[name] || 0) + 1;
            }
        }
    }
    catch (e) {
        // top-level catch to avoid uncaught exceptions
        console.log('Top-level loop error: ' + e);
    }
};
exports.loop = loop;
global.loop = exports.loop;
