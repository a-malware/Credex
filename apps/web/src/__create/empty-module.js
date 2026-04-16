// Empty module for SSR - wallet adapters are client-only
export default {};
export const SafeEventEmitter = class {};
export const EventEmitter = class {};
export function isStream() { return false; }
export function isWritableStream() { return false; }
export function isReadableStream() { return false; }
export const Buffer = {};
export const Stream = {};
export const Readable = {};
export const Writable = {};
export const Transform = {};
export const PassThrough = {};
export const util = {};
export const path = {};
export const fs = {};
export const crypto = {};
export const events = {};
export const assert = {};
export const color = {};
export const jwt = {};
export const jwtDecode = function() {};

