"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPaymentAccount, savePaymentAccount } from "@/features/payments/api";
import { uploadImage } from "@/features/uploads/api";
import { useAuthSession } from "@/lib/auth/use-auth-session";
import { queryKeys } from "@/lib/query/query-keys";
import { useToast } from "@/lib/toast/toast-context";
import { Lock } from "lucide-react";

export default function AdminSettingsPage() {
  const session = useAuthSession();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBin, setBankBin] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [staticQrImageUrl, setStaticQrImageUrl] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);

  const paymentAccountQuery = useQuery({
    queryKey: queryKeys.payments.account(session?.houseId),
    queryFn: () => getPaymentAccount(session!.houseId!),
    enabled: Boolean(session?.houseId),
  });

  useEffect(() => {
    if (!paymentAccountQuery.data) {
      return;
    }

    setAccountName(paymentAccountQuery.data.accountName ?? "");
    setBankName(paymentAccountQuery.data.bankName ?? "");
    setBankBin(paymentAccountQuery.data.bankBin ?? "");
    setAccountNumber(paymentAccountQuery.data.accountNumber ?? "");
    setStaticQrImageUrl(paymentAccountQuery.data.staticQrImageUrl ?? "");
  }, [paymentAccountQuery.data]);

  const previewQrImageUrl = useMemo(() => {
    if (qrFile) {
      return URL.createObjectURL(qrFile);
    }

    return paymentAccountQuery.data?.previewQrImageUrl ?? staticQrImageUrl ?? null;
  }, [paymentAccountQuery.data?.previewQrImageUrl, qrFile, staticQrImageUrl]);

  useEffect(() => {
    return () => {
      if (qrFile && previewQrImageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewQrImageUrl);
      }
    };
  }, [previewQrImageUrl, qrFile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session?.houseId) {
        throw new Error("Tài khoản hiện tại chưa có nhà trọ để cấu hình.");
      }

      let nextStaticQrImageUrl = staticQrImageUrl || undefined;
      if (qrFile) {
        const uploaded = await uploadImage(qrFile);
        nextStaticQrImageUrl = uploaded.url;
      }

      return savePaymentAccount({
        houseId: session.houseId,
        accountName,
        bankName,
        bankBin,
        accountNumber,
        staticQrImageUrl: nextStaticQrImageUrl,
      });
    },
    onSuccess: async () => {
      setQrFile(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.account(session?.houseId) }),
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
      ]);
      showToast("Đã lưu cấu hình nhận tiền và QR thanh toán.", "success");
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "Không lưu được cấu hình nhận tiền.", "error");
    },
  });

  if (!session) {
    return <Card>Đang tải cấu hình nhà trọ...</Card>;
  }

  if (!session.houseId) {
    return <Card>Tài khoản hiện tại chưa có nhà trọ để cấu hình nhận tiền.</Card>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cài đặt nhà trọ"
        description="Cấu hình tài khoản nhận tiền để thành viên quét QR hoặc chuyển khoản nhanh ngay trong bill."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tài khoản nhận tiền</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-sand/70 p-4 text-sm leading-6 text-black/65 md:col-span-2">
              Cách dễ tích hợp nhất hiện tại là VietQR. Nếu bạn nhập đúng mã ngân hàng và số tài khoản,
              hệ thống sẽ tự tạo QR động theo từng bill. Bạn cũng có thể upload ảnh QR tĩnh để dùng
              làm phương án dự phòng.
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="accountName">Tên chủ tài khoản</Label>
              <Input
                id="accountName"
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                placeholder="NGUYEN VAN A"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankName">Tên ngân hàng</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
                placeholder="MB Bank"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankBin">Mã ngân hàng VietQR</Label>
              <Input
                id="bankBin"
                value={bankBin}
                onChange={(event) => setBankBin(event.target.value)}
                placeholder="970422"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="accountNumber">Số tài khoản</Label>
              <Input
                id="accountNumber"
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
                placeholder="123456789"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="staticQrImage">Ảnh QR tĩnh dự phòng</Label>
              <Input
                id="staticQrImage"
                type="file"
                accept="image/*"
                onChange={(event) => setQrFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                {qrFile ? `Đã chọn: ${qrFile.name}` : "Có thể bỏ trống nếu chỉ dùng VietQR động."}
              </p>
            </div>

            <Button
              className="md:col-span-2"
              disabled={saveMutation.isPending || paymentAccountQuery.isLoading}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Đang lưu cấu hình..." : "Lưu cấu hình nhận tiền"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Xem trước QR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentAccountQuery.isLoading ? (
              <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Đang tải cấu hình QR...
              </div>
            ) : previewQrImageUrl ? (
              <div className="space-y-3">
                <img
                  src={previewQrImageUrl}
                  alt="Xem trước QR nhận tiền"
                  className="mx-auto w-full max-w-sm rounded-2xl border border-black/10 bg-white p-3"
                />
                <div className="rounded-2xl bg-secondary p-4 text-sm text-muted-foreground">
                  Khi thành viên mở bill, hệ thống sẽ tự gắn đúng số tiền và nội dung chuyển khoản nếu
                  bạn đã nhập đủ thông tin VietQR.
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Chưa có QR để xem trước. Hãy nhập thông tin VietQR hoặc upload ảnh QR tĩnh.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Settings Links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer transition hover:shadow-md">
          <CardContent className="pt-6">
            <Link href="/admin/change-password" className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Đổi mật khẩu</h3>
                <p className="text-sm text-muted-foreground">
                  Thay đổi mật khẩu đăng nhập
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
