import { Badge } from "@/components/ui/badge";
import type { BillStatus } from "@/types/domain";

const statusMap: Record<BillStatus, { label: string; variant: "secondary" | "success" | "warning" | "destructive" }> = {
  draft: { label: "Nháp", variant: "secondary" },
  issued: { label: "Đã phát hành", variant: "secondary" },
  pending_payment: { label: "Chờ thanh toán", variant: "warning" },
  paid: { label: "Đã thanh toán", variant: "success" },
  overdue: { label: "Quá hạn", variant: "destructive" },
  rejected: { label: "Bị từ chối", variant: "destructive" }
};

type BillStatusBadgeProps = {
  status: BillStatus;
};

export function BillStatusBadge({ status }: BillStatusBadgeProps) {
  const config = statusMap[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
