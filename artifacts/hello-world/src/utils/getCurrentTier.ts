import { supabase } from "@/supabase";
import type { Tier } from "@/config/tierConfig";

export async function getCurrentTier(): Promise<Tier> {
  // Anonymous users are always Free
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return "free";
  }

  // Fetch subscription info for authenticated users
  const { data, error } = await supabase
    .from("users")
    .select("plan, plan_expiry")
    .eq("id", session.user.id)
    .single();

  // Missing user record or DB error → safe fallback
  if (error || !data) {
    return "free";
  }

  // Paid plan expired → treat as Free
  if (
    data.plan !== "free" &&
    data.plan_expiry &&
    new Date(data.plan_expiry) < new Date()
  ) {
    return "free";
  }

  return data.plan as Tier;
}