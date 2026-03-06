import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const displayName =
    data.user?.user_metadata?.full_name || email || "Account";
  const { count: userCount, error: userError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  const { count: captionCount, error: captionError } = await supabase
    .from("captions")
    .select("id", { count: "exact", head: true });
  const showError = userError || captionError;

  return (
    <SidebarNav activeKey="overview" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-zinc-400">Signed in as {email}.</p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950/80 to-zinc-900/40 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between text-sm text-zinc-300">
              <span className="font-semibold">Users</span>
              <span className="text-red-300/80">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 20.25a7.5 7.5 0 0 1 15 0"
                  />
                </svg>
              </span>
            </div>
            <div className="mt-6 text-4xl font-semibold tracking-tight text-white">
              {typeof userCount === "number"
                ? userCount.toLocaleString()
                : "—"}
            </div>
            {userError && (
              <p className="mt-3 text-xs text-red-200">
                Failed to load users count.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950/80 to-zinc-900/40 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between text-sm text-zinc-300">
              <span className="font-semibold">Captions</span>
              <span className="text-red-300/80">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3c.9 2.1-.6 3.3-1.5 4.5-.7.9-1.5 1.9-1.5 3.5 0 2.2 1.8 4 4 4 2.9 0 5.2-2.5 5-5.4-.1-1.9-1-3.4-2.4-4.6-1-.9-2.1-1.8-2.6-3.6Z"
                  />
                </svg>
              </span>
            </div>
            <div className="mt-6 text-4xl font-semibold tracking-tight text-white">
              {typeof captionCount === "number"
                ? captionCount.toLocaleString()
                : "—"}
            </div>
            {captionError && (
              <p className="mt-3 text-xs text-red-200">
                Failed to load captions count.
              </p>
            )}
          </div>
        </section>

        {showError && (
          <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-4 text-xs text-red-200">
            Some stats could not be loaded. Check Supabase permissions.
          </div>
        )}
      </div>
    </SidebarNav>
  );
}
