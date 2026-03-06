import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";
import CaptionTable from "@/app/captions/CaptionTable";

export const dynamic = "force-dynamic";

type CaptionRow = {
  id: string;
  content: string | null;
  created_datetime_utc: string | null;
  modified_datetime_utc?: string | null;
  updated_datetime_utc?: string | null;
  updated_at?: string | null;
  is_public: boolean | null;
  image_id: string | null;
  image_url?: string | null;
  profile_id: string | null;
  like_count: number | null;
  share_count: number;
  caption_request_id?: string | number | null;
  caption_request?: string | number | null;
  humor_flavor?: string | null;
  humor_flavour?: string | null;
  images: { url: string | null } | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

export default async function CaptionsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const displayName =
    data.user?.user_metadata?.full_name || email || "Account";

  const { data: captions, error } = await supabase
    .from("captions")
    .select(
      "*, images ( url ), profiles ( first_name, last_name, email )"
    )
    .order("created_datetime_utc", { ascending: false })
    .limit(1000);

  const baseRows = (captions ?? []) as CaptionRow[];
  const captionIds = baseRows.map((row) => row.id);
  let shareCountMap = new Map<string, number>();

  if (captionIds.length > 0) {
    const { data: shares } = await supabase
      .from("shares")
      .select("caption_id")
      .in("caption_id", captionIds);

    shareCountMap = (shares ?? []).reduce((map, share) => {
      const key = String(share.caption_id);
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>());
  }

  const rows = baseRows.map((row) => ({
    ...row,
    like_count: row.like_count ?? 0,
    share_count: shareCountMap.get(row.id) ?? 0,
  }));

  return (
    <SidebarNav activeKey="captions" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Captions</h1>
          <p className="text-sm text-zinc-400">
            Review captions generated for uploaded images.
          </p>
        </header>

        <CaptionTable rows={rows} hasError={Boolean(error)} />
      </div>
    </SidebarNav>
  );
}
