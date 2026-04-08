import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";
import ShareService from "@/lib/services/share-service";
import OverviewChart from "@/app/components/chart/overviewchart";

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
  const { count: totalRatingsCount, error: totalRatingsError } = await supabase
    .from("caption_votes")
    .select("id", { count: "exact", head: true });
  const { count: positiveRatingsCount, error: positiveRatingsError } =
    await supabase
      .from("caption_votes")
      .select("id", { count: "exact", head: true })
      .eq("vote_value", 1);
  const { count: negativeRatingsCount, error: negativeRatingsError } =
    await supabase
      .from("caption_votes")
      .select("id", { count: "exact", head: true })
      .eq("vote_value", -1);
  const totalShares = await ShareService.getTotalShares();
  const totalScreenshots = await ShareService.getTotalScreenshots();
  const destinations = await ShareService.getAllDestinations();
  const topDestinations = destinations.slice(0, 5);
  const sharesByDestination = await Promise.all(
    topDestinations.map(async (dest) => {
      const shares = await ShareService.getSharesByDestination(dest.id);
      return { destination: dest, shares };
    })
  );
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const chartSeries = sharesByDestination.map(({ destination, shares }) => {
    const values = days.map(() => 0);
    shares.forEach((share) => {
      const date = new Date(share.created_datetime_utc);
      if (!Number.isNaN(date.getTime())) {
        values[date.getUTCDay()] += 1;
      }
    });
    return {
      label: destination.name || `Destination ${destination.id}`,
      values,
    };
  });
  const hasPositiveRatings = typeof positiveRatingsCount === "number";
  const hasNegativeRatings = typeof negativeRatingsCount === "number";
  const positiveVotes = hasPositiveRatings ? positiveRatingsCount : 0;
  const negativeVotes = hasNegativeRatings ? negativeRatingsCount : 0;
  const ratingsChartHeightPx = 96;
  const minBarHeightPx = 16;
  const maxVoteCount = Math.max(1, positiveVotes, negativeVotes);
  const positiveBarHeight = Math.max(
    minBarHeightPx,
    Math.round((positiveVotes / maxVoteCount) * ratingsChartHeightPx)
  );
  const negativeBarHeight = Math.max(
    minBarHeightPx,
    Math.round((negativeVotes / maxVoteCount) * ratingsChartHeightPx)
  );
  const showError = Boolean(
    userError ||
      captionError ||
      totalRatingsError ||
      positiveRatingsError ||
      negativeRatingsError
  );

  return (
    <SidebarNav activeKey="overview" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Overview</h1>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="self-start rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950/80 to-zinc-900/40 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
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

          <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950/80 to-zinc-900/40 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between text-sm text-zinc-300">
              <span className="font-semibold">Shares</span>
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
                    d="M14 5.5 7.5 9.25m0 5.5L14 18.5M17.5 6.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm-8 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm12 2a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"
                  />
                </svg>
              </span>
            </div>
            <div className="mt-6 text-4xl font-semibold tracking-tight text-white">
              {totalShares.toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950/80 to-zinc-900/40 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between text-sm text-zinc-300">
              <span className="font-semibold">Screenshots</span>
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
                    d="M6.5 7.5h-1A1.5 1.5 0 0 0 4 9v7.5A1.5 1.5 0 0 0 5.5 18h13A1.5 1.5 0 0 0 20 16.5V9A1.5 1.5 0 0 0 18.5 7.5h-1m-11 0 1-2h7l1 2m-3.5 4a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"
                  />
                </svg>
              </span>
            </div>
            <div className="mt-6 text-4xl font-semibold tracking-tight text-white">
              {totalScreenshots.toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950/80 to-zinc-900/40 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between text-sm text-zinc-300">
              <span className="font-semibold">Total Ratings</span>
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
                    d="M7.5 10.5h-3v9h3m0-9 3-6h6.75a1.5 1.5 0 0 1 1.47 1.8l-1.2 6A1.5 1.5 0 0 1 16.05 13.5H10.5m-3 6h8.25a1.5 1.5 0 0 0 1.5-1.5v-4.5"
                  />
                </svg>
              </span>
            </div>
            <div className="mt-6 text-4xl font-semibold tracking-tight text-white">
              {typeof totalRatingsCount === "number"
                ? totalRatingsCount.toLocaleString()
                : "—"}
            </div>
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3">
              <div className="flex items-end justify-center gap-10">
                <div className="flex w-20 flex-col items-center">
                  <div className="mb-2 text-xs text-zinc-400">
                    {hasPositiveRatings ? positiveVotes.toLocaleString() : "—"}
                  </div>
                  <div className="flex h-28 items-end">
                    <div
                      className="w-10 rounded-t-md border border-emerald-300/50 bg-emerald-400/80"
                      style={{
                        height: `${
                          hasPositiveRatings ? positiveBarHeight : minBarHeightPx
                        }px`,
                      }}
                    />
                  </div>
                  <div className="mt-2 text-xs font-semibold text-emerald-300">
                    +1
                  </div>
                </div>
                <div className="flex w-20 flex-col items-center">
                  <div className="mb-2 text-xs text-zinc-400">
                    {hasNegativeRatings ? negativeVotes.toLocaleString() : "—"}
                  </div>
                  <div className="flex h-28 items-end">
                    <div
                      className="w-10 rounded-t-md border border-red-300/50 bg-red-400/80"
                      style={{
                        height: `${
                          hasNegativeRatings ? negativeBarHeight : minBarHeightPx
                        }px`,
                      }}
                    />
                  </div>
                  <div className="mt-2 text-xs font-semibold text-red-300">
                    -1
                  </div>
                </div>
              </div>
            </div>
            {(totalRatingsError || positiveRatingsError || negativeRatingsError) && (
              <p className="mt-3 text-xs text-red-200">
                Failed to load ratings count.
              </p>
            )}
          </div>

          <OverviewChart series={chartSeries} days={days} />
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
