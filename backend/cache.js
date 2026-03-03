/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  In-process cache — replaces per-event MongoDB round-trips (20-80 ms each)
 *  with sub-millisecond Map lookups.
 *
 *  Two separate caches:
 *
 *  1. roomCache  — hot room state (hostSocketId, status, active participant list)
 *                  TTL: 30 minutes of inactivity. Evicted immediately on endMeeting.
 *
 *  2. historyCache — per-user meeting history for the dashboard.
 *                  TTL: 60 seconds. Invalidated whenever a room is created/ended.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ROOM_TTL_MS = 30 * 60 * 1000;  // 30 min
const HISTORY_TTL_MS = 60 * 1000;  // 60 s

// Map<roomId, { hostId, hostSocketId, status, participants: Map<userId,{socketId,name,avatar,isActive}>, expiresAt }>
const roomCache = new Map();

// Map<userId, { data: Meeting[], expiresAt }>
const historyCache = new Map();

// ─── Room cache helpers ───────────────────────────────────────────────────────

/** Returns cached room or null (never touches DB). */
export function getCachedRoom(roomId) {
    const entry = roomCache.get(roomId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { roomCache.delete(roomId); return null; }
    // Refresh TTL on every read (active rooms stay alive)
    entry.expiresAt = Date.now() + ROOM_TTL_MS;
    return entry;
}

/** Populate cache from a Mongoose document (call after every DB read/write). */
export function setCachedRoom(meeting) {
    const participants = new Map();
    for (const p of (meeting.participants || [])) {
        participants.set(p.userId, {
            socketId: p.socketId,
            name: p.name,
            avatar: p.avatar,
            isActive: p.isActive,
        });
    }
    roomCache.set(meeting.roomId, {
        hostId: meeting.hostId,
        hostSocketId: meeting.hostSocketId,
        status: meeting.status,
        participants,
        expiresAt: Date.now() + ROOM_TTL_MS,
    });
}

/** Patch specific fields without a full replace (used for lightweight updates). */
export function patchCachedRoom(roomId, patch) {
    const entry = roomCache.get(roomId);
    if (!entry) return;
    Object.assign(entry, patch);
    entry.expiresAt = Date.now() + ROOM_TTL_MS;
}

/** Mark a participant as active/inactive inside an already-cached room. */
export function patchCachedParticipant(roomId, userId, patch) {
    const entry = roomCache.get(roomId);
    if (!entry) return;
    const p = entry.participants.get(userId);
    if (p) Object.assign(p, patch);
    else entry.participants.set(userId, patch);
    entry.expiresAt = Date.now() + ROOM_TTL_MS;
}

/** Remove a room from cache (call on endMeeting). */
export function evictRoom(roomId) {
    roomCache.delete(roomId);
}

// ─── History cache helpers ────────────────────────────────────────────────────

export function getCachedHistory(userId) {
    const entry = historyCache.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { historyCache.delete(userId); return null; }
    return entry.data;
}

export function setCachedHistory(userId, data) {
    historyCache.set(userId, { data, expiresAt: Date.now() + HISTORY_TTL_MS });
}

/** Call when a meeting is created/ended so histories are re-fetched. */
export function invalidateHistory(userId) {
    historyCache.delete(userId);
}

/** Invalidate all histories (e.g. when we can't pinpoint which users are affected). */
export function invalidateAllHistory() {
    historyCache.clear();
}

// ─── Metrics (optional — useful for debugging cache hit rate) ─────────────────

let hits = 0, misses = 0;
export function recordHit() { hits++; }
export function recordMiss() { misses++; }
export function getCacheStats() {
    return { roomCacheSize: roomCache.size, historyCacheSize: historyCache.size, hits, misses };
}

// ─── Periodic cleanup of expired entries (runs every 5 minutes) ──────────────
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of roomCache.entries()) if (now > v.expiresAt) roomCache.delete(k);
    for (const [k, v] of historyCache.entries()) if (now > v.expiresAt) historyCache.delete(k);
}, 5 * 60 * 1000);
