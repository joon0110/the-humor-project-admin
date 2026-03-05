import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const displayName =
    data.user?.user_metadata?.full_name || email || "Admin";

  return (
    <SidebarNav activeKey="overview" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-zinc-400">Signed in as {email}.</p>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-300">
          This is the admin landing page. Add panels, stats, or recent activity
          here.
        </section>
      </div>
    </SidebarNav>
  );
}
