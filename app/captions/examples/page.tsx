import { createSupabaseServerClient } from "@/lib/supabase/server";
import SidebarNav from "@/app/components/SidebarNav";
import CaptionExamplesList from "@/app/captions/examples/CaptionExamplesList";

export const dynamic = "force-dynamic";

type CaptionExampleRow = {
  id: string | number;
  caption?: string | null;
  content?: string | null;
  caption_text?: string | null;
  example_text?: string | null;
  text?: string | null;
  image_description?: string | null;
  image_context?: string | null;
  description?: string | null;
  explanation?: string | null;
  explanation_text?: string | null;
  reason?: string | null;
};

export default async function CaptionExamplesPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const displayName =
    data.user?.user_metadata?.full_name || email || "Account";

  const { data: examples, error } = await supabase
    .from("caption_examples")
    .select("*")
    .order("id", { ascending: false })
    .limit(1000);

  const rows = (examples ?? []) as CaptionExampleRow[];

  return (
    <SidebarNav activeKey="captions" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">
            Caption Examples
          </h1>
          <p className="text-sm text-zinc-400">
            Curated examples used for prompts and quality checks.
          </p>
        </header>

        <CaptionExamplesList rows={rows} hasError={Boolean(error)} />
      </div>
    </SidebarNav>
  );
}
