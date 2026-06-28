/**
 * PageWise Cloudflare Worker — Gemini API proxy
 *
 * Deploy:  wrangler deploy
 * Secrets: wrangler secret put GEMINI_API_KEY
 */

const RATE_LIMITS = { free: 10, starter: 20, pro: 40 };
const WINDOW_MS   = 60_000; // 1 minute

// In-memory counters: ip -> { count, resetAt }
// Per-isolate — not globally consistent, but effective against burst abuse.
const ipCounters = new Map();

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonRes(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== "POST") {
      return jsonRes({ error: "Method not allowed" }, 405);
    }

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonRes({ error: "Invalid JSON body" }, 400);
    }

    // Validate request has non-empty content (rejects empty/malformed calls)
    const firstText = body?.contents?.[0]?.parts?.[0]?.text;
    if (!firstText || typeof firstText !== "string" || !firstText.trim()) {
      return jsonRes({ error: "Invalid request: missing content" }, 400);
    }

    // Extract tier for rate limiting, then strip it — Gemini rejects unknown fields
    const tier  = typeof body._tier === "string" ? body._tier : "free";
    delete body._tier;

    // Rate limiting — per IP, per minute window
    const ip    = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const limit = RATE_LIMITS[tier] ?? RATE_LIMITS.free;
    const now   = Date.now();

    let counter = ipCounters.get(ip);
    if (!counter || now >= counter.resetAt) {
      counter = { count: 0, resetAt: now + WINDOW_MS };
      ipCounters.set(ip, counter);
    }
    counter.count++;

    if (counter.count > limit) {
      return jsonRes({ error: "Rate limit exceeded. Please try again later." }, 429);
    }

    // Forward to Gemini, preserving the request path
    const url       = new URL(request.url);
    const geminiUrl = `https://generativelanguage.googleapis.com${url.pathname}?key=${env.GEMINI_API_KEY}`;

    let geminiRes;
    try {
      geminiRes = await fetch(geminiUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
    } catch {
      return jsonRes({ error: "Failed to reach Gemini API" }, 502);
    }

    const responseText = await geminiRes.text();
    return new Response(responseText, {
      status:  geminiRes.status,
      headers: {
        "Content-Type": geminiRes.headers.get("Content-Type") ?? "application/json",
        ...CORS,
      },
    });
  },
};
