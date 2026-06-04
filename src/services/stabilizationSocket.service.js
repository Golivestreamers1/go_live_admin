import { io } from 'socket.io-client';

const SOCKET_PATH = '/socket.io';
const FALLBACK_POLL_MS = 60_000;

/** @type {import('socket.io-client').Socket | null} */
let socket = null;
/** @type {Set<(payload: object) => void>} */
const listeners = new Set();
let connectPromise = null;

function socketBaseUrl() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://api.golivestreamers.com/api/v1';
  return apiBase.replace(/\/api\/v\d+\/?$/, '');
}

function notify(payload) {
  listeners.forEach((cb) => {
    try {
      cb(payload);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[stabilization-socket] listener error', err);
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

    socket.on('stabilization:update', (payload) => {
      if (payload && typeof payload === 'object') notify(payload);
    });

    socket.on('connect', () => {
      socket.emit('admin-stabilization-subscribe', (resp) => {
        if (resp?.ok) notify(resp);
      });
    });

    socket.on('disconnect', () => {
      listeners.forEach((cb) => {
        try {
          cb({ __disconnected: true });
        } catch {
          /* ignore */
        }
      });
    });
  } else if (!socket.connected) {
    socket.auth = { token };
    socket.connect();
  }

  return socket;
}

export function subscribeStabilizationUpdates(onPayload) {
  listeners.add(onPayload);
  ensureSocket();

  return () => {
    listeners.delete(onPayload);
    if (listeners.size === 0 && socket) {
      try {
        socket.emit('admin-stabilization-unsubscribe');
      } catch {
        /* ignore */
      }
      socket.disconnect();
      socket = null;
      connectPromise = null;
    }
  };
}

export function isStabilizationSocketConnected() {
  return Boolean(socket?.connected);
}

export async function waitForStabilizationSocket(timeoutMs = 12_000) {
  const s = ensureSocket();
  if (!s) return false;
  if (s.connected) return true;

  if (!connectPromise) {
    connectPromise = new Promise((resolve) => {
      const done = (ok) => {
        clearTimeout(timer);
        s.off('connect', onConnect);
        s.off('connect_error', onError);
        resolve(ok);
      };
      const onConnect = () => done(true);
      const onError = () => done(false);
      const timer = setTimeout(() => done(false), timeoutMs);
      s.once('connect', onConnect);
      s.once('connect_error', onError);
      if (!s.active) s.connect();
    }).finally(() => {
      connectPromise = null;
    });
  }

  return connectPromise;
}

export { FALLBACK_POLL_MS };
