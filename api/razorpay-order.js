const https = require("https");

const AMOUNTS = {
  "starter-monthly": 19900,
  "starter-yearly":  199000,
  "pro-monthly":     49900,
  "pro-yearly":      499000,
};

function createOrder({ amount, currency, receipt, keyId, keySecret }) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ amount, currency, receipt });
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const req = https.request(
      {
        hostname: "api.razorpay.com",
        path: "/v1/orders",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${auth}`,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(parsed.error?.description ?? `HTTP ${res.statusCode}`));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { plan, billing } = req.body ?? {};
  if (!plan || !billing) return res.status(400).json({ error: "Missing plan or billing" });

  const key = `${plan}-${billing}`;
  const amount = AMOUNTS[key];
  if (!amount) return res.status(400).json({ error: "Invalid plan/billing combination" });

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error("razorpay-order: missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET");
    return res.status(500).json({ error: "Payment not configured" });
  }

  try {
    const order = await createOrder({
      amount,
      currency: "INR",
      receipt: `pw_${Date.now()}`,
      keyId,
      keySecret,
    });

    res.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (err) {
    console.error("razorpay-order error:", err.message ?? err);
    res.status(500).json({ error: "Failed to create order" });
  }
};
