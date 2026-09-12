import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.25),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(6,182,212,0.2),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(244,63,94,0.15),transparent_45%)]" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
