import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";

export const dynamic = "force-dynamic";

export default async function CaptionRequestsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const displayName =
    data.user?.user_metadata?.full_name || email || "Account";

  return (
    <SidebarNav activeKey="captions" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">
            Caption Requests
          </h1>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-300">
          Caption requests content will go here.
        </section>
      </div>
    </SidebarNav>
  );
}
