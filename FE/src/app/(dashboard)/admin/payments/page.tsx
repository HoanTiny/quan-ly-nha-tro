"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { confirmPayment, getPayments } from "@/features/payments/api";
import { useAuthSession } from "@/lib/auth/use-auth-session";
import { useToast } from "@/lib/toast/toast-context";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const currency = new Intl.NumberFormat("vi-VN");

function getBadgeVariant(status: string) {
  if (status === "SUCCEEDED") {
    return "success" as const;
  }

  if (status === "FAILED" || status === "CANCELLED") {
    return "destructive" as const;
  }

  return "warning" as const;
}

function getStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Đang chờ xác nhận";
    case "SUCCEEDED":
      return "Đã xác nhận";
    case "FAILED":
      return "Thất bại";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status;
  }
}

export default function AdminPaymentsPage() {
  const session = useAuthSession();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState("");

  const paymentsQuery = useQuery({
    queryKey: ["payments", session?.houseId ?? "no-house", statusFilter],
    queryFn: () => getPayments(session!.houseId!, statusFilter || undefined),
    enabled: Boolean(session?.houseId),
  });

  const confirmMutation = useMutation({
    mutationFn: confirmPayment,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
        queryClient.invalidateQueries({ queryKey: ["bills"] }),
      ]);
      showToast("Đã xác nhận thanh toán thành công.", "success");
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "Không xác nhận được thanh toán.", "error");
    },
  });

  const summary = useMemo(() => {
    const payments = paymentsQuery.data ?? [];

    return {
      pending: payments.filter((payment) => payment.status === "PENDING").length,
      succeeded: payments.filter((payment) => payment.status === "SUCCEEDED").length,
      total: payments.reduce((sum, payment) => sum + payment.amount, 0),
    };
  }, [paymentsQuery.data]);

  if (!session) {
    return <Card>Đang tải giao dịch thanh toán...</Card>;
  }

  if (!session.houseId) {
    return <Card>Tài khoản hiện tại chưa có nhà trọ để quản lý giao dịch.</Card>;
  }

  if (paymentsQuery.isLoading) {
    return <Card>Đang tải giao dịch thanh toán...</Card>;
  }

  if (paymentsQuery.error) {
    return <Card>Không tải được danh sách thanh toán.</Card>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Xác nhận thanh toán"
        description="Duyệt minh chứng chuyển khoản, xem người nhận tiền và cập nhật trạng thái đã thu."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-muted-foreground">Chờ xác nhận</p>
          <p className="mt-2 text-3xl font-semibold">{summary.pending}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Đã xác nhận</p>
          <p className="mt-2 text-3xl font-semibold">{summary.succeeded}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Tổng giao dịch</p>
          <p className="mt-2 text-3xl font-semibold">{currency.format(summary.total)} VND</p>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Danh sách giao dịch</CardTitle>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-xl border bg-background px-3 py-2 text-sm"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Đang chờ xác nhận</option>
            <option value="SUCCEEDED">Đã xác nhận</option>
            <option value="FAILED">Thất bại</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentsQuery.data?.length ? (
            paymentsQuery.data.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-black/10 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{payment.memberName ?? "Thành viên"}</p>
                      <Badge variant={getBadgeVariant(payment.status)}>{getStatusLabel(payment.status)}</Badge>
                      <Badge>{payment.gateway}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {payment.roomName || "Chưa xếp phòng"} | Kỳ{" "}
                      {payment.monthKey ? payment.monthKey.replace("-", "/") : "--"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Người nhận tiền: {payment.payeeName ?? "QR mặc định của nhà trọ"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Mã GD: {payment.transactionRef || "Chưa nhập"} | Thời điểm{" "}
                      {payment.paidAt ? new Date(payment.paidAt).toLocaleString("vi-VN") : "đang chờ xử lý"}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <p className="text-lg font-semibold">{currency.format(payment.amount)} VND</p>
                    {payment.proofUrl ? (
                      <Link className="text-sm font-medium text-pine" href={payment.proofUrl} target="_blank">
                        Mở minh chứng
                      </Link>
                    ) : (
                      <p className="text-sm text-muted-foreground">Không có ảnh minh chứng</p>
                    )}
                    <Button
                      variant="outline"
                      disabled={payment.status !== "PENDING" || confirmMutation.isPending}
                      onClick={() => confirmMutation.mutate(payment.id)}
                    >
                      Xác nhận đã thanh toán
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
              Chưa có giao dịch nào phù hợp bộ lọc hiện tại.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
