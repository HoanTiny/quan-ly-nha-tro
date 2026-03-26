"use client";

import { useEffect, useState } from "react";

import type { AuthSession } from "@/types/domain";
import { AUTH_SESSION_CHANGED_EVENT, getAuthSession } from "@/lib/auth/session";

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const syncSession = () => {
      setSession(getAuthSession());
    };

    syncSession();

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  return session;
}
