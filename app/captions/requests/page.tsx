import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import SidebarNav from "@/app/components/SidebarNav";
import CaptionRequestsTable from "@/app/captions/requests/CaptionRequestsTable";

export const dynamic = "force-dynamic";

type CaptionRequestRow = {
  id: string | number;
  image_id: string | null;
  profile_id: string | null;
  created_datetime_utc: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  image?: string | null;
  images: { url: string | null } | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

export default async function CaptionRequestsPage() {
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = createSupabaseAdminClient();
  const dataClient = supabaseAdmin ?? supabase;
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const displayName =
    data.user?.user_metadata?.full_name || email || "Account";

  const { data: requests, error } = await supabase
    .from("caption_requests")
    .select("*")
    .order("created_datetime_utc", { ascending: false })
    .limit(1000);

  const baseRows = (requests ?? []) as CaptionRequestRow[];
  const imageIds = Array.from(
    new Set(
      baseRows
        .map((row) => row.image_id)
        .filter((id): id is string => Boolean(id))
        .map(String)
    )
  );
  const profileIds = Array.from(
    new Set(
      baseRows
        .map((row) => row.profile_id)
        .filter((id): id is string => Boolean(id))
        .map(String)
    )
  );

  let imageMap = new Map<string, string | null>();
  if (imageIds.length > 0) {
    const { data: imagesById } = await dataClient
      .from("images")
      .select("*")
      .in("id", imageIds);
    let imagesData = imagesById ?? [];

    if (imagesData.length < imageIds.length) {
      const { data: imagesByImageId, error: imageIdError } = await dataClient
        .from("images")
        .select("*")
        .in("image_id", imageIds);
      if (!imageIdError && imagesByImageId) {
        imagesData = [...imagesData, ...imagesByImageId];
      }
    }

    const resolveImageUrl = (row: Record<string, unknown>) => {
      const candidates = [
        row["url"],
        row["image_url"],
        row["imageUrl"],
        row["image"],
        row["public_url"],
        row["publicUrl"],
        row["cdn_url"],
        row["cdnUrl"],
        row["storage_url"],
        row["storageUrl"],
      ];
      const first = candidates.find((value) => typeof value === "string");
      return typeof first === "string" ? first : null;
    };

    imageMap = new Map(
      imagesData.flatMap((row) => {
        const url = resolveImageUrl(row as Record<string, unknown>);
        const entries: Array<[string, string | null]> = [];
        const idValue = (row as { id?: unknown }).id;
        const imageIdValue =
          (row as { image_id?: unknown }).image_id ??
          (row as { imageId?: unknown }).imageId;

        if (idValue != null) {
          entries.push([String(idValue), url]);
        }
        if (imageIdValue != null) {
          entries.push([String(imageIdValue), url]);
        }

        return entries;
      })
    );
  }

  let profileMap = new Map<
    string,
    { first_name: string | null; last_name: string | null; email: string | null }
  >();
  if (profileIds.length > 0) {
    const { data: profilesData } = await dataClient
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", profileIds);
    profileMap = new Map(
      (profilesData ?? []).map((row) => [
        String(row.id),
        {
          first_name: row.first_name ?? null,
          last_name: row.last_name ?? null,
          email: row.email ?? null,
        },
      ])
    );
  }

  const rows = baseRows.map((row) => {
    const resolvedImageId = row.image_id ? String(row.image_id) : null;
    const resolvedProfileId = row.profile_id ? String(row.profile_id) : null;
    const directImageUrl =
      row.image_url ?? row.imageUrl ?? row.image ?? null;
    const imageUrl =
      directImageUrl ??
      (resolvedImageId ? imageMap.get(resolvedImageId) ?? null : null);

    return {
      ...row,
      images: imageUrl ? { url: imageUrl } : null,
      profiles: resolvedProfileId
        ? profileMap.get(resolvedProfileId) ?? null
        : null,
    };
  });

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
