"use client";

import { QueryProvider } from "@/providers/query-provider";
import { RealtimeProvider } from "@/lib/realtime/realtime-provider";
import { ToastProvider } from "@/lib/toast/toast-context";

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <QueryProvider>
      <ToastProvider>
        <RealtimeProvider>{children}</RealtimeProvider>
      </ToastProvider>
    </QueryProvider>
  );
}
