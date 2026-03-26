import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ManagementTablePlaceholderProps = {
  title: string;
  columns: string[];
};

export function ManagementTablePlaceholder({
  title,
  columns
}: ManagementTablePlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="hidden grid-cols-5 gap-3 rounded-xl bg-secondary px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
          {columns.map((column) => (
            <span key={column}>{column}</span>
          ))}
        </div>
        {[1, 2, 3].map((row) => (
          <div key={row} className="rounded-xl border p-4 text-sm text-muted-foreground">
            Row placeholder {row}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
