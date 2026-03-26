"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  MenuSquare,
  Settings,
  Users,
  Wallet,
  type LucideIcon
} from "lucide-react";

import { clearAuthSession, getAuthSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

const adminNav = [
  { href: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/rooms", label: "Phòng", icon: MenuSquare },
  { href: "/admin/members", label: "Thành viên", icon: Users },
  { href: "/admin/bills", label: "Chi phí", icon: FileText },
  { href: "/admin/payments", label: "Thanh toán", icon: Wallet },
  { href: "/admin/notifications", label: "Thông báo", icon: Bell },
  { href: "/admin/settings", label: "Cài đặt", icon: Settings }
] satisfies ReadonlyArray<{ href: Route; label: string; icon: LucideIcon }>;

const memberNav = [
  { href: "/member/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/member/bills", label: "Hóa đơn", icon: FileText },
  { href: "/member/payments", label: "Thanh toán", icon: CreditCard },
  { href: "/member/notifications", label: "Thông báo", icon: Bell },
  { href: "/member/profile", label: "Cá nhân", icon: Users }
] satisfies ReadonlyArray<{ href: Route; label: string; icon: LucideIcon }>;

export function DashboardShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = pathname.startsWith("/admin") ? adminNav : memberNav;
  const session = getAuthSession();

  const handleLogout = () => {
    clearAuthSession();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        {/* PC Sidebar - Always visible on large screens */}
        <aside className="hidden lg:block fixed left-0 top-0 h-screen w-72 shrink-0 border-r border-neutral-300 bg-secondary p-5 z-40">
          <div className="mb-8 mt-16">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Tro Manager</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Bảng điều khiển</h2>
          </div>

          <nav className="space-y-2">
            {nav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:bg-neutral-300"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:ml-72"> {/* Thêm margin-left CHỈ trên màn hình lớn để không bị che bởi sidebar cố định */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-300 bg-background/80 px-4 py-4 backdrop-blur lg:px-8">
            <div className="lg:hidden">
              <p className="text-xs text-muted-foreground">
                {session?.email ?? "Ứng dụng quản lý nhà trọ"}
              </p>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-foreground">
                Xin chào{session?.fullName ? `, ${session.fullName}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {session?.email ?? "Ứng dụng quản lý nhà trọ"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-neutral-300"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8 pb-24 lg:pb-8">{children}</main>

          {/* Mobile Bottom Navigation Bar - Floating style */}
          <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 lg:hidden">
            <div className="flex items-center gap-1 rounded-2xl bg-background/90 backdrop-blur shadow-lg border border-neutral-300 px-2 py-2">
              {nav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center justify-center rounded-xl transition-all duration-200",
                      isActive
                        ? "w-14 h-14 bg-primary text-white shadow-md scale-110"
                        : "w-12 h-12 text-neutral-500 hover:bg-neutral-300 hover:text-neutral-700"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {isActive && (
                      <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-white"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
