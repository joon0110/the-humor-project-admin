import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig, hasSupabaseEnv } from "./lib/supabase/config";
import { isAllowedEmailDomain } from "./lib/auth/allowed-domains";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

function copyResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  path: string
) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  copyResponseCookies(response, redirect);
  return redirect;
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
        return redirectWithCookies(request, response, "/login?error=profile");
      }

      if (!isAllowedEmailDomain(email)) {
        await supabase.auth.signOut();
        return redirectWithCookies(request, response, "/login?error=domain");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_superadmin")
        .eq("id", userId)
        .single();

      if (profileError || !profile?.is_superadmin) {
        await supabase.auth.signOut();
        return redirectWithCookies(request, response, "/login?error=admin");
      }

      return redirectWithCookies(request, response, "/overview");
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
    return redirectWithCookies(request, response, "/login");
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
    return redirectWithCookies(request, response, "/login?error=profile");
  }

  if (!isAllowedEmailDomain(email)) {
    await supabase.auth.signOut();
    return redirectWithCookies(request, response, "/login?error=domain");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.is_superadmin) {
    await supabase.auth.signOut();
    return redirectWithCookies(request, response, "/login?error=admin");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
