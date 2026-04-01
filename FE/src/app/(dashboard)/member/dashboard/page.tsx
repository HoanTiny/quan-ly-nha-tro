"use client";

import Link from "next/link";
import type { Route } from "next";
import { Bell, CreditCard, FileText, QrCode, Wallet } from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBills } from "@/features/bills/api";
import { getMemberDashboard } from "@/features/dashboard/api";
import type { Bill } from "@/types/domain";
import { useAuthSession } from "@/lib/auth/use-auth-session";

const currency = new Intl.NumberFormat("vi-VN");

function monthLabel(monthKey?: string) {
  if (!monthKey) {
    return "Kỳ hiện tại";
  }

  const [year, month] = monthKey.split("-");
  return `Tháng ${month}/${year}`;
}

function periodLabel(bill?: Pick<Bill, "periodLabel" | "month" | "year"> | null) {
  if (bill?.periodLabel) {
    return bill.periodLabel;
  }

  if (bill?.month && bill?.year) {
    return `Kỳ ${bill.month}/${bill.year}`;
  }

  return "Kỳ hiện tại";
}

export default function MemberDashboardPage() {
  const month = new Date().toISOString().slice(0, 7);
  const session = useAuthSession();

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "member", session?.userId, month],
    queryFn: () => getMemberDashboard(session!.userId, month),
    enabled: Boolean(session?.userId),
  });

  const billsQuery = useQuery({
    queryKey: ["bills", session?.userId, month],
    queryFn: () => getBills({ userId: session!.userId, month }),
    enabled: Boolean(session?.userId),
  });

  const dashboard = dashboardQuery.data;
  const bills = useMemo(() => billsQuery.data ?? [], [billsQuery.data]);
  const activeBill = bills.find((bill) => (bill.balance ?? 0) > 0) ?? bills[0] ?? null;

  const summary = useMemo(() => {
    const openBills = bills.filter((bill) => (bill.balance ?? 0) > 0);
    const totalDue = Number(dashboard?.currentDue ?? 0);

    return {
      totalDue,
      openBills,
      newestNotifications: dashboard?.notifications?.slice(0, 3) ?? [],
    };
  }, [bills, dashboard]);

  if (!session || dashboardQuery.isLoading || billsQuery.isLoading) {
    return <Card>Đang tải dashboard thành viên...</Card>;
  }

  if (dashboardQuery.error || billsQuery.error || !dashboard) {
    return <Card>Không tải được dashboard thành viên.</Card>;
  }

  const heroCta: Route = activeBill ? (`/member/bills/${activeBill.id}` as Route) : "/member/bills";

  return (
    <div className="space-y-6 pb-16"> {/* Thêm padding dưới cho thiết bị di động */}
      <PageHeader
        title="Tổng quan thành viên"
        description="Vào là thấy ngay cần đóng bao nhiêu, vì sao phải đóng và cách thanh toán nhanh nhất."
      />

      <Card className="overflow-hidden bg-gradient-to-br from-ink to-pine text-white">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <Badge className="bg-white/15 text-white" variant="secondary">
              {activeBill ? periodLabel(activeBill) : monthLabel(month)}
            </Badge>
            <div>
              <h2 className="text-3xl font-semibold">
                {summary.totalDue > 0
                  ? `Bạn còn ${currency.format(summary.totalDue)} VND cần thanh toán`
                  : "Kỳ này bạn đã hoàn tất thanh toán"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-white/75">
                Xem bill, kiểm tra chi tiết từng khoản chi và gửi minh chứng thanh toán ngay trên một luồng ngắn.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={heroCta}>
                <Button className="w-full bg-white text-ink hover:bg-white/90">
                  {summary.totalDue > 0 ? "Xem bill và thanh toán" : "Xem lịch sử bill"}
                </Button>
              </Link>
              <Link href="/member/bills">
                <Button className="w-full border border-white/20 bg-transparent text-white hover:bg-white/10" variant="ghost">
                  Tất cả bill
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] bg-white/10 p-5 backdrop-blur">
            <p className="text-sm uppercase tracking-[0.18em] text-white/60">3 bước nhanh</p>
            <div className="mt-4 space-y-3 text-sm text-white/80">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="font-medium text-white">1. Xem tổng bill</p>
                <p className="mt-1">Kiểm tra số tiền, hạn đóng và danh sách khoản chi.</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="font-medium text-white">2. Quét QR hoặc chuyển khoản</p>
                <p className="mt-1">Sử dụng QR có sẵn trong chi tiết bill để thanh toán nhanh.</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="font-medium text-white">3. Gửi minh chứng</p>
                <p className="mt-1">Upload ảnh biên lai để admin xác nhận ngay trên hệ thống.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Cần đóng"
          value={`${currency.format(summary.totalDue)} VND`}
          hint={activeBill ? `Hạn đóng ${new Date(activeBill.dueDate).toLocaleDateString("vi-VN")}` : "Không có bill mở"}
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          label="Bill đang mở"
          value={String(summary.openBills.length)}
          hint="Số bill vẫn còn số dư cần thanh toán"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          label="Thông báo mới"
          value={String(summary.newestNotifications.length)}
          hint="Thông báo gần đây liên quan đến bill và thanh toán"
          icon={<Bell className="h-5 w-5" />}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle>Bill cần xử lý ngay</CardTitle>
            <Link href="/member/bills" className="text-sm font-medium text-pine">
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.openBills.length ? (
              summary.openBills.map((bill) => (
                <Link
                  key={bill.id}
                  href={`/member/bills/${bill.id}` as Route}
                  className="flex items-center justify-between rounded-2xl border border-black/10 px-4 py-4 transition hover:bg-secondary"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{bill.roomName || "Phòng của bạn"}</p>
                      <Badge variant={bill.status === "overdue" ? "destructive" : "warning"}>{bill.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {periodLabel(bill)} | Hạn đóng {new Date(bill.dueDate).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{currency.format(bill.balance ?? 0)} VND</p>
                    <p className="text-sm text-pine">Thanh toán ngay</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Hiện tại bạn không có bill nào đang mở.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thao tác nhanh</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3">
            <Link href={heroCta} className="rounded-2xl bg-sand px-4 py-4 transition hover:bg-secondary">
              <div className="flex items-center gap-3">
                <QrCode className="h-5 w-5 text-pine" />
                <div>
                  <p className="font-medium">Mở QR thanh toán</p>
                  <p className="text-sm text-muted-foreground">Vào thẳng bill đang mở gần nhất để tạo QR sẵn</p>
                </div>
              </div>
            </Link>
            <Link href="/member/payments" className="rounded-2xl bg-sand px-4 py-4 transition hover:bg-secondary">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-pine" />
                <div>
                  <p className="font-medium">Gửi minh chứng</p>
                  <p className="text-sm text-muted-foreground">Upload ảnh biên lai sau khi chuyển khoản</p>
                </div>
              </div>
            </Link>
            <Link href="/member/notifications" className="rounded-2xl bg-sand px-4 py-4 transition hover:bg-secondary">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-pine" />
                <div>
                  <p className="font-medium">Xem thông báo</p>
                  <p className="text-sm text-muted-foreground">Theo dõi nhắc nợ và xác nhận thanh toán</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tiến độ bill hiện tại</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeBill ? (
              <>
                <div className="rounded-2xl bg-sand p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{periodLabel(activeBill)}</p>
                    <Badge variant={(activeBill.balance ?? 0) > 0 ? "warning" : "success"}>
                      {(activeBill.balance ?? 0) > 0 ? "Cần xử lý" : "Đã hoàn tất"}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Tổng bill</span>
                      <span>{currency.format(activeBill.amount)} VND</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Đã đóng</span>
                      <span>{currency.format(activeBill.totalPaid ?? 0)} VND</span>
                    </div>
                    <div className="flex items-center justify-between font-medium text-foreground">
                      <span>Còn lại</span>
                      <span>{currency.format(activeBill.balance ?? 0)} VND</span>
                    </div>
                  </div>
                </div>
                <Link href={heroCta}>
                  <Button className="w-full">Mở chi tiết bill này</Button>
                </Link>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Chưa có bill nào để hiển thị trong dashboard.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thông báo gần đây</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.newestNotifications.length ? (
              summary.newestNotifications.map((notification) => (
                <div key={notification.id} className="rounded-2xl border border-black/10 p-4">
                  <p className="font-medium">{notification.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Chưa có thông báo mới.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
