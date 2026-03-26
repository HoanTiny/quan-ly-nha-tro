import type { AuthSession } from "@/types/domain";
import { apiClient } from "@/lib/api/client";

type CreateHousePayload = {
  code: string;
  name: string;
  address: string;
};

type BackendHouseRole = "OWNER" | "MANAGER" | "TENANT";

type CreateHouseResponse = {
  house: {
    id: string;
    code: string;
    name: string;
    address: string;
  };
  session: {
    accessToken: string;
    user: {
      id: string;
      email: string;
      fullName?: string;
      role: BackendHouseRole;
      houseId?: string | null;
    };
  };
};

function mapRole(role: BackendHouseRole): AuthSession["role"] {
  return role === "TENANT" ? "member" : "admin";
}

export async function createHouse(payload: CreateHousePayload) {
  const response = await apiClient.post<CreateHouseResponse>("/houses", payload);

  return {
    house: response.house,
    session: {
      userId: response.session.user.id,
      email: response.session.user.email,
      fullName: response.session.user.fullName ?? response.session.user.email,
      role: mapRole(response.session.user.role),
      houseId: response.session.user.houseId ?? response.house.id,
      accessToken: response.session.accessToken
    } satisfies AuthSession
  };
}
