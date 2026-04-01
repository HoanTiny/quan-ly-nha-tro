'use client';

import { useQuery } from '@tanstack/react-query';
import { getMemberExpenseSummary } from '@/features/expenses/api';
import { useAuthSession } from '@/lib/auth/use-auth-session';
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

type MemberExpenseSummaryProps = {
  houseId: string;
  month: string;
};

export function MemberExpenseSummaryComponent({
  houseId,
  month,
}: MemberExpenseSummaryProps) {
  const session = useAuthSession();

  const summaryQuery = useQuery({
    queryKey: queryKeys.expenses.memberSummary(session?.userId!, houseId, month),
    queryFn: () =>
      getMemberExpenseSummary({
        userId: session!.userId!,
        houseId,
        month,
      }),
    enabled: Boolean(session?.userId && houseId && month),
  });

  if (summaryQuery.isLoading || !session) {
    return <Card>Đang tải tổng kết chi tiêu...</Card>;
  }

  if (summaryQuery.error || !summaryQuery.data) {
    return <Card>Không tải được tổng kết chi tiêu.</Card>;
  }

  const { currentTotal, previousTotal, percentageChange, expenses, monthKey, previousMonthKey } =
    summaryQuery.data;

  const changeColor =
    percentageChange > 0 ? 'text-red-600' : percentageChange < 0 ? 'text-green-600' : 'text-muted-foreground';

  const changeIcon = percentageChange > 0 ? '↑' : percentageChange < 0 ? '↓' : '→';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tổng kết chi tiêu {formatMonthLabel(monthKey)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-secondary px-4 py-3 text-sm">
            <p className="text-muted-foreground">Tổng chi tháng này</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {currency.format(currentTotal)} VND
            </p>
          </div>

          <div className="rounded-2xl bg-secondary px-4 py-3 text-sm">
            <p className="text-muted-foreground">Tháng trước</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {currency.format(previousTotal)} VND
            </p>
          </div>

          <div className="rounded-2xl bg-secondary px-4 py-3 text-sm">
            <p className="text-muted-foreground">So với tháng trước</p>
            <p className={`mt-1 text-2xl font-semibold ${changeColor}`}>
              {changeIcon} {Math.abs(percentageChange).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {percentageChange > 0
                ? 'Tăng so với tháng trước'
                : percentageChange < 0
                  ? 'Giảm so với tháng trước'
                  : 'Không đổi so với tháng trước'}
            </p>
          </div>
        </div>

        {expenses.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Chi tiết các khoản chi</p>
            <div className="grid gap-2">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{getCategoryLabel(expense.category)}</Badge>
                    <div>
                      <p className="font-medium">{expense.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(expense.expenseDate).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium text-foreground">
                    {currency.format(expense.amount)} VND
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Không có khoản chi nào trong tháng này.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
