"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordRuntimeError = recordRuntimeError;
function normalizeError(error) {
    if (error instanceof Error) {
        return error.stack || error.message;
    }
    return String(error);
}
function getShardName() {
    const shard = Game.shard;
    return shard && shard.name ? shard.name : 'unknown';
}
function appendRuntimeError(entry) {
    const mem = Memory;
    if (!mem.errors)
        mem.errors = {};
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
function recordRuntimeError(context) {
    appendRuntimeError({
        tick: context.tick !== undefined ? context.tick : Game.time,
        shard: context.shard || getShardName(),
        creep: context.creep,
        role: context.role,
        context: context.role || context.creep || 'runtime',
        message: normalizeError(context.error),
    });
}
