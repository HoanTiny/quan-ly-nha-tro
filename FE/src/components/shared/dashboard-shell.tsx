'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react';
import {
  Bell,
  CreditCard,
  FileText,
  Key,
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

import { AUTH_LOGOUT_EVENT, clearAuthSession } from '@/lib/auth/session';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { APP_NAME } from '@/lib/config/app-config';
import { cn } from '@/lib/utils';

const adminNav = [
  { href: '/admin/dashboard', label: 'Tong quan', icon: LayoutDashboard },
  { href: '/admin/rooms', label: 'Phong', icon: MenuSquare },
  { href: '/admin/members', label: 'Thanh vien', icon: Users },
  { href: '/admin/bills', label: 'Chi phi', icon: FileText },
  { href: '/admin/expenses', label: 'Tong ket', icon: PieChart },
  { href: '/admin/payments', label: 'Thanh toan', icon: Wallet },
  { href: '/admin/electricity', label: 'Quan ly dien', icon: Zap },
  { href: '/admin/evn', label: 'Chi so dien', icon: Zap },
  { href: '/admin/notifications', label: 'Thong bao', icon: Bell },
  { href: '/admin/settings', label: 'Cai dat', icon: Settings },
  { href: '/admin/change-password', label: 'Doi mat khau', icon: Key },
] satisfies ReadonlyArray<{ href: Route; label: string; icon: LucideIcon }>;

const memberNav = [
  { href: '/member/dashboard', label: 'Tong quan', icon: LayoutDashboard },
  { href: '/member/bills', label: 'Hoa don', icon: FileText },
  { href: '/member/expenses', label: 'Tong ket', icon: PieChart },
  { href: '/member/payments', label: 'Thanh toan', icon: CreditCard },
  { href: '/member/electricity', label: 'Tien dien', icon: Zap },
  { href: '/member/notifications', label: 'Thong bao', icon: Bell },
  { href: '/member/profile', label: 'Ca nhan', icon: Users },
  { href: '/member/change-password', label: 'Doi mat khau', icon: Key },
] satisfies ReadonlyArray<{ href: Route; label: string; icon: LucideIcon }>;

export function DashboardShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = pathname.startsWith('/admin') ? adminNav : memberNav;
  const session = useAuthSession();
  const [showMenu, setShowMenu] = React.useState(false);

  const handleLogout = () => {
    clearAuthSession();
    router.replace('/login');
  };

  const visibleItems = nav.slice(0, 4);
  const moreItems = nav.slice(4);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showMenu && !target.closest('[data-more-menu]')) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu]);

  React.useEffect(() => {
    const handleAuthLogout = (event: CustomEvent<{ reason: string }>) => {
      if (event.detail?.reason === 'unauthorized') {
        clearAuthSession();
        router.replace('/login');
      }
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handleAuthLogout as EventListener);
    return () => {
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleAuthLogout as EventListener);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 shrink-0 border-r border-neutral-300 bg-secondary p-5 lg:block">
          <div className="mb-8 mt-16">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              {APP_NAME}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Bang dieu khien</h2>
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
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-300 bg-background/80 px-4 py-4 backdrop-blur lg:px-8">
            <div className="lg:hidden">
              <p className="text-xs text-muted-foreground">{session?.email ?? APP_NAME}</p>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-foreground">
                Xin chao{session?.fullName ? `, ${session.fullName}` : ''}
              </p>
              <p className="text-xs text-muted-foreground">{session?.email ?? APP_NAME}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-neutral-300"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Dang xuat</span>
            </button>
          </header>

          <main className="flex-1 w-full px-4 py-6 pb-[84px] lg:px-8 lg:py-8 lg:pb-8">
            {children}
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
            <div className="border-t border-neutral-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="grid h-[68px] grid-cols-5 safe-area-pb">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'relative flex h-full flex-col items-center justify-center gap-[2px] transition-colors',
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
                        {isActive ? (
                          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                        ) : null}
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

                <div className="relative" data-more-menu>
                  <button
                    type="button"
                    onClick={() => setShowMenu((current) => !current)}
                    className={cn(
                      'relative flex h-full w-full flex-col items-center justify-center gap-[2px] transition-colors',
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
                      Them
                    </span>
                  </button>

                  {showMenu ? (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                      <div className="fixed bottom-[80px] right-4 z-50 w-56 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
                        <div className="max-h-[60vh] overflow-y-auto p-2">
                          {moreItems.map((item) => {
                            const Icon = item.icon;
                            const isActive =
                              pathname === item.href || pathname.startsWith(`${item.href}/`);

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
                  ) : null}
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
