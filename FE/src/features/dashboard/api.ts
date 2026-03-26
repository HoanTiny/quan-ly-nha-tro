import { apiClient } from '@/lib/api/client';
import { AdminDashboard, MemberDashboard } from '@/types/dashboard';

export function getAdminDashboard(houseId: string, month: string) {
  return apiClient.get<AdminDashboard>('/dashboard/admin', { houseId, month });
}

export function getMemberDashboard(userId: string, month: string) {
  return apiClient.get<MemberDashboard>('/dashboard/member', { userId, month });
}
