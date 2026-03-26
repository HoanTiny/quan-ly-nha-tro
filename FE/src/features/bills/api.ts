import { apiClient } from "@/lib/api/client";
import type { Bill, BillDetail } from "@/types/domain";

export async function getBills(params: { userId: string; month?: string }) {
  return apiClient.get<Bill[]>("/bills", params);
}

export async function getBillById(id: string) {
  return apiClient.get<BillDetail>(`/bills/${id}`);
}
