import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCurrentUserId(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}
