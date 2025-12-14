import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware to handle protected routes and redirects
 * 
 * Note: Full authentication verification happens at the API level
 * using Firebase Admin SDK. This middleware handles basic route
 * protection and redirects.
 */

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/artist/upload"];

// Routes only for logged out users
const authRoutes = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Firebase auth session cookie
  // This is a basic check - full verification happens server-side
  const session = request.cookies.get("__session");

  // Redirect authenticated users away from auth pages
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (session) {
      return NextResponse.redirect(new URL("/gallery", request.url));
    }
  }

  // Note: Protected route enforcement is handled by useRequireAuth hook
  // in the individual pages for better UX with loading states

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

