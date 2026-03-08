import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";
import LlmProvidersManager from "@/app/llm/LlmProvidersManager";

export const dynamic = "force-dynamic";

export default async function LlmProvidersPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const displayName =
    data.user?.user_metadata?.full_name || email || "Account";

  const { data: providers, error } = await supabase
    .from("llm_providers")
    .select("*")
    .order("id", { ascending: true })
    .limit(1000);

  const rows = (providers ?? []) as {
    id: string | number;
    name: string | null;
    created_datetime_utc?: string | null;
    created_at?: string | null;
  }[];

  return (
    <SidebarNav activeKey="llm" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">
            LLM Providers
          </h1>
          <p className="text-sm text-zinc-400">
            All registered providers in the system.
          </p>
        </header>

        <div className="h-px w-full bg-zinc-800/60" />

        <LlmProvidersManager rows={rows} hasError={Boolean(error)} />
      </div>
    </SidebarNav>
  );
}
