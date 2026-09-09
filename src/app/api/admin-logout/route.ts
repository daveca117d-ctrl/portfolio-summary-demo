import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_AUTH_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // req.nextUrl reflects the public host behind Railway's proxy (req.url is the
  // server's internal localhost:PORT, which would bounce the browser off-site).
  const url = req.nextUrl.clone();
  url.pathname = "/admin-login";
  url.search = "";
  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set(ADMIN_AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
