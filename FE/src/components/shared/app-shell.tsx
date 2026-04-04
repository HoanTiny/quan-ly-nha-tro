import { ReactNode } from 'react';
import {
  Bell,
  Home,
  Receipt,
  Users,
  PieChart,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

type AppShellProps = {
  role: 'admin' | 'member';
  title: string;
  children: ReactNode;
};

const adminNav = [
  { href: '/admin/dashboard', label: 'Tổng quan', icon: Home },
  { href: '/admin/rooms', label: 'Phòng', icon: Users },
  { href: '/admin/bills', label: 'Chi phí', icon: Receipt },
  { href: '/admin/expenses', label: 'Tổng kết', icon: PieChart },
  { href: '/admin/payments', label: 'Thanh toán', icon: Bell },
] satisfies ReadonlyArray<{ href: Route; label: string; icon: LucideIcon }>;

const memberNav = [
  { href: '/member/dashboard', label: 'Tổng quan', icon: Home },
  { href: '/member/bills', label: 'Hóa đơn', icon: Receipt },
  { href: '/member/expenses', label: 'Tổng kết', icon: PieChart },
  { href: '/member/electricity', label: 'Điện năng', icon: Zap },
  { href: '/member/notifications', label: 'Thông báo', icon: Bell },
] satisfies ReadonlyArray<{ href: Route; label: string; icon: LucideIcon }>;

export function AppShell({ role, title, children }: AppShellProps) {
  const nav = role === 'admin' ? adminNav : memberNav;
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-64 shrink-0 rounded-[32px] bg-secondary p-5 lg:block">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Tro
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Quản lý chi tiêu
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
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium',
                    isActive
                      ? 'bg-primary text-white'
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

        <div className="flex-1">
          <header className="mb-4 rounded-[28px] bg-white px-5 py-4 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {role}
                </p>
                <h1 className="text-2xl font-semibold text-foreground">
                  {title}
                </h1>
              </div>
              <div className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-foreground">
                House Alpha
              </div>
            </div>
          </header>

          <main>{children}</main>

          {/* Mobile Bottom Navigation */}
          <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md rounded-t-2xl border-t border-neutral-300 bg-background/95 backdrop-blur lg:hidden">
            <div className="grid grid-cols-5">
              {nav.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center justify-center gap-1 py-3 relative"
                  >
                    <div
                      className={cn(
                        'flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-200',
                        isActive
                          ? 'text-primary bg-primary-subtle'
                          : 'text-neutral-500 hover:bg-neutral-300',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {isActive && (
                        <div className="absolute top-2 w-1 h-1 rounded-full bg-primary"></div>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-[10px] mt-1 font-medium',
                        isActive ? 'text-primary' : 'text-neutral-500',
                      )}
                    >
                      {item.label}
                    </span>
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
