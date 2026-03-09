import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";
import HumorMixManager from "@/app/humor/mix/HumorMixManager";

export const dynamic = "force-dynamic";

export default async function HumorMixPage() {
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
  const mixTableCandidates = [
    "humor_flavor_mix",
    "humor_flavour_mix",
    "humor_mix",
    "humor_flavor_mixes",
    "humor_flavour_mixes",
    "flavor_mix",
    "flavor_mixes",
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

  let mixRows: Record<string, unknown>[] = [];
  let mixError: unknown = null;
  let mixTableName: string | null = null;

  for (const tableName of mixTableCandidates) {
    const { data: mixes, error } = await supabase
      .from(tableName)
      .select("*")
      .limit(1000);
    if (!error) {
      mixRows = (mixes ?? []) as Record<string, unknown>[];
      mixError = null;
      mixTableName = tableName;
      break;
    }
    mixError = error;
  }

  return (
    <SidebarNav activeKey="humor" displayName={displayName}>
      <div className="space-y-6">
        <HumorMixManager
          flavors={flavorRows}
          mixRows={mixRows}
          hasFlavorError={Boolean(flavorError)}
          hasMixError={Boolean(mixError)}
          mixTableName={mixTableName}
        />
      </div>
    </SidebarNav>
  );
}
