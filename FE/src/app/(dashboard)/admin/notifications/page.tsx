import { NotificationList } from "@/components/notifications/notification-list";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Thông báo" description="Xem lịch sử gửi thông báo và nhắc nợ cho thành viên." />
      <NotificationList />
    </div>
  );
}
