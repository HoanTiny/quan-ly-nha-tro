import Link from 'next/link';
import { ArrowRight, Receipt, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function LandingPage() {
  return (
    <main className="min-h-screen px-4 py-6 lg:px-6">
      <section className="mx-auto max-w-7xl rounded-[36px] bg-white/80 p-6 shadow-card backdrop-blur lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <p className="inline-flex rounded-full bg-sand px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]">
              Quản lý tài chính nhà trọ
            </p>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight lg:text-6xl">
                Quản lý chi tiêu nhà trọ rõ ràng, chốt công nợ cuối tháng minh bạch.
              </h1>
              <p className="max-w-2xl text-lg text-black/60">
                Theo dõi điện, nước, wifi, chi phí chung và đối soát thanh toán theo từng
                phòng trong một giao diện responsive.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/login">
                <Button className="gap-2">
                  Bắt đầu <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="secondary">Tạo tài khoản</Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="bg-pine text-white">
              <Receipt className="mb-10 h-7 w-7" />
              <p className="text-3xl font-semibold">1 dashboard</p>
              <p className="mt-2 text-white/75">Chi phí, công nợ, thanh toán và nhắc đóng tiền.</p>
            </Card>
            <Card>
              <Wallet className="mb-10 h-7 w-7 text-clay" />
              <p className="text-3xl font-semibold">QR thanh toán nhanh</p>
              <p className="mt-2 text-black/60">
                Thành viên quét QR, upload minh chứng, admin xác nhận ngay trong hệ thống.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
