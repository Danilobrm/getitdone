// Edge/Node-safe (Web Crypto only) so it works in the proxy and in server code.
// Token: `${userId}.${expiresAtMs}.${signature}` where the signature covers the first two parts.
export const SESSION_COOKIE = "gid_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array<ArrayBuffer> | null {
  try {
    const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function hmacKey(secret: string, usage: "sign" | "verify") {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

export async function createSessionToken(secret: string, userId: string, now = Date.now()): Promise<string> {
  const payload = `${userId}.${now + SESSION_MAX_AGE_SEC * 1000}`;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(sig))}`;
}

/** Returns the user id when the token is authentic and not expired, otherwise null. */
export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<string | null> {
  if (!token || !secret) return null;
  const [userId, expiresRaw, sig] = token.split(".");
  if (!userId || !expiresRaw || !sig || !UUID.test(userId)) return null;
  const sigBytes = fromBase64Url(sig);
  if (!sigBytes) return null;
  const ok = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret, "verify"),
    sigBytes,
    encoder.encode(`${userId}.${expiresRaw}`),
  );
  if (!ok) return null;
  const expires = Number(expiresRaw);
  return Number.isFinite(expires) && expires > now ? userId : null;
}
