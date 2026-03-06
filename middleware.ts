import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig, hasSupabaseEnv } from "./lib/supabase/config";
import { isAllowedEmailDomain } from "./lib/auth/allowed-domains";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    if (!hasSupabaseEnv()) {
      return NextResponse.next();
    }

    const response = NextResponse.next();
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email ?? "";
      const fullName =
        (data.user?.user_metadata?.full_name as string | undefined) ??
        (data.user?.user_metadata?.name as string | undefined) ??
        "";
      const userId = data.user?.id ?? "";

      if (!email || !fullName.trim()) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/login?error=profile", request.url));
      }

      if (!isAllowedEmailDomain(email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/login?error=domain", request.url));
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_superadmin")
        .eq("id", userId)
        .single();

      if (profileError || !profile?.is_superadmin) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/login?error=admin", request.url));
      }

      return NextResponse.redirect(new URL("/overview", request.url));
    }

    return response;
  }

  if (!hasSupabaseEnv()) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const fullName =
    (data.user?.user_metadata?.full_name as string | undefined) ??
    (data.user?.user_metadata?.name as string | undefined) ??
    "";
  const userId = data.user?.id ?? "";

  if (!email || !fullName.trim()) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=profile", request.url));
  }

  if (!isAllowedEmailDomain(email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=domain", request.url));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.is_superadmin) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=admin", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
