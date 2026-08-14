"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.error = exports.warn = exports.info = void 0;
function info(msg) { console.log('[INFO] ' + msg); }
exports.info = info;
function warn(msg) { console.log('[WARN] ' + msg); }
exports.warn = warn;
function error(msg) { console.log('[ERROR] ' + msg); }
exports.error = error;
