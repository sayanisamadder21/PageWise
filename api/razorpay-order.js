const Razorpay = require("razorpay");

const AMOUNTS = {
  "starter-monthly": 19900,
  "starter-yearly":  199000,
  "pro-monthly":     49900,
  "pro-yearly":      499000,
};

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

  try {
    const instance = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await instance.orders.create({
      amount,
      currency: "INR",
      receipt:  `pw_${Date.now()}`,
    });

    res.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("razorpay-order error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
};
