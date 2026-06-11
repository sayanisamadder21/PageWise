import { supabase } from "../supabase";

const TODAY = () => new Date().toISOString().split("T")[0];

export async function getUsageToday(userId: string) {
  const { data, error } = await supabase
    .from("usage")
    .select("*")
    .eq("user_id", userId)
    .eq("date", TODAY())
    .single();

  if (error || !data) return { pdfs: 0, questions: 0, exports: 0 };
  return data;
}

export async function incrementUsage(
  userId: string,
  field: "pdfs" | "questions" | "exports"
) {
  const today = TODAY();

  // Try to get existing row
  const { data } = await supabase
    .from("usage")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  if (!data) {
    // Create new row
    await supabase.from("usage").insert({
      user_id: userId,
      date: today,
      pdfs: field === "pdfs" ? 1 : 0,
      questions: field === "questions" ? 1 : 0,
      exports: field === "exports" ? 1 : 0,
    });
  } else {
    // Increment existing
    await supabase
      .from("usage")
      .update({ [field]: data[field] + 1 })
      .eq("user_id", userId)
      .eq("date", today);
  }
}