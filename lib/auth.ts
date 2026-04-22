/**
 * Session auth — single shared password + HMAC-signed cookie.
 * Works in both Edge (middleware) and Node (Server Actions) runtimes.
 */

export const SESSION_COOKIE = "zlt_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toHex(sig);
}

export type SessionCheck = { ok: true } | { ok: false; reason: string };

export async function signSessionToken(secret: string): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000).toString(36);
  const sig = await hmacHex(secret, issuedAt);
  return `${issuedAt}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
): Promise<SessionCheck> {
  if (!secret) return { ok: false, reason: "missing-secret" };
  if (!token) return { ok: false, reason: "missing-token" };
  const [issuedAt, sig] = token.split(".");
  if (!issuedAt || !sig) return { ok: false, reason: "malformed" };
  const expected = await hmacHex(secret, issuedAt);
  if (!timingSafeEqual(sig, expected)) {
    return { ok: false, reason: "bad-signature" };
  }
  const issuedAtSec = parseInt(issuedAt, 36);
  if (!Number.isFinite(issuedAtSec)) {
    return { ok: false, reason: "malformed-timestamp" };
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - issuedAtSec > SESSION_TTL_SECONDS) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true };
}
