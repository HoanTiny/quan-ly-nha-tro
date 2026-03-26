"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";

import { useAuthSession } from "@/lib/auth/use-auth-session";
import { queryKeys } from "@/lib/query/query-keys";
import { useToast } from "@/lib/toast/toast-context";

type RealtimeNotificationPayload = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

function getRealtimeBaseUrl() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return "http://localhost:3001";
  }
}

export function RealtimeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = useAuthSession();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    const socket: Socket = io(`${getRealtimeBaseUrl()}/realtime`, {
      transports: ["websocket"],
      withCredentials: true,
      auth: {
        token: session.accessToken,
      },
    });

    const refreshBillViews = () => {
      void queryClient.invalidateQueries({ queryKey: ["bills"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    };

    const handleNotificationCreated = (notification: RealtimeNotificationPayload) => {
      showToast(`${notification.title}: ${notification.body}`, "info");
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list });
      refreshBillViews();
    };

    const handleBillsUpdated = () => {
      refreshBillViews();
    };

    socket.on("notification.created", handleNotificationCreated);
    socket.on("bills.updated", handleBillsUpdated);

    return () => {
      socket.off("notification.created", handleNotificationCreated);
      socket.off("bills.updated", handleBillsUpdated);
      socket.disconnect();
    };
  }, [queryClient, session?.accessToken, showToast]);

  return children;
}
