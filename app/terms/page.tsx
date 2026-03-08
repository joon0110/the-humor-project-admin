import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";
import TermsManager from "@/app/terms/TermsManager";

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const displayName =
    data.user?.user_metadata?.full_name || email || "Account";

  const { data: terms, error } = await supabase
    .from("terms")
    .select("*")
    .limit(1000);

  const rows = (terms ?? []) as Record<string, unknown>[];

  let termTypes: { id: string | number; name: string | null }[] = [];
  const termTypesResult = await supabase
    .from("term_types")
    .select("id, name")
    .limit(1000);
  if (termTypesResult.error) {
    const fallbackResult = await supabase
      .from("term_type")
      .select("id, name")
      .limit(1000);
    termTypes = (fallbackResult.data ?? []) as {
      id: string | number;
      name: string | null;
    }[];
  } else {
    termTypes = (termTypesResult.data ?? []) as {
      id: string | number;
      name: string | null;
    }[];
  }

  const termTypeMap = termTypes.reduce<Record<string, string>>((acc, row) => {
    if (row.name) {
      acc[String(row.id)] = row.name;
    }
    return acc;
  }, {});

  return (
    <SidebarNav activeKey="terms" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Terms</h1>
          <p className="text-sm text-zinc-400">
            Create, edit, and remove the glossary terms used across the app.
          </p>
        </header>

        <div className="h-px w-full bg-zinc-800/60" />

        <TermsManager
          rows={rows}
          hasError={Boolean(error)}
          termTypeMap={termTypeMap}
        />
      </div>
    </SidebarNav>
  );
}
