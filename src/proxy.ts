import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_AUTH_COOKIE, verifyAdminToken } from "@/lib/auth";

// Client-facing viewing pages are open — no gate. Only the data-update area
// (the /update page and its ingest API routes) requires the admin password,
// via a separate session cookie from any future client-facing auth.
const ADMIN_PATHS = ["/update", "/api/ingest"];
const ADMIN_PUBLIC = ["/admin-login", "/api/admin-login"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));
  if (!isAdminPath) return NextResponse.next();
  if (ADMIN_PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const ok = await verifyAdminToken(req.cookies.get(ADMIN_AUTH_COOKIE)?.value);
  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/admin-login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // everything except Next internals and static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|ico)$).*)"],
};
