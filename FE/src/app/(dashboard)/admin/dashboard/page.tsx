'use client';

import Link from 'next/link';
import type { Route } from 'next';
import {
  BarChart3,
  CircleAlert,
  CreditCard,
  House,
  ReceiptText,
  Wallet,
} from 'lucide-react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { StatCard } from '@/components/dashboard/stat-card';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAdminDashboard } from '@/features/dashboard/api';
import { getDemoContext } from '@/features/demo/api';

const currency = new Intl.NumberFormat('vi-VN');

function formatMonthKey(monthKey?: string) {
  if (!monthKey) {
    return 'Ky hien tai';
  }

  const [year, month] = monthKey.split('-');
  return `Thang ${month}/${year}`;
}

export default function AdminDashboardPage() {
  const month = new Date().toISOString().slice(0, 7);

  const demoContextQuery = useQuery({
    queryKey: ['demo', 'context'],
    queryFn: getDemoContext,
  });

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'admin', demoContextQuery.data?.houseId, month],
    queryFn: () => getAdminDashboard(demoContextQuery.data!.houseId, month),
    enabled: Boolean(demoContextQuery.data?.houseId),
  });

  const dashboard = dashboardQuery.data;
  const pendingPaymentsCount = dashboard?.pendingPaymentsCount ?? 0;
  const recentExpenses = dashboard?.recentExpenses ?? [];
  const latestSettlement = dashboard?.latestSettlement ?? null;

  const summary = useMemo(() => {
    const totalExpense = Number(dashboard?.totalExpense ?? 0);
    const totalCollected = Number(dashboard?.totalPaid ?? 0);
    const totalBills =
      dashboard?.allItems?.reduce(
        (sum: number, item: { netAmount: number; paidAmount: number }) =>
          sum + Math.max(Number(item.netAmount), 0),
        0,
      ) ?? 0;

    const remaining = Math.max(totalBills - totalCollected, 0);
    const unpaidMembers =
      dashboard?.allItems?.filter(
        (item: { netAmount: number; paidAmount: number }) =>
          Number(item.netAmount) - Number(item.paidAmount) > 0,
      ).length ?? 0;

    return {
      totalExpense,
      totalCollected,
      totalBills,
      remaining,
      unpaidMembers,
    };
  }, [dashboard]);

  if (demoContextQuery.isLoading || dashboardQuery.isLoading) {
    return <Card>Dang tai dashboard admin...</Card>;
  }

  if (demoContextQuery.error || dashboardQuery.error || !dashboard) {
    return <Card>Khong tai duoc dashboard admin.</Card>;
  }

  const urgentTasks = [
    summary.remaining > 0
      ? {
          label: `Con ${currency.format(summary.remaining)} VND can thu`,
          hint: `${summary.unpaidMembers} thanh vien chua hoan tat bill`,
          href: '/admin/payments' as Route,
        }
      : null,
    pendingPaymentsCount > 0
      ? {
          label: `${pendingPaymentsCount} giao dich dang cho xac nhan`,
          hint: 'Duyet payment proof de cap nhat bill ngay',
          href: '/admin/payments' as Route,
        }
      : null,
    {
      label: 'Them khoan chi moi',
      hint: 'Cap nhat dien, nuoc, wifi, sua chua trong ngay',
      href: '/admin/bills' as Route,
    },
  ].filter(Boolean) as Array<{ label: string; hint: string; href: Route }>;

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Dashboard admin"
        description="Tap trung vao viec can lam hom nay: chot ky, thu tien va xu ly payment proof."
      />
      <Card className="overflow-hidden bg-gradient-to-br from-pine to-ink text-white">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <Badge className="bg-white/15 text-white" variant="secondary">
              {formatMonthKey(latestSettlement?.monthKey ?? month)}
            </Badge>
            <div>
              <h2 className="text-3xl font-semibold">Hom nay admin can xu ly 3 viec chinh</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/75">
                Cap nhat khoan chi, chot cong no ky hien tai va duyet cac thanh toan dang cho xac
                nhan.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/admin/bills">
                <Button className="w-full bg-white text-ink hover:bg-white/90">
                  Tao khoan chi / chot ky
                </Button>
              </Link>
              <Link href="/admin/payments">
                <Button
                  className="w-full border border-white/20 bg-transparent text-white hover:bg-white/10"
                  variant="ghost"
                >
                  Xac nhan thanh toan
                </Button>
              </Link>
              <Link href="/admin/members">
                <Button
                  className="w-full border border-white/20 bg-transparent text-white hover:bg-white/10"
                  variant="ghost"
                >
                  Quan ly thanh vien
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] bg-white/10 p-5 backdrop-blur">
            <p className="text-sm uppercase tracking-[0.18em] text-white/60">Tien do ky hien tai</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Tong can thu</span>
                <span>{currency.format(summary.totalBills)} VND</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Da thu</span>
                <span>{currency.format(summary.totalCollected)} VND</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-clay"
                  style={{
                    width:
                      summary.totalBills > 0
                        ? `${Math.min((summary.totalCollected / summary.totalBills) * 100, 100)}%`
                        : '0%',
                  }}
                />
              </div>
              <p className="text-sm text-white/75">
                {summary.unpaidMembers > 0
                  ? `${summary.unpaidMembers} thanh vien van con so du chua dong.`
                  : 'Tat ca bill ky hien tai da duoc xu ly.'}
              </p>
            </div>
          </div>
        </div>
      </Card>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tong chi thang nay"
          value={`${currency.format(summary.totalExpense)} VND`}
          hint="Tong hop tu cac khoan chi da xac nhan"
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          label="Phong dang hoat dong"
          value={String(dashboard.rooms)}
          hint="Tong so phong dang duoc quan ly"
          icon={<House className="h-5 w-5" />}
        />
        <StatCard
          label="Bill chua hoan tat"
          value={String(summary.unpaidMembers)}
          hint="Thanh vien con du no trong ky hien tai"
          icon={<CircleAlert className="h-5 w-5" />}
        />
        <StatCard
          label="Payment proof"
          value={String(pendingPaymentsCount)}
          hint="Dang cho admin xac nhan"
          icon={<CreditCard className="h-5 w-5" />}
        />
      </section>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Viec can lam ngay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {urgentTasks.map((task) => (
              <Link
                key={task.label}
                href={task.href}
                className="flex items-center justify-between rounded-2xl border border-black/10 px-4 py-4 transition hover:bg-secondary"
              >
                <div className="md:w-auto w-[240px]">
                  <p className="font-medium">{task.label}</p>
                  <p className="text-sm text-muted-foreground">{task.hint}</p>
                </div>
                <span className="text-sm font-medium text-pine">Mo nhanh</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phim tat tac vu</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3">
            <Link
              href="/admin/bills"
              className="rounded-2xl bg-sand px-4 py-4 transition hover:bg-secondary"
            >
              <div className="flex items-center gap-3">
                <ReceiptText className="h-5 w-5 text-pine" />
                <div>
                  <p className="font-medium">Them khoan chi</p>
                  <p className="text-sm text-muted-foreground">
                    Nhap hoa don va chon nguoi chia bill
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/payments"
              className="rounded-2xl bg-sand px-4 py-4 transition hover:bg-secondary"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-pine" />
                <div>
                  <p className="font-medium">Duyet thanh toan</p>
                  <p className="text-sm text-muted-foreground">Xac nhan proof va doi soat bill</p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/rooms"
              className="rounded-2xl bg-sand px-4 py-4 transition hover:bg-secondary"
            >
              <div className="flex items-center gap-3">
                <House className="h-5 w-5 text-pine" />
                <div>
                  <p className="font-medium">Cap nhat phong</p>
                  <p className="text-sm text-muted-foreground">
                    Them phong va kiem tra suc chua hien tai
                  </p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </section>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle>Khoan chi gan day</CardTitle>
            <Link href="/admin/bills" className="text-sm font-medium text-pine">
              Xem tat ca
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentExpenses.length ? (
              recentExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{expense.title}</p>
                      <Badge>{expense.category}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(expense.expenseDate).toLocaleDateString('vi-VN')} |{' '}
                      {expense.participantCount} nguoi chia
                    </p>
                  </div>
                  <p className="font-semibold">{currency.format(expense.amount)} VND</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Chua co khoan chi nao trong thang hien tai.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trang thai ky hien tai</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl bg-sand p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{formatMonthKey(latestSettlement?.monthKey ?? month)}</p>
                <Badge variant={summary.remaining > 0 ? 'warning' : 'success'}>
                  {summary.remaining > 0 ? 'Dang thu tien' : 'Da hoan tat'}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Ky nay da ghi nhan {currency.format(summary.totalBills)} VND tien bill va{' '}
                {currency.format(summary.totalCollected)} VND da thu.
              </p>
            </div>

            <div className="rounded-2xl bg-sand p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-pine" />
                <div>
                  <p className="font-medium">Tien do thu tien</p>
                  <p className="text-sm text-muted-foreground">
                    {summary.totalBills > 0
                      ? `${Math.round((summary.totalCollected / summary.totalBills) * 100)}% bill da duoc thanh toan`
                      : 'Chua co settlement cho ky nay'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
