import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

type StatCardProps = {
  label: string;
  value: string;
  hint: string;
  icon?: ReactNode;
};

export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge>{label}</Badge>
        <div className="text-clay">{icon}</div>
      </div>
      <div>
        <p className="text-3xl font-semibold">{value}</p>
        <p className="mt-1 text-sm text-black/55">{hint}</p>
      </div>
    </Card>
  );
}
