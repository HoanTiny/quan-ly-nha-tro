"use client";

import Link from "next/link";
import type { Route } from "next";
import { BarChart3, CircleAlert, CreditCard, FileText, House, ReceiptText, Wallet } from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboard } from "@/features/dashboard/api";
import { getDemoContext } from "@/features/demo/api";
import { getExpenses } from "@/features/expenses/api";
import { getPayments } from "@/features/payments/api";

const currency = new Intl.NumberFormat("vi-VN");

function formatMonthKey(monthKey?: string) {
  if (!monthKey) {
    return "Kỳ hiện tại";
  }

  const [year, month] = monthKey.split("-");
  return `Tháng ${month}/${year}`;
}

export default function AdminDashboardPage() {
  const month = new Date().toISOString().slice(0, 7);

  const demoContextQuery = useQuery({
    queryKey: ["demo", "context"],
    queryFn: getDemoContext
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "admin", demoContextQuery.data?.houseId, month],
    queryFn: () => getAdminDashboard(demoContextQuery.data!.houseId, month),
    enabled: Boolean(demoContextQuery.data?.houseId)
  });

  const paymentsQuery = useQuery({
    queryKey: ["payments", demoContextQuery.data?.houseId, "PENDING"],
    queryFn: () => getPayments(demoContextQuery.data!.houseId, "PENDING"),
    enabled: Boolean(demoContextQuery.data?.houseId)
  });

  const expensesQuery = useQuery({
    queryKey: ["expenses", demoContextQuery.data?.houseId, month],
    queryFn: () => getExpenses(demoContextQuery.data!.houseId, month),
    enabled: Boolean(demoContextQuery.data?.houseId)
  });

  const dashboard = dashboardQuery.data;
  const pendingPayments = paymentsQuery.data ?? [];
  const recentExpenses = expensesQuery.data?.slice(0, 4) ?? [];
  const latestSettlement = dashboard?.latestSettlement ?? null;

  const summary = useMemo(() => {
    const totalExpense = Number(dashboard?.totalExpense ?? 0);
    const totalCollected = Number(latestSettlement?.totalPaid ?? 0);
    const totalBills = Number(latestSettlement?.totalExpense ?? 0);
    const remaining = Math.max(totalBills - totalCollected, 0);
    const unpaidMembers =
      latestSettlement?.items.filter((item) => Number(item.netAmount) - Number(item.paidAmount) > 0).length ?? 0;

    return {
      totalExpense,
      totalCollected,
      totalBills,
      remaining,
      unpaidMembers
    };
  }, [dashboard, latestSettlement]);

  if (demoContextQuery.isLoading || dashboardQuery.isLoading || paymentsQuery.isLoading || expensesQuery.isLoading) {
    return <Card>Đang tải dashboard admin...</Card>;
  }

  if (demoContextQuery.error || dashboardQuery.error || paymentsQuery.error || expensesQuery.error || !dashboard) {
    return <Card>Không tải được dashboard admin.</Card>;
  }

  const urgentTasks = [
    summary.remaining > 0
      ? {
          label: `Còn ${currency.format(summary.remaining)} VND cần thu`,
          hint: `${summary.unpaidMembers} thành viên chưa hoàn tất bill`,
          href: "/admin/payments" as Route
        }
      : null,
    pendingPayments.length > 0
      ? {
          label: `${pendingPayments.length} giao dịch đang chờ xác nhận`,
          hint: "Duyệt payment proof để cập nhật bill ngay",
          href: "/admin/payments" as Route
        }
      : null,
    {
      label: "Thêm khoản chi mới",
      hint: "Cập nhật điện, nước, wifi, sửa chữa trong ngày",
      href: "/admin/bills" as Route
    }
  ].filter(Boolean) as Array<{ label: string; hint: string; href: Route }>;

  return (
    <div className="space-y-6 pb-16"> {/* Thêm padding dưới cho thiết bị di động */}
      <PageHeader
        title="Dashboard admin"
        description="Tập trung vào việc cần làm hôm nay: chốt kỳ, thu tiền và xử lý payment proof."
      />

      <Card className="overflow-hidden bg-gradient-to-br from-pine to-ink text-white">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <Badge className="bg-white/15 text-white" variant="secondary">
              {formatMonthKey(latestSettlement?.monthKey ?? month)}
            </Badge>
            <div>
              <h2 className="text-3xl font-semibold">Hôm nay admin cần xử lý 3 việc chính</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/75">
                Cập nhật khoản chi, chốt công nợ kỳ hiện tại và duyệt các thanh toán đang chờ xác nhận.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/admin/bills">
                <Button className="w-full bg-white text-ink hover:bg-white/90">Tạo khoản chi / chốt kỳ</Button>
              </Link>
              <Link href="/admin/payments">
                <Button className="w-full border border-white/20 bg-transparent text-white hover:bg-white/10" variant="ghost">
                  Xác nhận thanh toán
                </Button>
              </Link>
              <Link href="/admin/members">
                <Button className="w-full border border-white/20 bg-transparent text-white hover:bg-white/10" variant="ghost">
                  Quản lý thành viên
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] bg-white/10 p-5 backdrop-blur">
            <p className="text-sm uppercase tracking-[0.18em] text-white/60">Tiến độ kỳ hiện tại</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Tổng cần thu</span>
                <span>{currency.format(summary.totalBills)} VND</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Đã thu</span>
                <span>{currency.format(summary.totalCollected)} VND</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-clay"
                  style={{
                    width:
                      summary.totalBills > 0
                        ? `${Math.min((summary.totalCollected / summary.totalBills) * 100, 100)}%`
                        : "0%"
                  }}
                />
              </div>
              <p className="text-sm text-white/75">
                {summary.unpaidMembers > 0
                  ? `${summary.unpaidMembers} thành viên vẫn còn số dư chưa đóng.`
                  : "Tất cả bill kỳ hiện tại đã được xử lý."}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tổng chi tháng này"
          value={`${currency.format(summary.totalExpense)} VND`}
          hint="Tổng hợp từ các khoản chi đã xác nhận"
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          label="Phòng đang hoạt động"
          value={String(dashboard.rooms)}
          hint="Tổng số phòng đang được quản lý"
          icon={<House className="h-5 w-5" />}
        />
        <StatCard
          label="Bill chưa hoàn tất"
          value={String(summary.unpaidMembers)}
          hint="Thành viên còn dư nợ trong kỳ hiện tại"
          icon={<CircleAlert className="h-5 w-5" />}
        />
        <StatCard
          label="Payment proof"
          value={String(pendingPayments.length)}
          hint="Đang chờ admin xác nhận"
          icon={<CreditCard className="h-5 w-5" />}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Việc cần làm ngay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {urgentTasks.map((task) => (
              <Link
                key={task.label}
                href={task.href}
                className="flex items-center justify-between rounded-2xl border border-black/10 px-4 py-4 transition hover:bg-secondary"
              >
                <div>
                  <p className="font-medium">{task.label}</p>
                  <p className="text-sm text-muted-foreground">{task.hint}</p>
                </div>
                <span className="text-sm font-medium text-pine">Mở nhanh</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phím tắt tác vụ</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3">
            <Link href="/admin/bills" className="rounded-2xl bg-sand px-4 py-4 transition hover:bg-secondary">
              <div className="flex items-center gap-3">
                <ReceiptText className="h-5 w-5 text-pine" />
                <div>
                  <p className="font-medium">Thêm khoản chi</p>
                  <p className="text-sm text-muted-foreground">Nhập hóa đơn và chọn người chia bill</p>
                </div>
              </div>
            </Link>
            <Link href="/admin/payments" className="rounded-2xl bg-sand px-4 py-4 transition hover:bg-secondary">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-pine" />
                <div>
                  <p className="font-medium">Duyệt thanh toán</p>
                  <p className="text-sm text-muted-foreground">Xác nhận proof và đối soát bill</p>
                </div>
              </div>
            </Link>
            <Link href="/admin/rooms" className="rounded-2xl bg-sand px-4 py-4 transition hover:bg-secondary">
              <div className="flex items-center gap-3">
                <House className="h-5 w-5 text-pine" />
                <div>
                  <p className="font-medium">Cập nhật phòng</p>
                  <p className="text-sm text-muted-foreground">Thêm phòng và kiểm tra sức chứa hiện tại</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle>Khoản chi gần đây</CardTitle>
            <Link href="/admin/bills" className="text-sm font-medium text-pine">
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentExpenses.length ? (
              recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{expense.title}</p>
                      <Badge>{expense.category}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(expense.expenseDate).toLocaleDateString("vi-VN")} | {expense.participantCount} người chia
                    </p>
                  </div>
                  <p className="font-semibold">{currency.format(expense.amount)} VND</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Chưa có khoản chi nào trong tháng hiện tại.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trạng thái kỳ hiện tại</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl bg-sand p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{formatMonthKey(latestSettlement?.monthKey ?? month)}</p>
                <Badge variant={summary.remaining > 0 ? "warning" : "success"}>
                  {summary.remaining > 0 ? "Đang thu tiền" : "Đã hoàn tất"}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Kỳ này đã ghi nhận {currency.format(summary.totalBills)} VND tiền bill và {currency.format(summary.totalCollected)} VND đã thu.
              </p>
            </div>

            <div className="rounded-2xl bg-sand p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-pine" />
                <div>
                  <p className="font-medium">Tiến độ thu tiền</p>
                  <p className="text-sm text-muted-foreground">
                    {summary.totalBills > 0
                      ? `${Math.round((summary.totalCollected / summary.totalBills) * 100)}% bill đã được thanh toán`
                      : "Chưa có settlement cho kỳ này"}
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
