"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Clock3, HousePlus, Users } from "lucide-react";

import { getAuthSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PendingAccessPage() {
  const router = useRouter();
  const session = getAuthSession();

  return (
    <Card className="w-full max-w-4xl overflow-hidden border-black/5 bg-white/95 p-0 shadow-[0_24px_80px_rgba(24,34,40,0.12)] backdrop-blur">
      <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="bg-gradient-to-br from-ink via-[#223531] to-pine px-6 py-8 text-white sm:px-8 sm:py-10">
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Chưa có quyền truy cập
            </p>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Tài khoản của bạn chưa được gắn vào nhà trọ nào.
              </h1>
              <p className="max-w-md text-sm leading-6 text-white/75 sm:text-base">
                Đây là trạng thái bình thường với người thuê mới hoặc tài khoản vừa đăng ký. Bạn không
                cần tạo nhà trọ nếu chỉ là người thuê.
              </p>
            </div>

            <div className="space-y-3 rounded-3xl border border-white/10 bg-white/10 p-5">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-5 w-5 text-[#d7f0cd]" />
                <div>
                  <p className="font-medium">Người thuê</p>
                  <p className="text-sm text-white/70">
                    Chỉ cần gửi email đăng nhập của bạn cho chủ trọ để họ thêm vào nhà và phân phòng.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-5 w-5 text-[#f7e0ba]" />
                <div>
                  <p className="font-medium">Chủ trọ</p>
                  <p className="text-sm text-white/70">
                    Nếu bạn là chủ trọ, hãy tạo nhà trọ để bắt đầu quản lý phòng, thành viên và chi phí.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="px-6 py-8 sm:px-8 sm:py-10">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/40">Tiếp theo</p>
              <h2 className="text-3xl font-semibold tracking-tight text-ink">
                Chọn đúng luồng của bạn
              </h2>
              <p className="max-w-md text-sm leading-6 text-black/55">
                {session?.email
                  ? `Tài khoản hiện tại: ${session.email}.`
                  : "Tài khoản hiện tại chưa có quyền vào dashboard quản lý hoặc dashboard thành viên."}
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-3xl border border-black/10 bg-sand/70 p-5">
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-5 w-5 text-pine" />
                  <div className="space-y-2">
                    <p className="font-medium">Nếu bạn là người thuê</p>
                    <p className="text-sm leading-6 text-black/60">
                      Không cần tạo nhà trọ. Hãy gửi email tài khoản cho chủ trọ để họ thêm bạn vào hệ
                      thống. Sau khi được thêm, đăng nhập lại là bạn sẽ vào được phần hóa đơn và thanh toán.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-black/10 bg-white p-5">
                <div className="flex items-start gap-3">
                  <HousePlus className="mt-0.5 h-5 w-5 text-pine" />
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">Nếu bạn là chủ trọ</p>
                      <p className="text-sm leading-6 text-black/60">
                        Tạo nhà trọ ngay để tài khoản của bạn trở thành chủ trọ và mở dashboard quản lý.
                      </p>
                    </div>
                    <Button onClick={() => router.push("/create-house")}>
                      Tạo nhà trọ
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-sm text-black/50">
              Muốn quay lại?{" "}
              <Link className="font-semibold text-pine" href="/login">
                Đăng nhập bằng tài khoản khác
              </Link>
            </div>
          </div>
        </section>
      </div>
    </Card>
  );
}
