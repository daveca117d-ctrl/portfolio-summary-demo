// Tiny in-memory login throttle. Single replica + a shared password, so a simple
// per-IP failure counter is enough to defeat brute-forcing. State lives in memory
// and resets on redeploy — fine for this purpose (an attacker can't redeploy).

const MAX_FAILS = 5;            // failed attempts before lockout
const WINDOW_MS = 15 * 60_000;  // attempts counted within this rolling window
const LOCK_MS = 15 * 60_000;    // how long a lockout lasts

type Entry = { fails: number; first: number; lockedUntil: number };
const attempts = new Map<string, Entry>();

/** Returns how many seconds the caller is locked out for, or 0 if allowed. */
export function lockedFor(ip: string): number {
  const e = attempts.get(ip);
  if (!e) return 0;
  const now = Date.now();
  if (e.lockedUntil > now) return Math.ceil((e.lockedUntil - now) / 1000);
  return 0;
}

/** Record a failed login; locks the IP once it crosses the threshold. */
export function recordFail(ip: string): void {
  const now = Date.now();
  const e = attempts.get(ip);
  if (!e || now - e.first > WINDOW_MS) {
    attempts.set(ip, { fails: 1, first: now, lockedUntil: 0 });
    return;
  }
  e.fails += 1;
  if (e.fails >= MAX_FAILS) e.lockedUntil = now + LOCK_MS;
}

/** Clear an IP's failure count after a successful login. */
export function recordSuccess(ip: string): void {
  attempts.delete(ip);
}

/** Best-effort client IP from the proxy headers Railway sets. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
