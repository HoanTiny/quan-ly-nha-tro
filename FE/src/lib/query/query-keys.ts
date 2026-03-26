export const queryKeys = {
  demo: {
    context: ["demo", "context"] as const
  },
  auth: {
    me: ["auth", "me"] as const
  },
  rooms: {
    list: ["rooms"] as const
  },
  members: {
    list: ["members"] as const
  },
  bills: {
    list: (filters?: Record<string, unknown>) => ["bills", filters ?? {}] as const,
    detail: (id: string) => ["bills", id] as const
  },
  payments: {
    list: ["payments"] as const,
    qr: (settlementLineId: string) => ["payments", "qr", settlementLineId] as const,
    account: (houseId?: string | null) => ["payments", "account", houseId ?? "no-house"] as const
  },
  notifications: {
    list: ["notifications"] as const
  }
};
