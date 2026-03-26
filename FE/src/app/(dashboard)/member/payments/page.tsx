import { PaymentUploadCard } from "@/components/payments/payment-upload-card";
import { PageHeader } from "@/components/shared/page-header";

export default function MemberPaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Thanh toán" description="Quét QR, upload ảnh chuyển khoản hoặc nhập mã giao dịch." />
      <PaymentUploadCard />
    </div>
  );
}
