import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";
import UserTable from "@/app/user/UserTable";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_superadmin: boolean | null;
  is_matrix_admin: boolean | null;
  created_datetime_utc: string | null;
  activity?: { images: number; captions: number };
};

export default async function UserPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const displayName =
    data.user?.user_metadata?.full_name || email || "Account";

  const { count, error: countError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, email, is_superadmin, is_matrix_admin, created_datetime_utc"
    )
    .order("created_datetime_utc", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  const typedProfiles = (profiles ?? []) as ProfileRow[];

  const activity = await Promise.all(
    typedProfiles.map(async (profile) => {
      const { count: imageCount } = await supabase
        .from("images")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profile.id);
      const { count: captionCount } = await supabase
        .from("captions")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profile.id);
      return {
        id: profile.id,
        activity: {
          images: imageCount ?? 0,
          captions: captionCount ?? 0,
        },
      };
    })
  );

  const activityMap = new Map(activity.map((entry) => [entry.id, entry]));
  const enrichedProfiles = typedProfiles.map((profile) => ({
    ...profile,
    activity: activityMap.get(profile.id)?.activity ?? {
      images: 0,
      captions: 0,
    },
  }));

  return (
    <SidebarNav activeKey="user" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-zinc-400">
            Search, filter, and manage account activity.
          </p>
        </header>

        <UserTable
          initialProfiles={enrichedProfiles}
          initialTotal={count ?? 0}
          hasError={Boolean(error || countError)}
        />
      </div>
    </SidebarNav>
  );
}
