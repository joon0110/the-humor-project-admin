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

    if (!isAllowedEmailDomain(email)) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=domain", request.url));
    }
  }

  return NextResponse.redirect(new URL("/welcome", request.url));
}
