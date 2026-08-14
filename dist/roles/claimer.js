"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
function run(creep) {
    try {
        let targetRoom = creep.memory.targetRoom;
        const myUsername = creep.owner && creep.owner.username ? creep.owner.username : null;
        if (!targetRoom) {
            const exits = Game.map.describeExits(creep.room.name);
            for (const dir of Object.keys(exits)) {
                const roomName = exits[dir];
                const exitRoom = Game.rooms[roomName];
                if (!exitRoom || !exitRoom.controller)
                    continue;
                if (!exitRoom.controller.owner && (!exitRoom.controller.reservation || exitRoom.controller.reservation.username !== myUsername)) {
                    targetRoom = roomName;
                    creep.memory.targetRoom = roomName;
                    break;
                }
            }
        }
        if (!targetRoom) {
            const controller = creep.room.controller;
            if (controller && creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, { visualizePathStyle: { stroke: '#00ffff' } });
            }
            return;
        }
        const target = Game.rooms[targetRoom] && Game.rooms[targetRoom].controller ? Game.rooms[targetRoom].controller : null;
        if (!target) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom), { visualizePathStyle: { stroke: '#00ffff' } });
            return;
        }
        if (creep.reserveController(target) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: { stroke: '#00ffff' } });
        }
    }
    catch (e) {
        console.log(`claimer ${creep.name} error: ${e}`);
    }
}
exports.run = run;
