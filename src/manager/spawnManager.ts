import { updateRoomMetrics } from '../lib/roomState';

type RoleName = 'miner' | 'carrier' | 'builder' | 'upgrader' | 'guard';

function buildBody(maxEnergy: number, role: RoleName): BodyPartConstant[] {
  const body: BodyPartConstant[] = [];
  let energyUsed = 0;

  if (role === 'guard') {
    while (energyUsed + 80 <= maxEnergy && body.length < 8) {
      body.push(TOUGH, MOVE);
      energyUsed += 80;
    }
  }

  if (role === 'miner') {
    while (energyUsed + 200 <= maxEnergy && body.length < 10) {
      body.push(WORK, CARRY, MOVE);
      energyUsed += 200;
    }
  }

  if (role === 'carrier') {
    while (energyUsed + 150 <= maxEnergy && body.length < 10) {
      body.push(CARRY, MOVE);
      energyUsed += 150;
    }
  }

  if (role === 'builder' || role === 'upgrader') {
    while (energyUsed + 200 <= maxEnergy && body.length < 12) {
      body.push(WORK, CARRY, MOVE);
      energyUsed += 200;
    }
  }

  if (body.length === 0) {
    return [WORK, CARRY, MOVE];
  }

  return body;
}

export function run() {
  for (const name in Game.spawns) {
    const spawn: any = Game.spawns[name];
    if (!spawn || spawn.spawning) continue;

    const room = spawn.room;
    const metrics = updateRoomMetrics(room);
    const counts = metrics.roles;
    const sourceCount = room.find(FIND_SOURCES).length;
    const targetMiners = Math.max(1, sourceCount);
    const targetCarriers = Math.max(1, sourceCount);
    const targetBuilders = metrics.constructionSites > 0 || metrics.repairTargets > 0 ? 1 : 0;
    const hostiles = metrics.hostileCount;
    let role: RoleName | null = null;

    if (hostiles > 0 && counts.guard < 1) {
      role = 'guard';
    } else if (counts.miner < targetMiners) {
      role = 'miner';
    } else if (counts.carrier < targetCarriers) {
      role = 'carrier';
    } else if (targetBuilders > 0 && counts.builder < targetBuilders) {
      role = 'builder';
    } else if (counts.upgrader < 2) {
      role = 'upgrader';
    }

    if (!role) continue;

    const body = buildBody(Math.min(metrics.energyAvailable, metrics.energyCapacityAvailable), role);
    const result = spawn.spawnCreep(body, `${role}-${Game.time}`, {
      memory: { role }
    });

    if (result === OK) {
      console.log(`Spawned ${role} at ${spawn.name}`);
    }
  }
}
