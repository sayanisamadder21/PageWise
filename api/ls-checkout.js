// Server-side Lemon Squeezy checkout creation.
// Calls the LS Checkouts API to get a real UUID-based checkout URL.
// LEMON_SQUEEZY_API_KEY and LS_STORE_ID must never be exposed to the frontend.

const https = require("https");

// Maps plan+billing keys to the LS variant ID env vars (server-side only).
function getVariantId(plan, billing) {
  const map = {
    "starter-monthly": process.env.LS_STARTER_MONTHLY_ID,
    "starter-yearly":  process.env.LS_STARTER_YEARLY_ID,
    "pro-monthly":     process.env.LS_PRO_MONTHLY_ID,
    "pro-yearly":      process.env.LS_PRO_YEARLY_ID,
  };
  return map[`${plan}-${billing}`];
}

function lsRequest(body, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: "api.lemonsqueezy.com",
        path:     "/v1/checkouts",
        method:   "POST",
        headers: {
          "Accept":         "application/vnd.api+json",
          "Content-Type":   "application/vnd.api+json",
          "Authorization":  `Bearer ${apiKey}`,
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400) {
              const detail = parsed.errors?.[0]?.detail ?? `HTTP ${res.statusCode}`;
              reject(new Error(detail));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(new Error("Invalid JSON from Lemon Squeezy API"));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { plan, billing, email, userId } = req.body ?? {};
  if (!plan || !billing) return res.status(400).json({ error: "Missing plan or billing" });

  const apiKey    = process.env.LEMON_SQUEEZY_API_KEY;
  const storeId   = process.env.LS_STORE_ID;
  const variantId = getVariantId(plan, billing);

  if (!apiKey || !storeId) {
    console.error("ls-checkout: missing LEMON_SQUEEZY_API_KEY or LS_STORE_ID");
    return res.status(500).json({ error: "Checkout not configured" });
  }
  if (!variantId) {
    console.error("ls-checkout: no variant ID for", plan, billing);
    return res.status(400).json({ error: "Unknown plan or billing period" });
  }

  const appUrl = process.env.APP_URL ?? "https://getpagewise.vercel.app";

  try {
    const lsRes = await lsRequest(
      {
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              ...(email ? { email } : {}),
              custom: { user_id: userId ?? "" },
            },
            product_options: {
              redirect_url: appUrl,
            },
          },
          relationships: {
            store: {
              data: { type: "stores", id: String(storeId) },
            },
            variant: {
              data: { type: "variants", id: String(variantId) },
            },
          },
        },
      },
      apiKey
    );

    const checkoutUrl = lsRes.data?.attributes?.url;
    if (!checkoutUrl) {
      console.error("ls-checkout: no url in LS response", JSON.stringify(lsRes));
      return res.status(500).json({ error: "Failed to get checkout URL from Lemon Squeezy" });
    }

    res.json({ url: checkoutUrl });
  } catch (err) {
    console.error("ls-checkout error:", err.message ?? err);
    res.status(502).json({ error: err.message ?? "Failed to create checkout" });
  }
};
