import type { DemoContext } from "@/types/domain";
import { getAuthSession } from "@/lib/auth/session";

function getCurrentPeriod() {
  const now = new Date();

  return {
    month: now.getMonth() + 1,
    year: now.getFullYear()
  };
}

export async function getDemoContext(): Promise<DemoContext | null> {
  const session = getAuthSession();
  if (!session?.houseId) {
    return null;
  }

  const { month, year } = getCurrentPeriod();

  return {
    houseId: session.houseId,
    roomId: "",
    ownerId: session.userId,
    memberId: session.userId,
    ownerMembershipId: "",
    memberMembershipId: "",
    month,
    year,
    ownerEmail: session.email,
    memberEmail: session.email
  };
}

export async function bootstrapDemo(): Promise<never> {
  throw new Error("Chức năng tạo dữ liệu demo đã bị tắt trong luồng hiện tại.");
}
