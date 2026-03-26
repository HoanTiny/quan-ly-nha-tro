"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, MapPinHouse, Hash, ArrowRight } from "lucide-react";

import { createHouse } from "@/features/houses/api";
import { getDefaultRoute } from "@/lib/auth/default-route";
import { saveAuthSession } from "@/lib/auth/session";
import { useToast } from "@/lib/toast/toast-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function toCodeSeed(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 18);
}

export default function CreateHousePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const suggestedCode = useMemo(() => toCodeSeed(name), [name]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await createHouse({
        code: code || suggestedCode,
        name,
        address
      });

      saveAuthSession(result.session);
      showToast("Đã tạo nhà trọ và chuyển sang quyền quản lý.", "success");
      router.replace(getDefaultRoute(result.session));
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Không tạo được nhà trọ.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl overflow-hidden border-black/5 bg-white/95 p-0 shadow-[0_24px_80px_rgba(24,34,40,0.12)] backdrop-blur">
      <div className="grid lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="bg-gradient-to-br from-ink via-[#223531] to-pine px-6 py-8 text-white sm:px-8 sm:py-10">
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Bắt đầu quản lý
            </p>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Tạo nhà trọ đầu tiên để mở dashboard admin.
              </h1>
              <p className="max-w-md text-sm leading-6 text-white/75 sm:text-base">
                Sau bước này, tài khoản của bạn sẽ trở thành chủ trọ của nhà vừa tạo và có thể thêm phòng,
                thêm thành viên, quản lý chi phí ngay.
              </p>
            </div>

            <div className="space-y-3 rounded-3xl border border-white/10 bg-white/10 p-5">
              <div className="flex items-center gap-3">
                <Home className="h-5 w-5 text-[#d7f0cd]" />
                <div>
                  <p className="font-medium">Nhà trọ độc lập</p>
                  <p className="text-sm text-white/70">Mỗi tài khoản có thể bắt đầu từ một nhà trọ riêng.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPinHouse className="h-5 w-5 text-[#f7e0ba]" />
                <div>
                  <p className="font-medium">Quản lý theo địa chỉ</p>
                  <p className="text-sm text-white/70">Tên, mã và địa chỉ sẽ hiển thị xuyên suốt các màn quản trị.</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="px-6 py-8 sm:px-8 sm:py-10">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/40">Tạo nhà trọ</p>
              <h2 className="text-3xl font-semibold tracking-tight text-ink">Thiết lập thông tin cơ bản</h2>
              <p className="max-w-md text-sm leading-6 text-black/55">
                Nhập tên nhà trọ, mã định danh và địa chỉ để bắt đầu quản lý.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="houseName">Tên nhà trọ</Label>
                <div className="relative">
                  <Home className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
                  <Input
                    id="houseName"
                    className="h-12 rounded-2xl border-black/10 pl-11 pr-4 text-base"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nhà trọ An Khang"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="houseCode">Mã nhà trọ</Label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
                  <Input
                    id="houseCode"
                    className="h-12 rounded-2xl border-black/10 pl-11 pr-4 text-base"
                    value={code}
                    onChange={(event) => setCode(event.target.value.toUpperCase())}
                    placeholder={suggestedCode || "TRO-AN-KHANG"}
                    required={!suggestedCode}
                  />
                </div>
                <p className="text-xs text-black/45">
                  Nếu để trống, hệ thống sẽ gợi ý mã từ tên nhà trọ: <span className="font-medium">{suggestedCode || "TRO-AN-KHANG"}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Địa chỉ</Label>
                <div className="relative">
                  <MapPinHouse className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-black/35" />
                  <textarea
                    id="address"
                    className="min-h-28 w-full rounded-2xl border border-black/10 bg-background pl-11 pr-4 pt-3 text-base outline-none"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    required
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {error}
                </div>
              ) : null}

              <Button
                className="h-12 w-full rounded-2xl text-base shadow-[0_12px_28px_rgba(39,76,71,0.22)]"
                disabled={isSubmitting}
                type="submit"
              >
                <span>{isSubmitting ? "Đang tạo nhà trọ..." : "Tạo nhà trọ và vào quản lý"}</span>
                {!isSubmitting ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
            </form>
          </div>
        </section>
      </div>
    </Card>
  );
}
