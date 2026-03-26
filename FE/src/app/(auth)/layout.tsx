export default function AuthLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <section className="relative min-h-dvh overflow-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(217,107,79,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(39,76,71,0.18),transparent_30%),linear-gradient(180deg,#f8f4ec_0%,#f3eee4_100%)]" />
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-6xl items-center justify-center">
        {children}
      </div>
    </section>
  );
}
