import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Security headers applied to every response
export function middleware(_request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers that can't be set in next.config.mjs at runtime
  response.headers.set("X-Request-Id", crypto.randomUUID());

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|uploads|images).*)",
  ],
};
