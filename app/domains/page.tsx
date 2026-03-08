import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";
import AllowedDomainsManager from "@/app/domains/AllowedDomainsManager";

export const dynamic = "force-dynamic";

export default async function DomainsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const displayName =
    data.user?.user_metadata?.full_name || email || "Account";

  const { data: domains, error } = await supabase
    .from("allowed_signup_domains")
    .select("id, apex_domain, created_datetime_utc")
    .order("apex_domain", { ascending: true })
    .limit(1000);

  const rows = (domains ?? []) as {
    id: string | number;
    apex_domain: string | null;
    created_datetime_utc?: string | null;
  }[];

  return (
    <SidebarNav activeKey="domains" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Domains</h1>
          <p className="text-sm text-zinc-400">
            Only users with emails from these domains can sign up.
          </p>
        </header>

        <AllowedDomainsManager rows={rows} hasError={Boolean(error)} />
      </div>
    </SidebarNav>
  );
}
