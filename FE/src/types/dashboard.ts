export type AdminDashboard = {
  rooms: number;
  totalExpense: number;
  overdueCount: number;
  totalPaid: number;
  totalNetAmount: number;
  allItems: Array<{
    membershipId: string;
    netAmount: number;
    paidAmount: number;
  }>;
  latestSettlement?: {
    id: string;
    monthKey: string;
    status: string;
    totalExpense: number | string;
    totalPaid: number | string;
    items: Array<{
      id: string;
      netAmount: number | string;
      paidAmount: number | string;
      membership?: {
        user?: {
          fullName: string;
        };
        room?: {
          name?: string;
          code?: string;
        } | null;
      };
    }>;
  } | null;
};

export type MemberDashboard = {
  currentDue: number;
  lines: Array<{
    id: string;
    netAmount: number | string;
    paidAmount: number | string;
    status: string;
    settlement?: {
      id: string;
      monthKey: string;
      status: string;
    };
  }>;
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    createdAt?: string;
  }>;
};
