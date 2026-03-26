"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { register } from "@/features/auth/api";
import { getDefaultRoute } from "@/lib/auth/default-route";
import { saveAuthSession } from "@/lib/auth/session";
import { useToast } from "@/lib/toast/toast-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp.");
      showToast("Mật khẩu nhập lại không khớp.", "error");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const session = await register({
        fullName,
        phone: phone || undefined,
        email,
        password
      });

      saveAuthSession(session);
      showToast("Đăng ký tài khoản thành công.", "success");
      router.replace(getDefaultRoute(session));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Đăng ký thất bại.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-black/40">Đăng ký</p>
          <h1 className="mt-2 text-3xl font-semibold">Tạo tài khoản để vào hệ thống</h1>
          <p className="mt-2 text-sm text-black/55">
            Nếu bạn là chủ trọ, bạn có thể tạo nhà trọ sau khi đăng ký. Nếu bạn là người thuê,
            chủ trọ chỉ cần thêm email này vào nhà trọ để bạn đăng nhập và sử dụng.
          </p>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="fullName">Họ tên</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nguyễn Văn A"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0901234567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ban@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              minLength={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Nhập lại mật khẩu</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Nhập lại mật khẩu"
              minLength={6}
              required
            />
          </div>

          {error ? <p className="text-sm text-coral md:col-span-2">{error}</p> : null}

          <Button className="md:col-span-2" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          </Button>
        </form>

        <p className="text-sm text-black/50">
          Đã có tài khoản?{" "}
          <Link className="font-semibold text-pine" href="/login">
            Đăng nhập
        </Link>
        </p>
      </Card>
    </main>
  );
}
