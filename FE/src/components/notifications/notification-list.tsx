"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getNotifications, markNotificationRead } from "@/features/notifications/api";
import { queryKeys } from "@/lib/query/query-keys";
import { useToast } from "@/lib/toast/toast-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NotificationList() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: getNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "Không đánh dấu đã đọc được.", "error");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Danh sách thông báo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notificationsQuery.isLoading ? (
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Đang tải thông báo...
          </div>
        ) : notificationsQuery.error ? (
          <div className="rounded-xl border p-4 text-sm text-coral">
            Không tải được thông báo.
          </div>
        ) : !notificationsQuery.data?.length ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Chưa có thông báo nào.
          </div>
        ) : (
          notificationsQuery.data.map((notification) => (
            <div key={notification.id} className="rounded-xl border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{notification.title}</p>
                    <Badge variant={notification.read ? "secondary" : "warning"}>
                      {notification.read ? "Đã đọc" : "Mới"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>

                {!notification.read ? (
                  <Button
                    variant="outline"
                    disabled={markReadMutation.isPending}
                    onClick={() => markReadMutation.mutate(notification.id)}
                  >
                    Đánh dấu đã đọc
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
