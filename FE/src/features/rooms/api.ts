import { apiClient } from "@/lib/api/client";
import type { Room } from "@/types/domain";

type CreateRoomPayload = {
  houseId: string;
  code: string;
  name?: string;
  capacity: number;
  floor?: number;
};

type RoomMembershipResponse = {
  isActive: boolean;
};

type RoomResponse = {
  id: string;
  houseId?: string;
  code?: string;
  name: string;
  capacity?: number;
  floor?: number | null;
  memberships?: RoomMembershipResponse[];
};

export async function getRooms(houseId: string) {
  const rooms = await apiClient.get<RoomResponse[]>(`/rooms/house/${houseId}`);

  return rooms.map((room) => {
    const activeMembers = room.memberships?.filter((membership) => membership.isActive).length ?? 0;

    return {
      id: room.id,
      houseId: room.houseId,
      code: room.code,
      name: room.name,
      capacity: room.capacity,
      floor: room.floor,
      activeMembers,
      occupied: activeMembers > 0,
    };
  }) satisfies Room[];
}

export async function createRoom(payload: CreateRoomPayload) {
  return apiClient.post("/rooms", payload);
}
