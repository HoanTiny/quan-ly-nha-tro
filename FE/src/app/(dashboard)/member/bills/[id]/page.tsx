import { MemberBillDetail } from "@/components/bills/member-bill-detail";
import { PageHeader } from "@/components/shared/page-header";

type MemberBillDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MemberBillDetailPage({ params }: MemberBillDetailPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chi tiết hóa đơn"
        description="Thông tin tiền phòng, điện nước và hành động thanh toán."
      />
      <MemberBillDetail billId={id} />
    </div>
  );
}
