import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import SidebarNav from "@/app/components/SidebarNav";
import CaptionRequestsTable from "@/app/captions/requests/CaptionRequestsTable";

export const dynamic = "force-dynamic";
const IMAGE_QUERY_CHUNK_SIZE = 100;

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

function pickFirstNonEmptyString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return null;
}

function chunkArray<T>(values: T[], chunkSize: number): T[][] {
  if (values.length === 0) return [];
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

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
    const imageChunks = chunkArray(imageIds, IMAGE_QUERY_CHUNK_SIZE);
    const mergedRows = new Map<string, Record<string, unknown>>();

    for (const chunk of imageChunks) {
      const [{ data: imagesById }, { data: imagesByImageId }] =
        await Promise.all([
          dataClient.from("images").select("*").in("id", chunk),
          dataClient.from("images").select("*").in("image_id", chunk),
        ]);

      for (const row of imagesById ?? []) {
        const typedRow = row as Record<string, unknown>;
        const key =
          (typedRow["id"] != null ? String(typedRow["id"]) : null) ??
          (typedRow["image_id"] != null
            ? String(typedRow["image_id"])
            : null) ??
          JSON.stringify(typedRow);
        mergedRows.set(key, typedRow);
      }
      for (const row of imagesByImageId ?? []) {
        const typedRow = row as Record<string, unknown>;
        const key =
          (typedRow["id"] != null ? String(typedRow["id"]) : null) ??
          (typedRow["image_id"] != null
            ? String(typedRow["image_id"])
            : null) ??
          JSON.stringify(typedRow);
        mergedRows.set(key, typedRow);
      }
    }
    const imagesData = Array.from(mergedRows.values());

    const resolveImageUrl = (row: Record<string, unknown>) =>
      pickFirstNonEmptyString([
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
        row["signed_url"],
        row["signedUrl"],
        row["path"],
        row["file_path"],
      ]);

    imageMap = new Map(
      imagesData.flatMap((row) => {
        const url = resolveImageUrl(row);
        const entries: Array<[string, string | null]> = [];
        const idValue = row["id"];
        const imageIdValue = row["image_id"] ?? row["imageId"];

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
    const directImageUrl = pickFirstNonEmptyString([
      row.image_url,
      row.imageUrl,
      row.image,
      (row as unknown as Record<string, unknown>)["url"],
      (row as unknown as Record<string, unknown>)["public_url"],
      (row as unknown as Record<string, unknown>)["cdn_url"],
      (row as unknown as Record<string, unknown>)["storage_url"],
      (row as unknown as Record<string, unknown>)["signed_url"],
    ]);
    const imageUrl =
      (resolvedImageId ? imageMap.get(resolvedImageId) ?? null : null) ??
      directImageUrl;

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
