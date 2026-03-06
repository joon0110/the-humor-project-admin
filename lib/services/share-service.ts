import { createSupabaseServerClient } from "@/lib/supabase/server";

type ShareDestination = {
  id: number;
  name: string | null;
};

type ShareRow = {
  id: number;
  created_datetime_utc: string;
  share_to_destination_id: number | null;
};

class ShareService {
  static async getTotalShares(): Promise<number> {
    try {
      const supabase = await createSupabaseServerClient();
      const { count, error } = await supabase
        .from("shares")
        .select("id", { count: "exact", head: true });

      if (error || typeof count !== "number") {
        return 0;
      }

      return count;
    } catch {
      return 0;
    }
  }

  static async getTotalScreenshots(): Promise<number> {
    try {
      const supabase = await createSupabaseServerClient();
      const { count, error } = await supabase
        .from("screenshots")
        .select("id", { count: "exact", head: true });

      if (error || typeof count !== "number") {
        return 0;
      }

      return count;
    } catch {
      return 0;
    }
  }

  static async getAllDestinations(): Promise<ShareDestination[]> {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("share_to_destinations")
        .select("id, name")
        .order("id", { ascending: true });

      if (error) {
        return [];
      }

      return (data ?? []) as ShareDestination[];
    } catch {
      return [];
    }
  }

  static async getSharesByDestination(
    destinationId: number
  ): Promise<ShareRow[]> {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("shares")
        .select("id, created_datetime_utc, share_to_destination_id")
        .eq("share_to_destination_id", destinationId);

      if (error) {
        return [];
      }

      return (data ?? []) as ShareRow[];
    } catch {
      return [];
    }
  }
}

export type { ShareDestination, ShareRow };
export default ShareService;
