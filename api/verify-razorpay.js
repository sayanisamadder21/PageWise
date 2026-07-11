const crypto    = require("crypto");
const { createClient } = require("@supabase/supabase-js");

function planExpiry(billing) {
  const d = new Date();
  billing === "yearly" ? d.setFullYear(d.getFullYear() + 1) : d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    plan,
    billing,
  } = req.body ?? {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId || !plan) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Verify Razorpay signature
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: "Invalid payment signature" });
  }

  // Update user plan using service role key (bypasses RLS)
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY   // service role — bypasses RLS; never use anon key here
  );

  const { error } = await supabase
    .from("users")
    .update({ plan, plan_expiry: planExpiry(billing) })
    .eq("id", userId);

  if (error) {
    console.error("verify-razorpay supabase error:", error);
    return res.status(500).json({ error: "Failed to update plan" });
  }

  res.json({ success: true });
};
