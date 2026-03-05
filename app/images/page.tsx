import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";

export const dynamic = "force-dynamic";

export default async function ImagesPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const displayName =
    data.user?.user_metadata?.full_name || email || "Admin";

  return (
    <SidebarNav activeKey="images" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Images</h1>
          <p className="text-sm text-zinc-400">Signed in as {email}.</p>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-300">
          Image tools will go here.
        </section>
      </div>
    </SidebarNav>
  );
}
