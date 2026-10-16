import { NextResponse } from "next/server";

// Pages for signed-out users
const PUBLIC_PATHS = ["/login", "/forgot-password"];

/**
 * Fast redirects based on the backend's `erp_session` hint cookie. This is routing only, not
 * security: the API authenticates every request, and AuthGate re-checks on the client.
 */
export function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has("erp_session");
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!signedIn && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (signedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Skip API calls, Next internals and static files
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
