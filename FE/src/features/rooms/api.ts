import { apiClient } from "@/lib/api/client";
import type { Room } from "@/types/domain";

type CreateRoomPayload = {
  houseId: string;
  code: string;
  name?: string;
  capacity: number;
  floor?: number;
};

export async function getRooms(houseId: string) {
  const rooms = await apiClient.get<any[]>(`/rooms/house/${houseId}`);

  return rooms.map((room) => ({
    id: room.id,
    houseId: room.houseId,
    code: room.code,
    name: room.name,
    capacity: room.capacity,
    floor: room.floor,
    activeMembers: room.memberships?.filter((membership: any) => membership.isActive).length ?? 0,
    occupied: (room.memberships?.filter((membership: any) => membership.isActive).length ?? 0) > 0
  })) satisfies Room[];
}

export async function createRoom(payload: CreateRoomPayload) {
  return apiClient.post("/rooms", payload);
}
