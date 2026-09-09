import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_AUTH_COOKIE, checkAdminPassword, makeAdminToken } from "@/lib/auth";
import { clientIp, lockedFor, recordFail, recordSuccess } from "@/lib/ratelimit";

// Redirect helper that keeps the browser on the public host (req.nextUrl), not
// the server's internal localhost:PORT (req.url).
function toLogin(req: NextRequest, next: string, params: Record<string, string>) {
  const url = req.nextUrl.clone();
  url.pathname = "/admin-login";
  url.search = "";
  url.searchParams.set("next", next);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const rawNext = String(form.get("next") ?? "/update");
  // only allow same-site relative paths (avoid open redirect / internal-host leak)
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/update";

  // brute-force throttle: too many recent failures from this IP → temporary lockout
  const ip = clientIp(req);
  const wait = lockedFor(ip);
  if (wait > 0) {
    return toLogin(req, next, { locked: String(Math.ceil(wait / 60)) });
  }

  if (!checkAdminPassword(password)) {
    recordFail(ip);
    return toLogin(req, next, { error: "1" });
  }
  recordSuccess(ip);

  const dest = req.nextUrl.clone();
  dest.pathname = next;
  dest.search = "";
  const res = NextResponse.redirect(dest, { status: 303 });
  res.cookies.set(ADMIN_AUTH_COOKIE, await makeAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
  return res;
}
