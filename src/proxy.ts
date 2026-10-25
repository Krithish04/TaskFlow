import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";

export function handleProxyAuth(
  req: Pick<NextAuthRequest, "auth" | "url"> & {
    nextUrl: { pathname: string; search: string };
  }
) {
  const isLoggedIn = !!req.auth?.user;
  const { pathname, search } = req.nextUrl;

  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/projects");

  if (isProtected && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(pathname + search);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, req.url)
    );
  }

  return NextResponse.next();
}

export const proxy = auth((req: NextAuthRequest) => handleProxyAuth(req));

export const middleware = proxy;
export default proxy;

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*"],
};
