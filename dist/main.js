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
const roomState_1 = require("./lib/roomState");
const roleHarvester = __importStar(require("./roles/harvester"));
const roleMiner = __importStar(require("./roles/miner"));
const roleCarrier = __importStar(require("./roles/carrier"));
const roleBuilder = __importStar(require("./roles/builder"));
const roleUpgrader = __importStar(require("./roles/upgrader"));
const roleGuard = __importStar(require("./roles/guard"));
const spawnManager_1 = require("./manager/spawnManager");
const loop = function () {
    try {
        // Clean stale creep memory to avoid accumulating dead entries and wasting Memory
        for (const name in Memory.creeps) {
            if (!Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }
        // Basic CPU safeguard: skip non-critical work if CPU is nearly exhausted
        const cpuUsed = (Game.cpu && Game.cpu.getUsed ? Game.cpu.getUsed() : 0);
        if (cpuUsed && cpuUsed > 45) {
            (0, logger_1.info)(`High CPU usage detected: ${cpuUsed}, skipping heavy tasks this tick.`);
            return;
        }
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            const roomMetrics = (0, roomState_1.updateRoomMetrics)(room);
            if (Game.time % 25 === 0) {
                const roles = Object.keys(roomMetrics.roles)
                    .filter((key) => roomMetrics.roles[key] > 0)
                    .map((key) => `${key}:${roomMetrics.roles[key]}`)
                    .join(', ');
                (0, logger_1.metrics)(`Room ${roomMetrics.name}: energy ${roomMetrics.energyAvailable}/${roomMetrics.energyCapacityAvailable}, sites ${roomMetrics.constructionSites}, repairs ${roomMetrics.repairTargets}, hostiles ${roomMetrics.hostileCount}, roles ${roles}`);
            }
        }
        (0, spawnManager_1.run)();
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            try {
                const role = creep.memory.role || 'harvester';
                switch (role) {
                    case 'harvester':
                        roleHarvester.run(creep);
                        break;
                    case 'miner':
                        roleMiner.run(creep);
                        break;
                    case 'carrier':
                        roleCarrier.run(creep);
                        break;
                    case 'builder':
                        roleBuilder.run(creep);
                        break;
                    case 'upgrader':
                        roleUpgrader.run(creep);
                        break;
                    case 'guard':
                        roleGuard.run(creep);
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
