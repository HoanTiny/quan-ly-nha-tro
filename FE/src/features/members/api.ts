import { apiClient } from "@/lib/api/client";
import type { Member } from "@/types/domain";

type CreateMemberPayload = {
  houseId: string;
  roomId?: string;
  fullName: string;
  email: string;
  phone?: string;
  password?: string;
  role?: "OWNER" | "MANAGER" | "TENANT";
};

type AssignRoomPayload = {
  roomId?: string;
};

export async function getMembers(houseId: string) {
  const memberships = await apiClient.get<any[]>("/members", { houseId });

  return memberships.map((membership) => ({
    id: membership.user.id,
    membershipId: membership.id,
    fullName: membership.user.fullName,
    email: membership.user.email,
    phone: membership.user.phone ?? undefined,
    roomId: membership.roomId ?? undefined,
    roomName: membership.room?.name ?? membership.room?.code ?? undefined,
    role: membership.role,
    isActive: membership.isActive
  })) satisfies Member[];
}

export async function createMember(payload: CreateMemberPayload) {
  return apiClient.post("/members", payload);
}

export async function assignMemberRoom(membershipId: string, payload: AssignRoomPayload) {
  return apiClient.patch(`/members/${membershipId}/room`, payload);
}

export async function removeMember(membershipId: string) {
  return apiClient.delete(`/members/${membershipId}`);
}
