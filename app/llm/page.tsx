import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";
import LlmModelsManager from "@/app/llm/LlmModelsManager";

export const dynamic = "force-dynamic";

export default async function LlmPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const displayName =
    data.user?.user_metadata?.full_name || email || "Account";

  const { data: models, error } = await supabase
    .from("llm_models")
    .select("*")
    .order("id", { ascending: true })
    .limit(1000);

  const rows = (models ?? []) as {
    id: string | number;
    name?: string | null;
    llm_provider_id?: string | number | null;
    provider_model_id?: string | number | null;
    is_temperature_supported?: boolean | number | null;
    created_datetime_utc?: string | null;
    created_at?: string | null;
  }[];

  return (
    <SidebarNav activeKey="llm" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">LLM Models</h1>
          <p className="text-sm text-zinc-400">
            All registered models in the system.
          </p>
        </header>

        <div className="h-px w-full bg-zinc-800/60" />

        <LlmModelsManager rows={rows} hasError={Boolean(error)} />
      </div>
    </SidebarNav>
  );
}
