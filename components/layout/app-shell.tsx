import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
  };
}) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-4 px-4 py-4 sm:px-5 md:gap-6 md:px-6">
        <Sidebar displayName={user.name} email={user.email} />
        <main className="flex min-h-[calc(100vh-2rem)] flex-1 flex-col pb-6 md:pb-0">
          <MobileNav displayName={user.name} email={user.email} />
          {children}
        </main>
      </div>
    </div>
  );
}
