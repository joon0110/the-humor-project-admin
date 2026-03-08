import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";
import WhitelistedEmailsManager from "@/app/whitelisted/WhitelistedEmailsManager";

export const dynamic = "force-dynamic";

export default async function BugReportPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const displayName =
    data.user?.user_metadata?.full_name || email || "Account";

  const { data: emails, error } = await supabase
    .from("whitelist_email_addresses")
    .select("id, email_address, created_datetime_utc")
    .order("email_address", { ascending: true })
    .limit(1000);

  const rows = (emails ?? []) as {
    id: string | number;
    email_address: string | null;
    created_datetime_utc?: string | null;
  }[];

  return (
    <SidebarNav activeKey="whitelisted" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">
            Whitelisted E-mail Addresses
          </h1>
          <p className="text-sm text-zinc-400">
            Allow specific email addresses to sign up even if the domain is not
            listed.
          </p>
        </header>

        <WhitelistedEmailsManager rows={rows} hasError={Boolean(error)} />
      </div>
    </SidebarNav>
  );
}
