const crypto    = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// Disable body parsing so we can verify the raw HMAC
module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function planExpiry(billing) {
  const d = new Date();
  billing === "yearly" ? d.setFullYear(d.getFullYear() + 1) : d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await readRawBody(req);

  // Verify Lemon Squeezy webhook signature
  const secret    = process.env.LS_WEBHOOK_SECRET ?? "";
  const signature = req.headers["x-signature"] ?? "";
  const digest    = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  if (digest !== signature) {
    console.error("ls-webhook: invalid signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  // Only process paid orders
  if (event.meta?.event_name !== "order_created") {
    return res.status(200).json({ received: true });
  }

  const attrs     = event.data?.attributes ?? {};
  const email     = attrs.user_email;
  const variantId = String(attrs.first_order_item?.variant_id ?? "");

  // Map variant IDs to plan + billing
  const VARIANT_MAP = {
    [process.env.VITE_LS_STARTER_MONTHLY_ID]: { plan: "starter", billing: "monthly" },
    [process.env.VITE_LS_STARTER_YEARLY_ID]:  { plan: "starter", billing: "yearly"  },
    [process.env.VITE_LS_PRO_MONTHLY_ID]:     { plan: "pro",     billing: "monthly" },
    [process.env.VITE_LS_PRO_YEARLY_ID]:      { plan: "pro",     billing: "yearly"  },
  };

  const mapped = VARIANT_MAP[variantId];
  if (!mapped) {
    console.error("ls-webhook: unknown variantId", variantId);
    return res.status(400).json({ error: "Unknown variant" });
  }

  // Update user plan — look up by email
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase
    .from("users")
    .update({ plan: mapped.plan, plan_expiry: planExpiry(mapped.billing) })
    .eq("email", email);

  if (error) {
    console.error("ls-webhook supabase error:", error);
    return res.status(500).json({ error: "DB update failed" });
  }

  res.status(200).json({ success: true });
};
