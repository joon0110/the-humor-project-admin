import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: currentProfile, error: currentProfileError } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  if (currentProfileError || !currentProfile?.is_superadmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: targetId } = await params;

  const { count: imageCount, error: imageCountError } = await supabase
    .from("images")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", targetId);

  const { count: captionCount, error: captionCountError } = await supabase
    .from("captions")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", targetId);

  const warningMessages: string[] = [];
  if (imageCountError) {
    warningMessages.push(imageCountError.message);
  }
  if (captionCountError) {
    warningMessages.push(captionCountError.message);
  }

  const { data: images, error: imagesError } = await supabase
    .from("images")
    .select("id, url, created_datetime_utc")
    .eq("profile_id", targetId)
    .order("created_datetime_utc", { ascending: false });

  const { data: captions, error: captionsError } = await supabase
    .from("captions")
    .select("id, content, created_datetime_utc")
    .eq("profile_id", targetId)
    .order("created_datetime_utc", { ascending: false });

  if (imagesError) {
    warningMessages.push(imagesError.message);
  }
  if (captionsError) {
    warningMessages.push(captionsError.message);
  }

  return NextResponse.json({
    counts: {
      images: imageCount ?? 0,
      captions: captionCount ?? 0,
    },
    images: images ?? [],
    captions: captions ?? [],
    warning: warningMessages.length > 0 ? warningMessages.join(" | ") : null,
  });
}
