import GoogleSignInButton from "@/app/components/GoogleSignInButton";
import { hasSupabaseEnv } from "@/lib/supabase/config";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const showDomainError = resolvedSearchParams?.error === "domain";
  const hasEnv = hasSupabaseEnv();

  return (
    <div className="min-h-screen bg-black px-6 pb-12 pt-6 text-zinc-50">
      <main className="mx-auto mt-6 flex w-full max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-5xl font-semibold tracking-tight">
            Humor Project Admin
          </h1>
          <p className="text-sm text-zinc-400">
            Secure admin access for The Humor Project.
          </p>
        </header>

        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-300">
          {showDomainError && (
            <div className="rounded-lg border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
              Please use a @columbia.edu or @barnard.edu Google account.
            </div>
          )}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            {hasEnv ? (
              <GoogleSignInButton variant="inline" />
            ) : (
              <div className="rounded-lg border border-amber-900/40 bg-amber-950/30 p-3 text-xs text-amber-200">
                Missing Supabase env vars. Add
                <span className="font-semibold">
                  {" "}
                  NEXT_PUBLIC_SUPABASE_URL{" "}
                </span>
                and
                <span className="font-semibold">
                  {" "}
                  NEXT_PUBLIC_SUPABASE_ANON_KEY{" "}
                </span>
                in <span className="font-semibold">.env.local</span>.
              </div>
            )}
          </div>
          <p>
            Sign in with your @columbia.edu or @barnard.edu Google account.
          </p>
        </section>
      </main>
    </div>
  );
}
