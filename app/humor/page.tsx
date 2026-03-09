import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";
import HumorFlavorsTable from "@/app/humor/HumorFlavorsTable";

export const dynamic = "force-dynamic";

export default async function HumorPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const displayName =
    data.user?.user_metadata?.full_name || email || "Account";

  const flavorTableCandidates = [
    "humor_flavors",
    "humour_flavours",
    "humor_flavour",
    "humor_flavor",
  ];

  let flavorRows: Record<string, unknown>[] = [];
  let flavorError: unknown = null;

  for (const tableName of flavorTableCandidates) {
    const { data: flavors, error } = await supabase
      .from(tableName)
      .select("*")
      .limit(1000);
    if (!error) {
      flavorRows = (flavors ?? []) as Record<string, unknown>[];
      flavorError = null;
      break;
    }
    flavorError = error;
  }

  return (
    <SidebarNav activeKey="humor" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">
            Humor Flavors
          </h1>
          <p className="text-sm text-zinc-400">
            Organize flavor definitions and step sequences.
          </p>
        </header>

        <HumorFlavorsTable
          rows={flavorRows}
          hasError={Boolean(flavorError)}
        />
      </div>
    </SidebarNav>
  );
}
