import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DesktopSidebar, MobileHeader, MobileBottomNav } from "@/components/layout/app-nav";
import { PushPrompt } from "@/components/shared/push-prompt";
import type { Rolle } from "@/lib/permissions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { vorname, rolle, abteilungName } = session.user;

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <DesktopSidebar vorname={vorname} rolle={rolle as Rolle} abteilungName={abteilungName} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileHeader vorname={vorname} rolle={rolle as Rolle} abteilungName={abteilungName} />

        <main className="flex-1 overflow-y-auto bg-zinc-50 p-4 pb-20 md:p-6 md:pb-6">
          <PushPrompt />
          {children}
          <footer className="mt-8 flex items-center justify-center gap-3 text-xs text-slate-400">
            <a href="/impressum" className="hover:text-slate-600">Impressum</a>
            <span>·</span>
            <a href="/datenschutz" className="hover:text-slate-600">Datenschutz</a>
          </footer>
        </main>

        <MobileBottomNav rolle={rolle as Rolle} />
      </div>
    </div>
  );
}
