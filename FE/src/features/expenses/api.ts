import { apiClient } from "@/lib/api/client";
import type { ExpenseRecord, SettlementRecord } from "@/types/domain";

type CreateExpensePayload = {
  createdById: string;
  houseId: string;
  roomId?: string;
  payerUserId?: string;
  title: string;
  description?: string;
  category: string;
  splitMethod: "EQUAL" | "BY_WEIGHT";
  totalAmount: number;
  expenseDate: string;
  receiptImageUrl?: string;
  participantMembershipIds: string[];
  participantWeights?: { membershipId: string; weight: number }[];
};

export type MemberExpenseSummary = {
  monthKey: string;
  previousMonthKey: string;
  currentTotal: number;
  previousTotal: number;
  percentageChange: number;
  expenses: Array<{
    id: string;
    title: string;
    category: string;
    amount: number;
    expenseDate: string;
  }>;
};

export type AdminExpenseSummary = {
  membershipId: string;
  userId: string;
  fullName: string;
  roomName?: string | null;
  totalExpense: number;
  expenses: Array<{
    id: string;
    title: string;
    category: string;
    amount: number;
    expenseDate: string;
  }>;
};

type ExpenseResponse = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  amount: number | string;
  expenseDate: string;
  monthKey: string;
  receiptImageUrl?: string | null;
  payer?: {
    fullName?: string;
  } | null;
  allocations?: Array<unknown>;
};

type SettlementResponse = {
  id: string;
  monthKey: string;
  status: string;
  totalExpense: number | string;
  totalPaid: number | string;
  items?: Array<unknown>;
};

export async function getExpenses(houseId: string, month?: string) {
  const expenses = await apiClient.get<ExpenseResponse[]>("/expenses", { houseId, month });

  return expenses.map((expense) => ({
    id: expense.id,
    title: expense.title,
    description: expense.description,
    category: expense.category,
    amount: Number(expense.amount),
    expenseDate: expense.expenseDate,
    monthKey: expense.monthKey,
    receiptImageUrl: expense.receiptImageUrl,
    payerName: expense.payer?.fullName,
    participantCount: expense.allocations?.length ?? 0,
  })) satisfies ExpenseRecord[];
}

export async function createExpense(payload: CreateExpensePayload) {
  return apiClient.post("/expenses", payload);
}

export async function updateExpense(expenseId: string, payload: Partial<CreateExpensePayload>) {
  return apiClient.put(`/expenses/${expenseId}`, payload);
}

export async function deleteExpense(expenseId: string) {
  return apiClient.delete(`/expenses/${expenseId}`);
}

export async function getSettlements(houseId: string, month?: string) {
  const settlements = await apiClient.get<SettlementResponse[]>(`/settlements/house/${houseId}`, { month });

  return settlements.map((settlement) => ({
    id: settlement.id,
    monthKey: settlement.monthKey,
    status: settlement.status,
    totalExpense: Number(settlement.totalExpense),
    totalPaid: Number(settlement.totalPaid),
    itemsCount: settlement.items?.length ?? 0,
  })) satisfies SettlementRecord[];
}

export async function generateSettlement(payload: {
  houseId: string;
  month: number;
  year: number;
  dueDate: string;
}) {
  return apiClient.post("/settlements/generate", payload);
}

export async function getMemberExpenseSummary(params: {
  userId: string;
  houseId: string;
  month: string;
}) {
  return apiClient.get<MemberExpenseSummary>("/expenses/summary/member", params);
}

export async function getAdminExpenseSummary(params: {
  houseId: string;
  month: string;
}) {
  return apiClient.get<AdminExpenseSummary[]>("/expenses/summary/admin", params);
}
