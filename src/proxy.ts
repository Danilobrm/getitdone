import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const userId = await verifySessionToken(token, process.env.SESSION_SECRET ?? "");
  if (userId) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except /login, /cadastro, manifest, service worker, icons and Next assets.
  matcher: [
    "/((?!login|cadastro|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icons/).*)",
  ],
};
