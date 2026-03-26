import { NotificationList } from "@/components/notifications/notification-list";
import { PageHeader } from "@/components/shared/page-header";

export default function MemberNotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Thông báo" description="Lịch sử bill, nhắc nợ và cập nhật thanh toán." />
      <NotificationList />
    </div>
  );
}
