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
  splitMethod: "EQUAL";
  totalAmount: number;
  expenseDate: string;
  receiptImageUrl?: string;
  participantMembershipIds: string[];
};

export async function getExpenses(houseId: string, month?: string) {
  const expenses = await apiClient.get<any[]>("/expenses", { houseId, month });

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
    participantCount: expense.allocations?.length ?? 0
  })) satisfies ExpenseRecord[];
}

export async function createExpense(payload: CreateExpensePayload) {
  return apiClient.post("/expenses", payload);
}

export async function getSettlements(houseId: string, month?: string) {
  const settlements = await apiClient.get<any[]>(`/settlements/house/${houseId}`, { month });

  return settlements.map((settlement) => ({
    id: settlement.id,
    monthKey: settlement.monthKey,
    status: settlement.status,
    totalExpense: Number(settlement.totalExpense),
    totalPaid: Number(settlement.totalPaid),
    itemsCount: settlement.items?.length ?? 0
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
