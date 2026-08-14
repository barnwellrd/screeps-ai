export function updateWorkingState(creep: any): void {
  if (creep.memory.working === undefined) {
    creep.memory.working = false;
  }

  if (creep.memory.working && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
    creep.memory.working = false;
  } else if (!creep.memory.working && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
    creep.memory.working = true;
  }
}

export function tryAcquireEnergy(creep: any): boolean {
  const structureTarget = (creep.pos as any).findClosestByPath(FIND_STRUCTURES as any, {
    filter: (s: any) =>
      (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) &&
      s.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
  }) as any;

  if (structureTarget) {
    if ((creep.withdraw as any)(structureTarget, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
      (creep.moveTo as any)(structureTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
    }
    return true;
  }

  const droppedTarget = (creep.pos as any).findClosestByPath(FIND_DROPPED_RESOURCES as any, {
    filter: (r: any) => r.resourceType == RESOURCE_ENERGY && r.amount > 0,
  }) as any;

  if (droppedTarget) {
    if ((creep.pickup as any)(droppedTarget) == ERR_NOT_IN_RANGE) {
      (creep.moveTo as any)(droppedTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
    }
    return true;
  }

  const source = (creep.pos as any).findClosestByPath(FIND_SOURCES as any) as any;
  if (source) {
    if ((creep.harvest as any)(source) == ERR_NOT_IN_RANGE) {
      (creep.moveTo as any)(source, { visualizePathStyle: { stroke: '#ffaa00' } });
    }
    return true;
  }

  return false;
}
