import { NextRequest, NextResponse } from "next/server";
import { getDefaultRoute } from "@/lib/auth/default-route";

function redirectForSession(request: NextRequest, role: string | undefined, houseId: string | undefined) {
  const target = getDefaultRoute({
    role: role === "admin" ? "admin" : "member",
    houseId: houseId ?? null
  });

  return NextResponse.redirect(new URL(target, request.url));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn = request.cookies.get("tro_auth")?.value === "1";
  const role = request.cookies.get("tro_role")?.value;
  const houseId = request.cookies.get("tro_house_id")?.value;

  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password";
  const isCreateHousePage = pathname === "/create-house";
  const isPendingAccessPage = pathname === "/pending-access";
  const isAdminPage = pathname.startsWith("/admin");
  const isMemberPage = pathname.startsWith("/member");

  if (isAuthPage && isLoggedIn) {
    return redirectForSession(request, role, houseId);
  }

  if (isCreateHousePage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPendingAccessPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isCreateHousePage && isLoggedIn && houseId) {
    return redirectForSession(request, role, houseId);
  }

  if (isPendingAccessPage && isLoggedIn && houseId) {
    return redirectForSession(request, role, houseId);
  }

  if ((isAdminPage || isMemberPage) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if ((isAdminPage || isMemberPage) && isLoggedIn && !houseId) {
    return NextResponse.redirect(new URL("/pending-access", request.url));
  }

  if (isAdminPage && role !== "admin") {
    return isLoggedIn
      ? redirectForSession(request, role, houseId)
      : NextResponse.redirect(new URL("/login", request.url));
  }

  if (isMemberPage && role !== "member") {
    return isLoggedIn
      ? redirectForSession(request, role, houseId)
      : NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/forgot-password", "/create-house", "/pending-access", "/admin/:path*", "/member/:path*"]
};
