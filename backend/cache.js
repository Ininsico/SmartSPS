const ROOM_TTL_MS = 30 * 60 * 1000;
const HISTORY_TTL_MS = 60 * 1000;

const roomCache = new Map();
const historyCache = new Map();

let hits = 0, misses = 0;

export function getCachedRoom(roomId) {
    const entry = roomCache.get(roomId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { roomCache.delete(roomId); return null; }
    entry.expiresAt = Date.now() + ROOM_TTL_MS;
    return entry;
}

export function setCachedRoom(meeting) {
    const participants = new Map();
    for (const p of (meeting.participants || [])) {
        participants.set(p.userId, { socketId: p.socketId, name: p.name, avatar: p.avatar, isActive: p.isActive });
    }
    roomCache.set(meeting.roomId, {
        hostId: meeting.hostId,
        hostSocketId: meeting.hostSocketId,
        status: meeting.status,
        participants,
        expiresAt: Date.now() + ROOM_TTL_MS,
    });
}

export function patchCachedRoom(roomId, patch) {
    const entry = roomCache.get(roomId);
    if (!entry) return;
    Object.assign(entry, patch);
    entry.expiresAt = Date.now() + ROOM_TTL_MS;
}

export function patchCachedParticipant(roomId, userId, patch) {
    const entry = roomCache.get(roomId);
    if (!entry) return;
    const p = entry.participants.get(userId);
    if (p) Object.assign(p, patch);
    else entry.participants.set(userId, patch);
    entry.expiresAt = Date.now() + ROOM_TTL_MS;
}

export function evictRoom(roomId) {
    roomCache.delete(roomId);
}

export function getCachedHistory(userId) {
    const entry = historyCache.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { historyCache.delete(userId); return null; }
    return entry.data;
}

export function setCachedHistory(userId, data) {
    historyCache.set(userId, { data, expiresAt: Date.now() + HISTORY_TTL_MS });
}

export function invalidateHistory(userId) {
    historyCache.delete(userId);
}

export function invalidateAllHistory() {
    historyCache.clear();
}

export function recordHit() { hits++; }
export function recordMiss() { misses++; }
export function getCacheStats() {
    return { roomCacheSize: roomCache.size, historyCacheSize: historyCache.size, hits, misses };
}

setInterval(() => {
    const now = Date.now();
    for (const [k, v] of roomCache.entries()) if (now > v.expiresAt) roomCache.delete(k);
    for (const [k, v] of historyCache.entries()) if (now > v.expiresAt) historyCache.delete(k);
}, 5 * 60 * 1000);
