const crypto           = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// Disable Vercel body parsing — HMAC must be computed over the raw request bytes.
module.exports.config = { api: { bodyParser: false } };

// Events this handler acts on. All others receive a 200 acknowledgement and are ignored.
const HANDLED_EVENTS = new Set([
  "order_created",
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
]);

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end",  () => resolve(data));
    req.on("error", reject);
  });
}

function variantMap() {
  return {
    [process.env.VITE_LS_STARTER_MONTHLY_ID]: { plan: "starter", billing: "monthly" },
    [process.env.VITE_LS_STARTER_YEARLY_ID]:  { plan: "starter", billing: "yearly"  },
    [process.env.VITE_LS_PRO_MONTHLY_ID]:     { plan: "pro",     billing: "monthly" },
    [process.env.VITE_LS_PRO_YEARLY_ID]:      { plan: "pro",     billing: "yearly"  },
  };
}

// Update the user's plan. Tries Supabase user ID first, falls back to email.
// Uses service role key — bypasses RLS entirely.
// Returns "ok", "not_found", or throws on DB error.
async function updateUser(userId, email, plan, planExpiry) {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY   // service role — bypasses RLS; never use anon key here
  );

  const update = { plan, plan_expiry: planExpiry };

  if (userId) {
    console.log("ls-webhook: updating by userId", userId, "→ plan:", plan, "expiry:", planExpiry);
    const { data, error } = await supabase
      .from("users")
      .update(update)
      .eq("id", userId)
      .select("id, plan, plan_expiry");   // fetch updated row so we see what was written
    if (error) {
      console.error("ls-webhook: supabase error (by userId):", JSON.stringify(error));
      throw Object.assign(new Error("DB update failed"), { cause: error });
    }
    if (!data || data.length === 0) {
      console.error("ls-webhook: no row matched users.id =", userId, "— falling back to email");
      // Fall through to email path below
    } else {
      console.log("ls-webhook: update result by userId →", JSON.stringify(data));
      return;
    }
  }

  if (email) {
    console.log("ls-webhook: updating by email", email, "→ plan:", plan, "expiry:", planExpiry);
    const { data, error } = await supabase
      .from("users")
      .update(update)
      .eq("email", email)
      .select("id, plan, plan_expiry");   // fetch updated row so we see what was written
    if (error) {
      console.error("ls-webhook: supabase error (by email):", JSON.stringify(error));
      throw Object.assign(new Error("DB update failed"), { cause: error });
    }
    if (!data || data.length === 0) {
      console.error("ls-webhook: no row matched users.email =", email);
      throw new Error("User not found in DB (neither by userId nor email)");
    }
    console.log("ls-webhook: update result by email →", JSON.stringify(data));
    return;
  }

  throw new Error("ls-webhook: event has neither custom_data.user_id nor user_email");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await readRawBody(req);

  // ── Signature verification ────────────────────────────────────────────────
  // Env var name: LS_WEBHOOK_SECRET  (add this exact name in Vercel)
  const secret = process.env.LS_WEBHOOK_SECRET ?? "";
  if (!secret) {
    console.error("ls-webhook: LS_WEBHOOK_SECRET is not configured");
    return res.status(500).end();
  }

  const signature = req.headers["x-signature"] ?? "";
  const digest    = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  // timingSafeEqual requires equal-length buffers; mismatched length = invalid sig.
  const digestBuf = Buffer.from(digest);
  const sigBuf    = Buffer.from(signature);
  const sigValid  = digestBuf.length === sigBuf.length &&
                    crypto.timingSafeEqual(digestBuf, sigBuf);

  if (!sigValid) {
    console.error("ls-webhook: invalid signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  // ── Parse event ───────────────────────────────────────────────────────────
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const eventName = event.meta?.event_name;

  // Dump full meta + top-level data attributes so we can verify custom_data path in logs.
  console.log("ls-webhook: RAW meta     →", JSON.stringify(event.meta ?? {}));
  console.log("ls-webhook: RAW attrs    →", JSON.stringify(event.data?.attributes ?? {}));

  if (!HANDLED_EVENTS.has(eventName)) {
    return res.status(200).json({ received: true });
  }

  const attrs = event.data?.attributes ?? {};

  // LS places checkout_data.custom in meta.custom_data for order events.
  // For subscription events it also appears there, but log both paths for diagnosis.
  const userId = event.meta?.custom_data?.user_id || null;
  const email  = attrs.user_email || null;

  console.log("ls-webhook: event", eventName, "| userId:", userId, "| email:", email);

  // ── Resolve variant → plan ────────────────────────────────────────────────
  // order_created:          variant is inside first_order_item
  // subscription_* events:  variant_id is a direct attribute
  const rawVariantId = eventName === "order_created"
    ? attrs.first_order_item?.variant_id
    : attrs.variant_id;

  const variantId = String(rawVariantId ?? "");
  const VMAP      = variantMap();
  const mapped    = VMAP[variantId];

  if (!mapped) {
    console.error("ls-webhook: unknown variantId", variantId, "for event", eventName,
      "| known variants:", Object.keys(variantMap()).filter(Boolean));
    return res.status(400).json({ error: "Unknown variant" });
  }

  console.log("ls-webhook: variantId", variantId, "→ plan:", mapped.plan, "billing:", mapped.billing);

  // ── Determine plan expiry ─────────────────────────────────────────────────
  let planExpiry;

  if (eventName === "subscription_cancelled") {
    // Keep plan active until the end of the paid period, then let it lapse.
    // ends_at is null if the subscription cancels immediately — fall back to now.
    planExpiry = attrs.ends_at ?? new Date().toISOString();
  } else if (eventName === "order_created") {
    // One-time purchase: calculated from now.
    const d = new Date();
    mapped.billing === "yearly"
      ? d.setFullYear(d.getFullYear() + 1)
      : d.setMonth(d.getMonth() + 1);
    planExpiry = d.toISOString();
  } else {
    // subscription_created / subscription_updated: use LS's renews_at as source of truth.
    if (attrs.renews_at) {
      planExpiry = attrs.renews_at;
    } else {
      const d = new Date();
      mapped.billing === "yearly"
        ? d.setFullYear(d.getFullYear() + 1)
        : d.setMonth(d.getMonth() + 1);
      planExpiry = d.toISOString();
    }
  }

  // ── Update Supabase ───────────────────────────────────────────────────────
  // For subscription_cancelled we keep the current plan name but shorten its expiry.
  // getCurrentTier() will return "free" once plan_expiry has passed.
  try {
    await updateUser(userId, email, mapped.plan, planExpiry);
  } catch (err) {
    console.error("ls-webhook DB error:", err.message, err.cause ?? "");
    return res.status(500).json({ error: "DB update failed" });
  }

  return res.status(200).json({ success: true });
};
