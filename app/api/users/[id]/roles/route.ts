import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(
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

  const body = (await request.json()) as {
    is_superadmin?: boolean;
    is_matrix_admin?: boolean;
  };

  const updates: Record<string, boolean | string> = {};
  if (typeof body.is_superadmin === "boolean") {
    updates.is_superadmin = body.is_superadmin;
  }
  if (typeof body.is_matrix_admin === "boolean") {
    updates.is_matrix_admin = body.is_matrix_admin;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  updates.modified_by_user_id = user.id;

  const { id } = await params;
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select(
      "id, first_name, last_name, email, is_superadmin, is_matrix_admin, created_datetime_utc"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
