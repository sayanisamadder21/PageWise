// DEV-ONLY: validates a candidate key against the DEV_ACCESS_KEY server-side env var.
// This is the single gatekeeper for all debug/developer overrides in PageWise.
// DEV_ACCESS_KEY must NEVER appear in any VITE_ prefixed env var or the frontend bundle.
// Always returns { valid: true|false } — never exposes hints, errors, or the expected key value.

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  const { key } = req.body ?? {};
  const secret  = process.env.DEV_ACCESS_KEY;

  // Silently deny if DEV_ACCESS_KEY is not configured or key doesn't match.
  // Constant-time comparison is overkill here (key lives in URL), but we never reveal why.
  if (!secret || !key || key !== secret) {
    return res.json({ valid: false });
  }

  return res.json({ valid: true });
};
