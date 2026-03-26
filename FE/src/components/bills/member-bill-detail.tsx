"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBillById } from "@/features/bills/api";
import { submitPaymentProof } from "@/features/payments/api";
import { uploadImage } from "@/features/uploads/api";
import { useAuthSession } from "@/lib/auth/use-auth-session";
import { queryKeys } from "@/lib/query/query-keys";
import { useToast } from "@/lib/toast/toast-context";
import { BillStatusBadge } from "./bill-status-badge";

type MemberBillDetailProps = {
  billId: string;
};

function getPaymentStatusLabel(status: string) {
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

function getCategoryLabel(category: string) {
  switch (category) {
    case "ELECTRIC":
      return "Điện";
    case "WATER":
      return "Nước";
    case "INTERNET":
      return "Internet";
    case "RENT":
      return "Tiền phòng";
    case "REPAIR":
      return "Sửa chữa";
    case "SHARED_FOOD":
      return "Ăn uống";
    case "OTHER":
      return "Khác";
    default:
      return category;
  }
}

export function MemberBillDetail({ billId }: MemberBillDetailProps) {
  const [selectedPayeeUserId, setSelectedPayeeUserId] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const queryClient = useQueryClient();
  const session = useAuthSession();
  const { showToast } = useToast();

  const billQuery = useQuery({
    queryKey: queryKeys.bills.detail(billId),
    queryFn: () => getBillById(billId),
  });

  const payees = useMemo(() => billQuery.data?.payees ?? [], [billQuery.data?.payees]);

  useEffect(() => {
    if (!payees.length) {
      setSelectedPayeeUserId("");
      return;
    }

    if (payees.some((payee) => payee.userId === selectedPayeeUserId)) {
      return;
    }

    const defaultPayee = payees.find((payee) => payee.balance > 0) ?? payees[0];
    setSelectedPayeeUserId(defaultPayee.userId);
  }, [payees, selectedPayeeUserId]);

  const selectedPayee = useMemo(
    () => payees.find((payee) => payee.userId === selectedPayeeUserId) ?? null,
    [payees, selectedPayeeUserId],
  );

  const selectedPayments = useMemo(() => {
    if (!selectedPayee) {
      return [];
    }

    return (billQuery.data?.payments ?? []).filter(
      (payment) => payment.payeeUserId === selectedPayee.userId,
    );
  }, [billQuery.data?.payments, selectedPayee]);

  const pendingPayment = useMemo(
    () => selectedPayments.find((payment) => payment.status === "PENDING") ?? null,
    [selectedPayments],
  );

  const proofMutation = useMutation({
    mutationFn: async () => {
      if (!session?.userId) {
        throw new Error("Bạn cần đăng nhập lại để gửi minh chứng.");
      }

      if (!selectedPayee) {
        throw new Error("Hãy chọn người nhận tiền trước khi gửi minh chứng.");
      }

      if (selectedPayee.balance <= 0) {
        throw new Error("Khoản nợ với người này đã được thanh toán xong.");
      }

      let proofUrl: string | undefined;

      if (receiptFile) {
        const uploaded = await uploadImage(receiptFile);
        proofUrl = uploaded.url;
      }

      return submitPaymentProof({
        settlementLineId: billId,
        payerUserId: session.userId,
        payeeUserId: selectedPayee.userId,
        amount: selectedPayee.balance,
        gateway: "MANUAL",
        transactionRef,
        proofUrl,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.bills.detail(billId) }),
        queryClient.invalidateQueries({ queryKey: ["bills"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
      setTransactionRef("");
      setReceiptFile(null);
      setFeedback({
        type: "success",
        message: selectedPayee
          ? `Đã gửi minh chứng thanh toán cho ${selectedPayee.fullName}. Bạn chỉ cần đợi xác nhận.`
          : "Đã gửi minh chứng thanh toán thành công.",
      });
      showToast("Đã gửi minh chứng thanh toán thành công.", "success");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Gửi minh chứng thất bại.";
      showToast(message, "error");
      setFeedback({
        type: "error",
        message: message.includes("pending confirmation")
          ? "Bạn đã gửi minh chứng rồi. Hệ thống đang chờ xác nhận."
          : message,
      });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    proofMutation.mutate();
  };

  if (billQuery.isLoading || !session) {
    return <Card>Đang tải chi tiết hóa đơn...</Card>;
  }

  if (billQuery.error || !billQuery.data) {
    return <Card>Không tìm thấy hóa đơn.</Card>;
  }

  const bill = billQuery.data;
  const canSubmitProof = Boolean(selectedPayee && selectedPayee.balance > 0 && !pendingPayment);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>{bill.periodLabel ?? `Kỳ ${bill.month}/${bill.year}`}</CardTitle>
            <p className="mt-1 text-sm text-black/55">{bill.roomName}</p>
          </div>
          <BillStatusBadge status={bill.status} />
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm">
            {bill.items.map((item) => (
              <div key={item.expenseId} className="flex justify-between gap-3 rounded-2xl bg-secondary px-4 py-3">
                <div className="space-y-2">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.expenseDate).toLocaleDateString("vi-VN")} | {getCategoryLabel(item.category)}
                  </p>
                  {item.receiptImageUrl ? (
                    <a
                      href={item.receiptImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-pine"
                    >
                      Xem hóa đơn gốc
                    </a>
                  ) : null}
                </div>
                <span className="shrink-0 font-medium text-foreground">
                  {item.shareAmount.toLocaleString("vi-VN")} VND
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-pine px-4 py-4 text-white">
            <div className="flex justify-between">
              <span>Tổng hóa đơn</span>
              <span>{bill.amount.toLocaleString("vi-VN")} VND</span>
            </div>
            <div className="mt-2 flex justify-between text-white/80">
              <span>Đã đóng</span>
              <span>{(bill.totalPaid ?? 0).toLocaleString("vi-VN")} VND</span>
            </div>
            <div className="mt-2 flex justify-between text-lg font-semibold">
              <span>Còn lại</span>
              <span>{(bill.balance ?? 0).toLocaleString("vi-VN")} VND</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Bạn đang nợ những ai?</CardTitle>
            <p className="text-sm text-muted-foreground">
              Chọn một người để xem chi tiết khoản nợ, QR và lịch sử thanh toán tương ứng.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-secondary px-4 py-3 text-sm">
                <p className="text-muted-foreground">Số người cần thanh toán</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{payees.length}</p>
              </div>
              <div className="rounded-2xl bg-secondary px-4 py-3 text-sm">
                <p className="text-muted-foreground">Người đang xem</p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {selectedPayee?.fullName ?? "Chưa chọn"}
                </p>
              </div>
            </div>

            {payees.length ? (
              payees.map((payee) => {
                const isSelected = selectedPayeeUserId === payee.userId;

                return (
                  <button
                    key={payee.userId}
                    type="button"
                    onClick={() => setSelectedPayeeUserId(payee.userId)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      isSelected ? "border-pine bg-pine/5 shadow-sm" : "border-black/10 bg-white hover:bg-black/[0.02]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{payee.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          Còn nợ {payee.balance.toLocaleString("vi-VN")} VND
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {payee.amount.toLocaleString("vi-VN")} VND
                        </p>
                        <p className="mt-1 text-xs font-medium text-pine">
                          {isSelected ? "Đang xem chi tiết" : "Bấm để xem chi tiết"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Chưa có dữ liệu người nhận tiền cho hóa đơn này.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedPayee ? `Chi tiết thanh toán cho ${selectedPayee.fullName}` : "Chi tiết thanh toán"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPayee ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-secondary px-4 py-3 text-sm">
                  <p className="font-medium text-foreground">Thông tin người nhận</p>
                  <p className="mt-2 text-muted-foreground">
                    {selectedPayee.receiverName ?? selectedPayee.fullName}
                    {selectedPayee.bankName ? ` | ${selectedPayee.bankName}` : ""}
                    {selectedPayee.accountNumber ? ` | ${selectedPayee.accountNumber}` : ""}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Còn lại: {selectedPayee.balance.toLocaleString("vi-VN")} VND
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-2xl bg-sand/80 p-4">
                    <p className="font-medium text-foreground">Các khoản thuộc về {selectedPayee.fullName}</p>
                    <div className="mt-3 space-y-2">
                      {selectedPayee.items.map((item) => (
                        <div
                          key={`${selectedPayee.userId}-${item.expenseId}`}
                          className="flex items-start justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm"
                        >
                          <div>
                            <p className="font-medium text-foreground">{item.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {getCategoryLabel(item.category)} •{" "}
                              {new Date(item.expenseDate).toLocaleDateString("vi-VN")}
                            </p>
                            {item.receiptImageUrl ? (
                              <a
                                href={item.receiptImageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex text-xs font-medium text-pine underline"
                              >
                                Xem hóa đơn gốc
                              </a>
                            ) : null}
                          </div>
                          <span className="shrink-0 font-medium text-foreground">
                            {item.shareAmount.toLocaleString("vi-VN")} VND
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-sand/80 p-4">
                    <p className="font-medium text-foreground">QR thanh toán</p>
                    {selectedPayee.qrImageUrl ? (
                      <div className="mt-3 space-y-3">
                        <img
                          src={selectedPayee.qrImageUrl}
                          alt={`QR thanh toán cho ${selectedPayee.fullName}`}
                          className="mx-auto w-full max-w-[240px] rounded-2xl border border-black/10 bg-white p-3"
                        />
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Nội dung chuyển khoản: {selectedPayee.transferContent}</p>
                          <p>Số tiền: {selectedPayee.balance.toLocaleString("vi-VN")} VND</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-dashed bg-white px-4 py-5 text-sm text-muted-foreground">
                        Người này chưa cấu hình QR riêng. Bạn vẫn có thể chuyển khoản thủ công bằng đúng nội dung:
                        <p className="mt-2 font-medium text-foreground">{selectedPayee.transferContent}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Hãy chọn một người ở bên trên để xem chi tiết thanh toán.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gửi minh chứng thanh toán</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {feedback ? (
              <div
                className={
                  feedback.type === "success"
                    ? "rounded-2xl bg-success px-4 py-3 text-sm text-pine"
                    : "rounded-2xl bg-destructive px-4 py-3 text-sm text-coral"
                }
              >
                {feedback.message}
              </div>
            ) : null}

            {selectedPayee ? (
              <div className="rounded-2xl bg-secondary px-4 py-3 text-sm">
                <p className="font-medium text-foreground">Đang thanh toán cho: {selectedPayee.fullName}</p>
                <p className="mt-1 text-muted-foreground">
                  Còn lại: {selectedPayee.balance.toLocaleString("vi-VN")} VND
                </p>
                <p className="mt-1 text-muted-foreground">Nội dung CK: {selectedPayee.transferContent}</p>
              </div>
            ) : null}

            {pendingPayment ? (
              <div className="rounded-2xl bg-warning px-4 py-3 text-sm text-ink">
                Bạn đã gửi minh chứng thanh toán cho {selectedPayee?.fullName}
                {pendingPayment.transactionRef ? ` (${pendingPayment.transactionRef})` : ""}. Hệ thống đang chờ xác
                nhận, không cần gửi lại.
              </div>
            ) : null}

            {(bill.balance ?? 0) <= 0 ? (
              <div className="rounded-2xl bg-success px-4 py-3 text-sm text-pine">
                Hóa đơn này đã được xác nhận thanh toán xong.
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="transactionRef">Mã giao dịch</Label>
                <Input
                  id="transactionRef"
                  value={transactionRef}
                  onChange={(event) => setTransactionRef(event.target.value)}
                  placeholder="NAPAS-123456"
                  disabled={!canSubmitProof || proofMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proofUrl">Ảnh biên lai</Label>
                <Input
                  id="proofUrl"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
                  disabled={!canSubmitProof || proofMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  {receiptFile ? `Đã chọn: ${receiptFile.name}` : "Chưa chọn ảnh minh chứng."}
                </p>
              </div>

              <Button className="w-full" type="submit" disabled={!canSubmitProof || proofMutation.isPending}>
                {proofMutation.isPending
                  ? "Đang gửi minh chứng..."
                  : pendingPayment
                    ? "Đang chờ xác nhận"
                    : (bill.balance ?? 0) <= 0
                      ? "Hóa đơn đã hoàn tất"
                      : "Gửi xác nhận thanh toán"}
              </Button>
            </form>

            {selectedPayments.length ? (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">Lịch sử gửi cho {selectedPayee?.fullName}</p>
                {selectedPayments.map((payment) => (
                  <div key={payment.id} className="rounded-2xl bg-secondary px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">
                        {payment.amount.toLocaleString("vi-VN")} VND - {getPaymentStatusLabel(payment.status)}
                      </p>
                      {payment.proofUrl ? (
                        <a href={payment.proofUrl} target="_blank" className="text-pine underline" rel="noreferrer">
                          Xem ảnh
                        </a>
                      ) : null}
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {payment.transactionRef ? `Mã GD: ${payment.transactionRef}` : "Chưa có mã giao dịch"}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
