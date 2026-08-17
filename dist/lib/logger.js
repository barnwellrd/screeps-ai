"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.info = info;
exports.warn = warn;
exports.error = error;
exports.metrics = metrics;
function info(msg) { console.log('[INFO] ' + msg); }
function warn(msg) { console.log('[WARN] ' + msg); }
function error(msg) { console.log('[ERROR] ' + msg); }
function metrics(msg) { console.log('[METRICS] ' + msg); }
