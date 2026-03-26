import { MemberBillsList } from '@/components/bills/member-bills-list';
import { PageHeader } from '@/components/shared/page-header';

export default function MemberBillsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Hóa đơn của tôi" description="Danh sách công nợ theo kỳ và trạng thái thanh toán hiện tại." />
      <MemberBillsList />
    </div>
  );
}
