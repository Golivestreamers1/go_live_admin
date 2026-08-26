import { io } from 'socket.io-client';

/**
 * Realtime contest leaderboard for the admin dashboard.
 *
 * Mirrors stabilizationSocket.service.js: a single shared admin socket, authed
 * with the admin access token. Subscribers register per contest; the backend
 * broadcasts `contest-leaderboard-update` to `contest:<id>` after each gift
 * (debounced) and sends an immediate snapshot on join. Lets admins watch live
 * standings without polling — no need for a streamer to end their stream.
 */

const SOCKET_PATH = '/socket.io';
const FALLBACK_POLL_MS = 30_000;

/** @type {import('socket.io-client').Socket | null} */
let socket = null;
/** @type {Map<string, Set<(payload: object) => void>>} contestId -> listeners */
const contestListeners = new Map();

function socketBaseUrl() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://api.golivestreamers.com/api/v1';
  return apiBase.replace(/\/api\/v\d+\/?$/, '');
}

function notify(contestId, payload) {
  const set = contestListeners.get(contestId);
  if (!set) return;
  set.forEach((cb) => {
    try {
      cb(payload);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[contest-socket] listener error', err);
    }
  });
}

function ensureSocket() {
  const token = localStorage.getItem('adminAccessToken');
  if (!token) return null;

  if (socket?.connected) return socket;

  if (!socket) {
    socket = io(socketBaseUrl(), {
      path: SOCKET_PATH,
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      timeout: 12_000,
    });

    socket.on('contest-leaderboard-update', (payload) => {
      if (payload && typeof payload === 'object' && payload.contestId) {
        notify(String(payload.contestId), payload);
      }
    });

    socket.on('connect', () => {
      // Re-join every contest with active subscribers (membership is lost on
      // reconnect); each join also yields a fresh snapshot from the server.
      contestListeners.forEach((_set, contestId) => {
        socket.emit('join-contest', { contestId });
      });
    });

    socket.on('disconnect', () => {
      contestListeners.forEach((set) => {
        set.forEach((cb) => {
          try {
            cb({ __disconnected: true });
          } catch {
            /* ignore */
          }
        });
      });
    });
  } else if (!socket.connected) {
    socket.auth = { token };
    socket.connect();
  }

  return socket;
}

/**
 * Subscribe to live standings for one contest. Returns an unsubscribe function.
 * @param {string} contestId
 * @param {(payload: object) => void} onPayload
 */
export function subscribeContestLeaderboard(contestId, onPayload) {
  const id = String(contestId);
  if (!contestListeners.has(id)) contestListeners.set(id, new Set());
  contestListeners.get(id).add(onPayload);

  const s = ensureSocket();
  if (s?.connected) s.emit('join-contest', { contestId: id });

  return () => {
    const set = contestListeners.get(id);
    if (set) {
      set.delete(onPayload);
      if (set.size === 0) {
        contestListeners.delete(id);
        if (socket?.connected) {
          try {
            socket.emit('leave-contest', { contestId: id });
          } catch {
            /* ignore */
          }
        }
      }
    }
    // Tear the socket down once nothing is being watched.
    if (contestListeners.size === 0 && socket) {
      socket.disconnect();
      socket = null;
    }
  };
}

export function isContestSocketConnected() {
  return Boolean(socket?.connected);
}

export { FALLBACK_POLL_MS };
