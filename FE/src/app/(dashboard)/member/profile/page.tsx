"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyPaymentAccount, saveMyPaymentAccount } from "@/features/payments/api";
import { uploadImage } from "@/features/uploads/api";
import { useAuthSession } from "@/lib/auth/use-auth-session";
import { useToast } from "@/lib/toast/toast-context";

export default function MemberProfilePage() {
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
    queryKey: ["payments", "account", "me", session?.houseId ?? "no-house"],
    queryFn: () => getMyPaymentAccount(session!.houseId!),
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
        throw new Error("Tài khoản hiện tại chưa được gắn vào nhà trọ.");
      }

      let nextStaticQrImageUrl = staticQrImageUrl || undefined;
      if (qrFile) {
        const uploaded = await uploadImage(qrFile);
        nextStaticQrImageUrl = uploaded.url;
      }

      return saveMyPaymentAccount({
        houseId: session.houseId,
        accountName: accountName.trim() || session.fullName,
        bankName,
        bankBin,
        accountNumber,
        staticQrImageUrl: nextStaticQrImageUrl,
      });
    },
    onSuccess: async () => {
      setQrFile(null);
      await queryClient.invalidateQueries({
        queryKey: ["payments", "account", "me", session?.houseId ?? "no-house"],
      });
      showToast("Đã lưu QR nhận tiền cá nhân.", "success");
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "Không lưu được QR nhận tiền.", "error");
    },
  });

  if (!session) {
    return <Card>Đang tải thông tin cá nhân...</Card>;
  }

  if (!session.houseId) {
    return (
      <Card>
        Tài khoản hiện tại chưa được gắn vào nhà trọ. Khi chủ trọ thêm bạn vào nhà, bạn sẽ có thể cấu hình QR
        nhận tiền tại đây.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thông tin cá nhân"
        description="Cấu hình QR nhận tiền cá nhân để khi người khác nợ bạn, hệ thống hiển thị đúng mã QR của bạn."
      />

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tài khoản hiện tại</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-2xl bg-secondary px-4 py-3">
              <p className="text-muted-foreground">Họ tên</p>
              <p className="font-medium text-foreground">{session.fullName}</p>
            </div>
            <div className="rounded-2xl bg-secondary px-4 py-3">
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium text-foreground">{session.email}</p>
            </div>
            <div className="rounded-2xl bg-secondary px-4 py-3 text-muted-foreground">
              Khi bạn là người ứng tiền trước cho hóa đơn chung, hệ thống sẽ dùng thông tin bên phải để hiển thị QR
              thanh toán cho người còn nợ bạn.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QR nhận tiền cá nhân</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="accountName">Tên chủ tài khoản</Label>
                <Input
                  id="accountName"
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  placeholder={session.fullName}
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
                  {qrFile ? `Đã chọn: ${qrFile.name}` : "Có thể bỏ trống nếu bạn dùng VietQR động."}
                </p>
              </div>
            </div>

            {previewQrImageUrl ? (
              <div className="space-y-3 rounded-2xl bg-secondary p-4">
                <img
                  src={previewQrImageUrl}
                  alt="QR nhận tiền cá nhân"
                  className="mx-auto w-full max-w-xs rounded-2xl border border-black/10 bg-white p-3"
                />
                <p className="text-sm text-muted-foreground">
                  Đây là QR sẽ hiện cho người đang nợ bạn trong chi tiết hóa đơn.
                </p>
              </div>
            ) : null}

            <Button
              className="w-full"
              disabled={saveMutation.isPending || paymentAccountQuery.isLoading}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Đang lưu cấu hình..." : "Lưu QR nhận tiền cá nhân"}
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
