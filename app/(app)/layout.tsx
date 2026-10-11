import { BottomNav, SideNav } from "@/components/nav";
import { getContext } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { household } = await getContext();

  return (
    <div className="flex min-h-dvh">
      <SideNav householdName={household.name} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 sm:px-6 md:pb-10">{children}</main>
      <BottomNav />
    </div>
  );
}
