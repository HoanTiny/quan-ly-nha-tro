'use client';

import { useQuery } from '@tanstack/react-query';
import { getAdminExpenseSummary } from '@/features/expenses/api';
import { queryKeys } from '@/lib/query/query-keys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function getCategoryLabel(category: string) {
  switch (category) {
    case 'ELECTRIC':
      return 'Điện';
    case 'WATER':
      return 'Nước';
    case 'INTERNET':
      return 'Internet';
    case 'RENT':
      return 'Tiền phòng';
    case 'REPAIR':
      return 'Sửa chữa';
    case 'SHARED_FOOD':
      return 'Ăn uống';
    case 'OTHER':
      return 'Khác';
    default:
      return category;
  }
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');
  return `Tháng ${month}/${year}`;
}

const currency = new Intl.NumberFormat('vi-VN');

type AdminExpenseSummaryProps = {
  houseId: string;
  month: string;
};

export function AdminExpenseSummaryComponent({
  houseId,
  month,
}: AdminExpenseSummaryProps) {
  const summaryQuery = useQuery({
    queryKey: queryKeys.expenses.adminSummary(houseId, month),
    queryFn: () => getAdminExpenseSummary({ houseId, month }),
    enabled: Boolean(houseId && month),
  });

  if (summaryQuery.isLoading) {
    return <Card>Đang tải tổng kết chi tiêu...</Card>;
  }

  if (summaryQuery.error || !summaryQuery.data) {
    return <Card>Không tải được tổng kết chi tiêu.</Card>;
  }

  const memberSummaries = summaryQuery.data;

  const totalAllMembers = memberSummaries.reduce(
    (sum, member) => sum + member.totalExpense,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tổng kết chi tiêu theo người {formatMonthLabel(month)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl bg-pine/10 px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="font-medium text-pine">Tổng chi toàn nhà</span>
            <span className="font-semibold text-pine">
              {currency.format(totalAllMembers)} VND
            </span>
          </div>
        </div>

        {memberSummaries.length > 0 ? (
          <div className="space-y-3">
            {memberSummaries
              .sort((a, b) => b.totalExpense - a.totalExpense)
              .map((member) => (
                <div
                  key={member.membershipId}
                  className="rounded-2xl border border-black/10 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{member.fullName}</p>
                        {member.roomName && (
                          <Badge variant="outline">Phòng: {member.roomName}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {member.expenses.length} khoản chi
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">
                        {currency.format(member.totalExpense)} VND
                      </p>
                    </div>
                  </div>

                  {member.expenses.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Chi tiết:
                      </p>
                      <div className="grid gap-1.5">
                        {member.expenses.map((expense) => (
                          <div
                            key={expense.id}
                            className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {getCategoryLabel(expense.category)}
                              </Badge>
                              <span className="text-muted-foreground">
                                {expense.title}
                              </span>
                            </div>
                            <span className="font-medium text-foreground">
                              {currency.format(expense.amount)} VND
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
        ) : (
          <div className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Không có dữ liệu chi tiêu trong tháng này.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
