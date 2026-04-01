'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { getDemoContext } from '@/features/demo/api';
import { MemberExpenseSummaryComponent } from '@/components/expenses/member-expense-summary';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

function getPreviousMonth(month: string): string {
  const [yearStr, monthStr] = month.split('-');
  let year = parseInt(yearStr, 10);
  let monthNum = parseInt(monthStr, 10);

  if (monthNum === 1) {
    year -= 1;
    monthNum = 12;
  } else {
    monthNum -= 1;
  }

  return `${year}-${`${monthNum}`.padStart(2, '0')}`;
}

function getNextMonth(month: string): string {
  const [yearStr, monthStr] = month.split('-');
  let year = parseInt(yearStr, 10);
  let monthNum = parseInt(monthStr, 10);

  if (monthNum === 12) {
    year += 1;
    monthNum = 1;
  } else {
    monthNum += 1;
  }

  return `${year}-${`${monthNum}`.padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');
  return `Tháng ${month}/${year}`;
}

export default function MemberExpensesPage() {
  const session = useAuthSession();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const demoContextQuery = useQuery({
    queryKey: ['demo', 'context'],
    queryFn: getDemoContext,
  });

  if (!session || demoContextQuery.isLoading) {
    return <Card>Đang tải...</Card>;
  }

  if (!demoContextQuery.data) {
    return <Card>Không tải được dữ liệu.</Card>;
  }

  const handlePrevMonth = () => {
    setSelectedMonth(getPreviousMonth(selectedMonth));
  };

  const handleNextMonth = () => {
    setSelectedMonth(getNextMonth(selectedMonth));
  };

  const isCurrentMonth = selectedMonth === currentMonth;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng kết chi tiêu"
        description="Xem chi tiết chi tiêu cá nhân theo tháng và so sánh với tháng trước."
      />

      <Card>
        <div className="flex items-center justify-between p-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center">
            <h3 className="text-lg font-semibold">{formatMonthLabel(selectedMonth)}</h3>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            disabled={isCurrentMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <MemberExpenseSummaryComponent
        houseId={demoContextQuery.data.houseId}
        month={selectedMonth}
      />
    </div>
  );
}
