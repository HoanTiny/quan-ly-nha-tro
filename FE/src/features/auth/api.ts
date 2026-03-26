import { apiClient } from "@/lib/api/client";
import type { AuthSession } from "@/types/domain";

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  fullName: string;
  phone?: string;
  email: string;
  password: string;
};

type BackendHouseRole = "OWNER" | "MANAGER" | "TENANT";

type BackendLoginResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName?: string;
    role: BackendHouseRole;
    houseId?: string | null;
  };
};

function mapRole(role: BackendHouseRole): AuthSession["role"] {
  return role === "TENANT" ? "member" : "admin";
}

type BackendCurrentUserResponse = {
  id: string;
  email: string;
  fullName: string;
  role: BackendHouseRole;
  houseId?: string | null;
};

export async function login(payload: LoginPayload) {
  const response = await apiClient.post<BackendLoginResponse>("/auth/login", payload);

  return {
    userId: response.user.id,
    email: response.user.email,
    fullName: response.user.fullName ?? response.user.email,
    role: mapRole(response.user.role),
    houseId: response.user.houseId ?? null,
    accessToken: response.accessToken
  } satisfies AuthSession;
}

export async function register(payload: RegisterPayload) {
  const response = await apiClient.post<BackendLoginResponse>("/auth/register", payload);

  return {
    userId: response.user.id,
    email: response.user.email,
    fullName: response.user.fullName ?? response.user.email,
    role: mapRole(response.user.role),
    houseId: response.user.houseId ?? null,
    accessToken: response.accessToken
  } satisfies AuthSession;
}

export async function getMe() {
  const response = await apiClient.get<BackendCurrentUserResponse>("/auth/me");

  return {
    userId: response.id,
    email: response.email,
    fullName: response.fullName,
    role: mapRole(response.role),
    houseId: response.houseId ?? null
  } satisfies Omit<AuthSession, "accessToken">;
}
