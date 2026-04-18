'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/features/auth/api';
import { getDefaultRoute } from '@/lib/auth/default-route';
import { AUTH_LOGOUT_EVENT, getAuthSession, saveAuthSession } from '@/lib/auth/session';
import { useToast } from '@/lib/toast/toast-context';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      return;
    }

    router.replace(getDefaultRoute(session));
  }, [router]);

  useEffect(() => {
    const handleAuthLogout = () => {
      window.location.reload();
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handleAuthLogout as EventListener);
    return () => {
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleAuthLogout as EventListener);
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const session = await login({ email, password });
      saveAuthSession(session);
      showToast('Dang nhap thanh cong.', 'success');
      router.push(getDefaultRoute(session));
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Dang nhap that bai.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-5xl overflow-hidden border-black/5 bg-white/95 p-0 shadow-[0_24px_80px_rgba(24,34,40,0.12)] backdrop-blur">
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="relative overflow-hidden bg-gradient-to-br from-ink via-[#223531] to-pine px-6 py-8 text-white sm:px-8 sm:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_24%)]" />
          <div className="relative space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-white/80">
              <Sparkles className="h-3.5 w-3.5" />
              Quan ly chi tieu nha tro
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Dang nhap de vao dung khu vuc cua ban trong he thong.
              </h1>
              <p className="max-w-md text-sm leading-6 text-white/75 sm:text-base">
                Chu tro co the tao nha tro de quan ly. Nguoi thue chi can duoc chu tro cap tai
                khoan hoac them vao nha tro la co the dang nhap va xem hoa don.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-[#d7f0cd]" />
                  <div>
                    <p className="font-medium">Phan quyen ro rang</p>
                    <p className="mt-1 text-sm text-white/70">
                      Chu tro va nguoi thue di vao hai dashboard rieng, dung theo quyen hien tai
                      cua tai khoan.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-start gap-3">
                  <Smartphone className="mt-0.5 h-5 w-5 text-[#f7e0ba]" />
                  <div>
                    <p className="font-medium">Toi uu mobile</p>
                    <p className="mt-1 text-sm text-white/70">
                      Nut lon, thao tac ngan va phu hop cho ca chu tro lan thanh vien tren dien
                      thoai.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
              <p className="text-sm font-medium text-white/85">Hai cach vao he thong</p>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Neu ban la chu tro, hay dang ky roi tao nha tro cua minh. Neu ban la nguoi thue,
                chi can dung tai khoan do chu tro tao san hoac tai khoan da duoc chu tro them vao
                he thong.
              </p>
            </div>
          </div>
        </aside>

        <section className="flex items-center px-6 py-8 sm:px-8 sm:py-10">
          <div className="w-full space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/40">
                Dang nhap
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-ink">Vao dashboard cua ban</h2>
              <p className="max-w-md text-sm leading-6 text-black/55">
                Su dung email va mat khau de truy cap he thong. Tai khoan chua duoc gan vao nha
                tro se duoc dua sang man huong dan tiep theo thay vi bi ep tao nha tro.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
                  <Input
                    id="email"
                    autoComplete="email"
                    className="h-12 w-full rounded-2xl border-black/10 pl-11 pr-4 text-base"
                    inputMode="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="ban@email.com"
                    type="email"
                    value={email}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mat khau</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
                  <Input
                    id="password"
                    autoComplete="current-password"
                    className="h-12 w-full rounded-2xl border-black/10 pl-11 pr-12 text-base"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Nhap mat khau"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? 'An mat khau' : 'Hien mat khau'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-black/45 transition hover:bg-black/5 hover:text-black/70"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <Link className="font-medium text-black/50 transition hover:text-pine" href="/forgot-password">
                  Quen mat khau?
                </Link>

                {error ? (
                  <div
                    aria-live="polite"
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:col-span-2"
                    role="alert"
                  >
                    {error}
                  </div>
                ) : null}
              </div>

              <Button
                className="mt-2 h-12 w-full rounded-2xl text-base shadow-[0_12px_28px_rgba(39,76,71,0.22)]"
                disabled={isSubmitting}
                type="submit"
              >
                <span>{isSubmitting ? 'Dang xu ly...' : 'Dang nhap'}</span>
                {isSubmitting ? null : <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            <p className="text-center text-sm text-black/50 sm:text-left">
              Chua co tai khoan?{' '}
              <Link className="font-semibold text-pine transition hover:text-ink" href="/register">
                Dang ky ngay
              </Link>
            </p>
          </div>
        </section>
      </div>
    </Card>
  );
}
