import { AppNav } from "@/components/layout/app-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-24 pt-6">
        {children}
      </main>
      <AppNav />
    </div>
  );
}
