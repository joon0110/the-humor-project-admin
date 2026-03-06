import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";
import CaptionRequestsTable from "@/app/captions/requests/CaptionRequestsTable";

export const dynamic = "force-dynamic";

type CaptionRequestRow = {
  id: string | number;
  image_id: string | null;
  profile_id: string | null;
  created_datetime_utc: string | null;
  images: { url: string | null } | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

export default async function CaptionRequestsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const displayName =
    data.user?.user_metadata?.full_name || email || "Account";

  const { data: requests, error } = await supabase
    .from("caption_requests")
    .select("*, images ( url ), profiles ( first_name, last_name, email )")
    .order("created_datetime_utc", { ascending: false })
    .limit(1000);

  const rows = (requests ?? []) as CaptionRequestRow[];

  return (
    <SidebarNav activeKey="captions" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">
            Caption Requests
          </h1>
          <p className="text-sm text-zinc-400">
            Review requests submitted for caption generation.
          </p>
        </header>

        <CaptionRequestsTable rows={rows} hasError={Boolean(error)} />
      </div>
    </SidebarNav>
  );
}
