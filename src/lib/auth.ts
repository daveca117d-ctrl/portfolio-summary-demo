// Admin-only gate for /update (and its ingest API routes) — the rest of the
// site is open for client viewing. Single env password; on success we set a
// cookie holding an HMAC of a fixed marker keyed by SESSION_SECRET, recomputed
// and compared in proxy. Web Crypto so it runs on the edge runtime too.

export const ADMIN_AUTH_COOKIE = "portfolio_admin_session";
const MARKER = "portfolio-admin-ok-v1";

function secret() {
  return process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
}

async function hmac(message: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Buffer.from(new Uint8Array(sig)).toString("base64url");
}

export async function makeAdminToken(): Promise<string> {
  return hmac(MARKER, secret());
}

export async function verifyAdminToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const expected = await makeAdminToken();
  // constant-time-ish compare
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function checkAdminPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  return !!pw && input === pw;
}
