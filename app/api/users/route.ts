import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

type RoleFilter = "all" | "superadmin" | "matrixadmin" | "none";

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

function applyRoleFilter(query: any, role: RoleFilter) {
  if (role === "superadmin") {
    return query.eq("is_superadmin", true);
  }
  if (role === "matrixadmin") {
    return query.eq("is_matrix_admin", true);
  }
  if (role === "none") {
    return query.eq("is_superadmin", false).eq("is_matrix_admin", false);
  }
  return query;
}

function applySearchFilter(query: any, search: string) {
  if (!search) {
    return query;
  }
  const escaped = search.replace(/[%_]/g, "\\$&");
  return query.or(
    `first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%`
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE))
  );
  const role = (searchParams.get("role") as RoleFilter) ?? "all";
  const search = (searchParams.get("q") ?? "").trim();

  const supabase = await createSupabaseServerClient();

  let countQuery = supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  let dataQuery = supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, email, is_superadmin, is_matrix_admin, created_datetime_utc"
    )
    .order("created_datetime_utc", { ascending: false });

  countQuery = applySearchFilter(applyRoleFilter(countQuery, role), search);
  dataQuery = applySearchFilter(applyRoleFilter(dataQuery, role), search);

  const { count, error: countError } = await countQuery;

  if (countError) {
    return NextResponse.json(
      { profiles: [], total: 0, error: countError.message },
      { status: 500 }
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await dataQuery.range(from, to);

  if (error) {
    return NextResponse.json(
      { profiles: data ?? [], total: count ?? 0, error: error.message },
      { status: 500 }
    );
  }

  const profiles = (data ?? []) as ProfileRow[];

  const activity = await Promise.all(
    profiles.map(async (profile) => {
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
  const enriched = profiles.map((profile) => ({
    ...profile,
    activity: activityMap.get(profile.id)?.activity ?? {
      images: 0,
      captions: 0,
    },
  }));

  return NextResponse.json({ profiles: enriched, total: count ?? 0 });
}
