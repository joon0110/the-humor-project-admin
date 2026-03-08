import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";
import LlmPromptChainsTable from "@/app/llm/LlmPromptChainsTable";

export const dynamic = "force-dynamic";

export default async function LlmPromptChainsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const displayName =
    data.user?.user_metadata?.full_name || email || "Account";

  const pageSize = 1000;
  const allChains: Record<string, unknown>[] = [];
  let error: unknown = null;

  for (let from = 0; from < 20000; from += pageSize) {
    const { data: batch, error: batchError } = await supabase
      .from("llm_prompt_chains")
      .select("*")
      .range(from, from + pageSize - 1);

    if (batchError) {
      error = batchError;
      break;
    }

    if (!batch || batch.length === 0) break;
    allChains.push(...(batch as Record<string, unknown>[]));

    if (batch.length < pageSize) break;
  }

  const rows = allChains;

  return (
    <SidebarNav activeKey="llm" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">
            LLM Prompt Chains
          </h1>
          <p className="text-sm text-zinc-400">
            Review prompt chains and jump into their generated outputs.
          </p>
        </header>

        <LlmPromptChainsTable rows={rows} hasError={Boolean(error)} />
      </div>
    </SidebarNav>
  );
}
