import type { AuthSession } from "@/types/domain";

type SessionLike = Pick<AuthSession, "role" | "houseId">;

export function getDefaultRoute(session: SessionLike) {
  if (!session.houseId) {
    return "/pending-access";
  }

  return session.role === "admin" ? "/admin/dashboard" : "/member/dashboard";
}
