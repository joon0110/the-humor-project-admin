import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedEmailDomain } from "@/lib/auth/allowed-domains";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email ?? "";
    const fullName =
      (data.user?.user_metadata?.full_name as string | undefined) ??
      (data.user?.user_metadata?.name as string | undefined) ??
      "";

    if (!isAllowedEmailDomain(email)) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=domain", request.url));
    }

    if (!email || !fullName.trim()) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL("/login?error=profile", request.url)
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_superadmin")
      .eq("id", data.user?.id ?? "")
      .single();

    if (profileError || !profile?.is_superadmin) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=admin", request.url));
    }
  }

  return NextResponse.redirect(new URL("/overview", request.url));
}
