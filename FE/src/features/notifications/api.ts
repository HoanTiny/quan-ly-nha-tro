import { apiClient } from "@/lib/api/client";
import type { AppNotification } from "@/types/domain";

export async function getNotifications() {
  return apiClient.get<AppNotification[]>("/notifications");
}

export async function markNotificationRead(notificationId: string) {
  return apiClient.patch(`/notifications/${notificationId}/read`);
}
