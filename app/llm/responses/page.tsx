import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";
import LlmModelResponsesTable from "@/app/llm/LlmModelResponsesTable";

export const dynamic = "force-dynamic";

export default async function LlmResponsesPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const displayName =
    data.user?.user_metadata?.full_name || email || "Account";

  const { data: responses, error } = await supabase
    .from("llm_model_responses")
    .select("*")
    .limit(1000);

  const rows = (responses ?? []) as Record<string, unknown>[];

  return (
    <SidebarNav activeKey="llm" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">
            LLM Responses
          </h1>
          <p className="text-sm text-zinc-400">
            Review model responses and processing details.
          </p>
        </header>

        <LlmModelResponsesTable rows={rows} hasError={Boolean(error)} />
      </div>
    </SidebarNav>
  );
}
