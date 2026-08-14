type RuntimeErrorEntry = {
  tick: number;
  shard: string;
  creep?: string;
  role?: string;
  context: string;
  message: string;
};

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  return String(error);
}

function getShardName(): string {
  const shard = (Game as any).shard;
  return shard && shard.name ? shard.name : 'unknown';
}

function appendRuntimeError(entry: RuntimeErrorEntry): void {
  const mem: any = Memory as any;
  if (!mem.errors) mem.errors = {};
  const errorKey = entry.creep || entry.role || entry.context;
  mem.errors[errorKey] = (mem.errors[errorKey] || 0) + 1;

  if (!mem.runtimeErrors || !Array.isArray(mem.runtimeErrors)) {
    mem.runtimeErrors = [];
  }
  mem.runtimeErrors.push(entry);
  if (mem.runtimeErrors.length > 20) {
    mem.runtimeErrors = mem.runtimeErrors.slice(-20);
  }

  if (!mem.errorByShard) {
    mem.errorByShard = {};
  }
  mem.errorByShard[entry.shard] = (mem.errorByShard[entry.shard] || 0) + 1;
}

export function recordRuntimeError(context: {
  creep?: string;
  role?: string;
  tick?: number;
  shard?: string;
  error: unknown;
}): void {
  appendRuntimeError({
    tick: context.tick !== undefined ? context.tick : Game.time,
    shard: context.shard || getShardName(),
    creep: context.creep,
    role: context.role,
    context: context.role || context.creep || 'runtime',
    message: normalizeError(context.error),
  });
}
