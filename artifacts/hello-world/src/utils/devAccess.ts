// DEV-ONLY: shared helper for gating developer/debug overrides.
//
// How it works:
//   1. Developer appends ?dev_key=<secret> to the URL.
//   2. isDevAccessGranted() sends the candidate key to /api/dev-validate (POST).
//   3. The server compares it to DEV_ACCESS_KEY (a Vercel env var, never in the bundle).
//   4. Returns true only if the server confirms a match.
//
// Security guarantee: DEV_ACCESS_KEY never appears in the frontend bundle.
// The URL param is visible in browser history/network logs — acceptable for developer use.
// For normal users without ?dev_key in the URL, this short-circuits without any network call.

let _cache: boolean | null = null;

/** Read a named query-string param from the current URL. */
export function getDevParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Returns true if the current URL's ?dev_key= is validated by the server.
 * Result is cached for the lifetime of the page — only one network round-trip per load.
 */
export async function isDevAccessGranted(): Promise<boolean> {
  if (_cache !== null) return _cache;

  const key = getDevParam("dev_key");
  if (!key) {
    _cache = false;
    return false;
  }

  try {
    const res  = await fetch("/api/dev-validate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ key }),
    });
    const data = await res.json();
    _cache = data.valid === true;
  } catch {
    _cache = false;
  }

  return _cache;
}
