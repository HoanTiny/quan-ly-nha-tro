'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react';
import {
  Bell,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  MenuSquare,
  PieChart,
  Settings,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { clearAuthSession, getAuthSession } from '@/lib/auth/session';
import { cn } from '@/lib/utils';

const adminNav = [
  { href: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/admin/rooms', label: 'Phòng', icon: MenuSquare },
  { href: '/admin/members', label: 'Thành viên', icon: Users },
  { href: '/admin/bills', label: 'Chi phí', icon: FileText },
  { href: '/admin/expenses', label: 'Tổng kết', icon: PieChart },
  { href: '/admin/payments', label: 'Thanh toán', icon: Wallet },
  { href: '/admin/electricity', label: 'Quản lý điện', icon: Zap },
  { href: '/admin/evn', label: 'Chỉ số điện', icon: Zap },
  { href: '/admin/notifications', label: 'Thông báo', icon: Bell },
  { href: '/admin/settings', label: 'Cài đặt', icon: Settings },
] satisfies ReadonlyArray<{ href: Route; label: string; icon: LucideIcon }>;

const memberNav = [
  { href: '/member/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/member/bills', label: 'Hóa đơn', icon: FileText },
  { href: '/member/expenses', label: 'Tổng kết', icon: PieChart },
  { href: '/member/payments', label: 'Thanh toán', icon: CreditCard },
  { href: '/member/electricity', label: 'Tiền điện', icon: Zap },
  { href: '/member/notifications', label: 'Thông báo', icon: Bell },
  { href: '/member/profile', label: 'Cá nhân', icon: Users },
] satisfies ReadonlyArray<{ href: Route; label: string; icon: LucideIcon }>;

export function DashboardShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = pathname.startsWith('/admin') ? adminNav : memberNav;
  const session = getAuthSession();
  const [showMenu, setShowMenu] = React.useState(false);

  const handleLogout = () => {
    clearAuthSession();
    router.replace('/login');
  };

  // Lấy 4 mục đầu, còn lại vào menu "..."
  const visibleItems = nav.slice(0, 4);
  const moreItems = nav.slice(4);

  // Đóng menu khi click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showMenu && !target.closest('[data-more-menu]')) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu]);

  // Lắng nghe sự kiện logout từ API client khi token hết hạn
  React.useEffect(() => {
    const handleAuthLogout = (event: CustomEvent<{ reason: string }>) => {
      if (event.detail?.reason === 'unauthorized') {
        clearAuthSession();
        router.replace('/login');
      }
    };

    window.addEventListener(
      'tro-auth-logout',
      handleAuthLogout as EventListener,
    );
    return () => {
      window.removeEventListener(
        'tro-auth-logout',
        handleAuthLogout as EventListener,
      );
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        {/* PC Sidebar - Always visible on large screens */}
        <aside className="hidden lg:block fixed left-0 top-0 h-screen w-72 shrink-0 border-r border-neutral-300 bg-secondary p-5 z-40">
          <div className="mb-8 mt-16">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Tro Manager
            </p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">
              Bảng điều khiển
            </h2>
          </div>

          <nav className="space-y-2">
            {nav.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-neutral-300',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:ml-72">
          {' '}
          {/* Thêm margin-left CHỈ trên màn hình lớn để không bị che bởi sidebar cố định */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-300 bg-background/80 px-4 py-4 backdrop-blur lg:px-8">
            <div className="lg:hidden">
              <p className="text-xs text-muted-foreground">
                {session?.email ?? 'Ứng dụng quản lý nhà trọ'}
              </p>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-foreground">
                Xin chào{session?.fullName ? `, ${session.fullName}` : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                {session?.email ?? 'Ứng dụng quản lý nhà trọ'}
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
          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8 pb-[84px] lg:pb-8 w-[100vw] sm:w-full">
            {children}
          </main>
          {/* Mobile Bottom Navigation Bar - Full width navbar */}
          <nav className="fixed left-0 right-0 bottom-0 z-40 lg:hidden">
            <div className="border-t border-neutral-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="grid grid-cols-5 h-[68px] safe-area-pb">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'relative flex flex-col items-center justify-center gap-[2px] transition-colors h-full',
                        isActive ? 'bg-primary/5' : 'hover:bg-neutral-50',
                      )}
                    >
                      <div
                        className={cn(
                          'relative flex items-center justify-center',
                          isActive ? 'text-primary' : 'text-neutral-500',
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {isActive && (
                          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-[10px] font-medium leading-none',
                          isActive ? 'text-primary' : 'text-neutral-500',
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}

                {/* Nút "..." xem thêm */}
                <div className="relative" data-more-menu>
                  <button
                    type="button"
                    onClick={() => setShowMenu(!showMenu)}
                    className={cn(
                      'relative flex flex-col items-center justify-center gap-[2px] transition-colors h-full w-full',
                      showMenu ? 'bg-primary/5' : 'hover:bg-neutral-50',
                    )}
                  >
                    <div
                      className={cn(
                        'relative flex items-center justify-center',
                        showMenu ? 'text-primary' : 'text-neutral-500',
                      )}
                    >
                      <MenuSquare className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-medium leading-none text-neutral-500">
                      Thêm
                    </span>
                  </button>

                  {/* Menu popup */}
                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="fixed right-4 bottom-[80px] z-50 w-56 rounded-2xl bg-white shadow-xl border border-neutral-200 overflow-hidden">
                        <div className="p-2 max-h-[60vh] overflow-y-auto">
                          {moreItems.map((item) => {
                            const Icon = item.icon;
                            const isActive =
                              pathname === item.href ||
                              pathname.startsWith(`${item.href}/`);

                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setShowMenu(false)}
                                className={cn(
                                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
                                  isActive
                                    ? 'bg-primary/5 text-primary'
                                    : 'text-neutral-600 hover:bg-neutral-50',
                                )}
                              >
                                <Icon className="h-4 w-4" />
                                {item.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
