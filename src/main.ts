import { info, warn, error } from './lib/logger';
import * as roleHarvester from './roles/harvester';
import * as roleBuilder from './roles/builder';
import * as roleUpgrader from './roles/upgrader';

type RoleName = 'harvester' | 'builder' | 'upgrader';

const ROLE_TARGETS: Record<RoleName, number> = {
  harvester: 2,
  builder: 1,
  upgrader: 1,
};

const BODY_TEMPLATES: BodyPartConstant[][] = [
  [WORK, WORK, CARRY, CARRY, MOVE],
  [WORK, CARRY, MOVE, MOVE],
  [WORK, CARRY, MOVE],
];

function bodyCost(body: BodyPartConstant[]): number {
  let total = 0;
  for (const part of body) {
    total += BODYPART_COST[part];
  }
  return total;
}

function buildBody(energyBudget: number): BodyPartConstant[] {
  const body: BodyPartConstant[] = [];

  for (const template of BODY_TEMPLATES) {
    const templateCost = bodyCost(template);
    while (body.length + template.length <= 50 && bodyCost(body) + templateCost <= energyBudget) {
      body.push(...template);
    }
  }

  return body;
}

function countCreepsByRole(): Record<RoleName, number> {
  const counts: Record<RoleName, number> = {
    harvester: 0,
    builder: 0,
    upgrader: 0,
  };

  for (const name in Game.creeps) {
    const role = (Game.creeps[name].memory.role || 'harvester') as RoleName;
    if (counts[role] !== undefined) {
      counts[role] += 1;
    }
  }

  return counts;
}

function pickRoleToSpawn(room: Room, counts: Record<RoleName, number>): RoleName | null {
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
      info(`Spawned ${creepName} with ${body.length} parts in ${spawn.room.name}`);
      break;
    }

    if (result !== ERR_NOT_ENOUGH_ENERGY) {
      warn(`Spawn ${spawn.name} failed to create ${role}: ${result}`);
    }
  }
}

export const loop = function() {
  try {
    spawnCreeps();

    // Basic CPU safeguard: skip non-critical work if CPU is nearly exhausted
    const cpuUsed = (Game.cpu && (Game.cpu.getUsed as any) ? (Game.cpu.getUsed as any)() : 0);
    if (cpuUsed && cpuUsed > 45) {
      info(`High CPU usage detected: ${cpuUsed}, skipping heavy tasks this tick.`);
      return;
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
          default:
            // fallback: act as harvester
            roleHarvester.run(creep);
            break;
        }
      } catch (e) {
        error(`Error running creep ${name}: ${e}`);
        // store last error in Memory for later inspection
        const mem: any = (Memory as any);
        if (!mem.errors) mem.errors = {};
        mem.errors[name] = (mem.errors[name] || 0) + 1;
      }
    }
  } catch (e) {
    // top-level catch to avoid uncaught exceptions
    console.log('Top-level loop error: ' + e);
  }
};

// Expose global loop required by some loaders
declare const global: any;

global.loop = loop;
