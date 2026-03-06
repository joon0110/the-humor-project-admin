import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    return NextResponse.json(
      { error: error?.message ?? "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    accessToken: data.session.access_token,
    expiresAt: data.session.expires_at,
  });
}
