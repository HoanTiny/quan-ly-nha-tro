import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PaymentUploadCard() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Quét QR / Upload minh chứng</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed bg-secondary text-sm text-muted-foreground">
          Khu vực hiển thị QR hoặc xem trước ảnh biên lai
        </div>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="transaction-code">Mã giao dịch</Label>
            <Input id="transaction-code" placeholder="NAPAS-123456789" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-proof">Ảnh minh chứng</Label>
            <Input id="payment-proof" type="file" />
          </div>
        </div>
        <div className="flex gap-3">
          <Button>Gửi xác nhận</Button>
          <Button variant="outline">Lưu tạm</Button>
        </div>
      </CardContent>
    </Card>
  );
}
