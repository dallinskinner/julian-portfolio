// Anonymous, free hit counter — https://github.com/JasonCameron/abacus
// No account/API key needed. Best-effort only: failures are swallowed so a
// slow or dead counter service never breaks the site.
const NAMESPACE = "julianskinner-portfolio";
const KEY = "visits";
const BASE = "https://abacus.jasoncameron.dev";
const SESSION_FLAG = "counted-visit";

interface CounterResponse {
  value: number;
}

/** Increments the counter at most once per browser tab session. */
export async function recordVisit(): Promise<void> {
  try {
    if (sessionStorage.getItem(SESSION_FLAG)) return;
    sessionStorage.setItem(SESSION_FLAG, "1");
  } catch {
    // sessionStorage unavailable (e.g. private browsing); still attempt the hit below.
  }
  try {
    await fetch(`${BASE}/hit/${NAMESPACE}/${KEY}`);
  } catch {
    // offline, ad-blocker, or the service is down — not worth surfacing to the visitor.
  }
}

/**
 * Clears this browser's "already counted" flag so the next page load counts
 * as a visit again. This only affects the current browser — there's no way
 * to reset the shared global count from a static site without embedding a
 * secret admin key in the public JS bundle, which would let any visitor
 * reset (or overwrite) it too.
 */
export function resetLocalVisitFlag(): void {
  try {
    sessionStorage.removeItem(SESSION_FLAG);
  } catch {
    // sessionStorage unavailable; nothing to clear.
  }
}

export async function getVisitCount(): Promise<number | null> {
  try {
    const res = await fetch(`${BASE}/get/${NAMESPACE}/${KEY}`);
    if (!res.ok) return null;
    const data = (await res.json()) as CounterResponse;
    return typeof data.value === "number" ? data.value : null;
  } catch {
    return null;
  }
}
