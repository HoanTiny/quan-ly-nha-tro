'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useQuery } from '@tanstack/react-query';

import { getBills } from '@/features/bills/api';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { queryKeys } from '@/lib/query/query-keys';
import { BillStatusBadge } from './bill-status-badge';
import { Card } from '@/components/ui/card';

export function MemberBillsList() {
  const session = useAuthSession();

  const billsQuery = useQuery({
    queryKey: queryKeys.bills.list({ userId: session?.userId }),
    queryFn: () => getBills({ userId: session!.userId }),
    enabled: Boolean(session?.userId),
  });

  if (billsQuery.isLoading || !session) {
    return <Card>Đang tải dữ liệu hóa đơn...</Card>;
  }

  if (billsQuery.error) {
    return <Card>Không tải được danh sách hóa đơn.</Card>;
  }

  if (!billsQuery.data?.length) {
    return <Card>Chưa có hóa đơn nào cho tài khoản này.</Card>;
  }

  console.log('billsQuery', billsQuery.data);

  return (
    <div className="space-y-3 flex flex-col">
      {billsQuery.data.map((bill) => (
        <Link key={bill.id} href={`/member/bills/${bill.id}` as Route}>
          <Card className="transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-semibold">
                  {bill.periodLabel ?? `Kỳ ${bill.month}/${bill.year}`}
                </p>
                <p className="text-sm text-black/55">{bill.roomName}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold">
                    {bill.amount?.toLocaleString('vi-VN')} VND
                  </p>
                  <p className="text-sm text-black/55">
                    Hạn đóng{' '}
                    {new Date(bill.dueDate).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <BillStatusBadge status={bill.status} />
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
