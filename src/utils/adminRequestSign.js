/**
 * HMAC request signing for Go Live admin dashboard (browser).
 * Must match Go_live_App_Backend `mobileAppSignature.middleware.js`.
 *
 * Env (Vite): VITE_API_SIGNING_SECRET, VITE_API_SIGNING_APP_ID (default golive-admin)
 */
export const GO_LIVE_SIGN_HEADERS = {
  timestamp: "X-GoLive-Timestamp",
  nonce: "X-GoLive-Nonce",
  signature: "X-GoLive-Signature",
  appId: "X-GoLive-App-Id",
};

const DEFAULT_APP_ID = "golive-admin";

function signingSecret() {
  return String(import.meta.env.VITE_API_SIGNING_SECRET || "").trim();
}

export function isApiSigningConfigured() {
  return signingSecret().length >= 16;
}

function normalizePath(pathname) {
  const path = String(pathname || "").split("?")[0] || "/";
  return path.startsWith("/") ? path : `/${path}`;
}

async function sha256HexUtf8(text) {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * @param {{ method: string, pathname: string, body?: string }} input
 */
export async function signAdminApiRequest(input) {
  const secret = signingSecret();
  if (!secret) return {};

  const method = String(input.method || "GET").toUpperCase();
  const path = normalizePath(input.pathname);
  const timestamp = String(Date.now());
  const nonce = randomNonce();
  const bodyStr =
    method === "GET" || method === "HEAD" ? "" : String(input.body ?? "");
  const bodyHash = await sha256HexUtf8(bodyStr);
  const canonical = [method, path, timestamp, nonce, bodyHash].join("\n");
  const signature = await hmacSha256Hex(secret, canonical);
  const appId = String(
    import.meta.env.VITE_API_SIGNING_APP_ID || DEFAULT_APP_ID,
  ).trim();

  return {
    [GO_LIVE_SIGN_HEADERS.appId]: appId,
    [GO_LIVE_SIGN_HEADERS.timestamp]: timestamp,
    [GO_LIVE_SIGN_HEADERS.nonce]: nonce,
    [GO_LIVE_SIGN_HEADERS.signature]: signature,
  };
}

/**
 * Resolve pathname for signing (must match what Express sees: /api/v1/...).
 * @param {import('axios').InternalAxiosRequestConfig} config
 */
export function pathnameForAxiosConfig(config) {
  const base = String(config.baseURL || "").replace(/\/$/, "");
  const raw = String(config.url || "").split("?")[0] || "";
  if (raw.startsWith("/api/v1")) return raw;
  const suffix = raw.startsWith("/") ? raw : `/${raw}`;
  if (base.endsWith("/api/v1")) return `/api/v1${suffix}`;
  try {
    const full = new URL(raw, `${base}/`);
    return full.pathname;
  } catch {
    return `/api/v1${suffix}`;
  }
}

/**
 * Attach X-GoLive-* headers to an axios config (mutates config).
 * @param {import('axios').InternalAxiosRequestConfig} config
 */
export async function attachGoLiveSignatureToAxiosConfig(config) {
  if (!isApiSigningConfigured()) return config;

  const method = (config.method || "get").toUpperCase();
  const pathname = pathnameForAxiosConfig(config);

  let bodyStr = "";
  if (config.data instanceof FormData) {
    bodyStr = "";
  } else if (typeof config.data === "string") {
    bodyStr = config.data;
  } else if (config.data !== undefined && config.data !== null) {
    bodyStr = JSON.stringify(config.data);
    config.data = bodyStr;
    if (config.headers?.set) {
      config.headers.set("Content-Type", "application/json");
    } else {
      config.headers = {
        ...config.headers,
        "Content-Type": "application/json",
      };
    }
  }

  const signed = await signAdminApiRequest({
    method,
    pathname,
    body: bodyStr,
  });

  for (const [key, value] of Object.entries(signed)) {
    if (config.headers?.set) {
      config.headers.set(key, value);
    } else {
      config.headers = { ...config.headers, [key]: value };
    }
  }

  return config;
}
