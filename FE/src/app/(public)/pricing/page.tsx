import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  {
    title: "Admin",
    items: "Tổng quan, phòng, thành viên, chi phí, thanh toán, thông báo, cài đặt"
  },
  {
    title: "Thành viên",
    items: "Tổng quan, chi tiết hóa đơn, QR thanh toán, upload minh chứng, thông báo, hồ sơ"
  }
];

export default function PricingPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Các khu vực giao diện</h1>
        <p className="text-muted-foreground">
          Danh sách khu vực chính đã được scaffold sẵn để bắt đầu implementation.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {modules.map((module) => (
          <Card key={module.title}>
            <CardHeader>
              <CardTitle>{module.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{module.items}</CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
