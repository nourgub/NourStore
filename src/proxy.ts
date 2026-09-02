import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import { MERCHANT_SESSION_COOKIE, verifyMerchantSessionToken } from "@/lib/merchant-auth";

async function handleAdminRoutes(request: NextRequest, pathname: string) {
  const isAuthApi = pathname === "/api/admin/login" || pathname === "/api/admin/logout";
  const isLoginPage = pathname === "/admin/login";
  if (isAuthApi || isLoginPage) return NextResponse.next();

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const authenticated = await verifyAdminSessionToken(token);

  if (!authenticated) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

async function handleAccountRoutes(request: NextRequest, pathname: string) {
  const isAuthApi = pathname === "/api/account/login" || pathname === "/api/account/logout";
  const isLoginPage = pathname === "/account/login";
  if (isAuthApi || isLoginPage) return NextResponse.next();

  const token = request.cookies.get(MERCHANT_SESSION_COOKIE)?.value;
  const merchantId = await verifyMerchantSessionToken(token);

  if (!merchantId) {
    if (pathname.startsWith("/api/account")) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/account/login", request.url));
  }

  return NextResponse.next();
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    return handleAdminRoutes(request, pathname);
  }

  if (pathname.startsWith("/account") || pathname.startsWith("/api/account")) {
    return handleAccountRoutes(request, pathname);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/account/:path*", "/api/account/:path*"],
};
