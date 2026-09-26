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
