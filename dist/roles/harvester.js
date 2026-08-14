"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const runtimeErrors_1 = require("./runtimeErrors");
function run(creep) {
    try {
        // If harvester has space, harvest
        if (creep.store.getFreeCapacity() > 0) {
            const source = creep.pos.findClosestByPath(FIND_SOURCES);
            if (!source)
                return;
            if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
        else {
            // Harvester is full - try to distribute energy to multiple targets
            let transferred = false;
            // Priority 1: Try spawn/extension/tower refill
            const spawn = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => (s.structureType == STRUCTURE_SPAWN ||
                    s.structureType == STRUCTURE_EXTENSION ||
                    s.structureType == STRUCTURE_TOWER) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (spawn) {
                if (creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(spawn, { visualizePathStyle: { stroke: '#ffffff' } });
                }
                transferred = true;
            }
            // Priority 2: Try container
            if (!transferred) {
                const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (s) => s.structureType == STRUCTURE_CONTAINER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
                if (container) {
                    if (creep.transfer(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(container, { visualizePathStyle: { stroke: '#ffff00' } });
                    }
                    transferred = true;
                }
            }
            // Priority 3: Try storage
            if (!transferred) {
                const storage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (s) => s.structureType == STRUCTURE_STORAGE && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
                if (storage) {
                    if (creep.transfer(storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffff00' } });
                    }
                    transferred = true;
                }
            }
            // Priority 4: Direct transfer to nearby workers
            if (!transferred) {
                const ally = creep.pos.findClosestByPath(FIND_MY_CREEPS, {
                    filter: (c) => (c.memory.role == 'builder' || c.memory.role == 'upgrader' || c.memory.role == 'repairer') &&
                        c.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
                if (ally) {
                    if (creep.transfer(ally, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(ally, { visualizePathStyle: { stroke: '#ffff00' } });
                    }
                    transferred = true;
                }
            }
            if (!transferred) {
                const idleAnchor = creep.room.controller || Game.spawns[Object.keys(Game.spawns)[0]];
                if (idleAnchor) {
                    creep.moveTo(idleAnchor, { visualizePathStyle: { stroke: '#ffff00' } });
                }
            }
        }
    }
    catch (e) {
        (0, runtimeErrors_1.recordRuntimeError)({ creep: creep.name, role: 'harvester', error: e });
        console.log(`harvester ${creep.name} error: ${e}`);
    }
}
exports.run = run;
