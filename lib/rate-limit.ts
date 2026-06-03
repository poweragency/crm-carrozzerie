// Rate limiter.
//
// - rateLimit()            → fixed-window IN-MEMORY (single-process). Resta la
//                            fonte di verità per i test e funge da fallback.
// - rateLimitDistributed() → usa Upstash Redis REST se configurato
//                            (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN),
//                            così il limite è condiviso tra le istanze serverless.
//                            Se le env var mancano o Redis non risponde, fa
//                            fallback trasparente all'in-memory: nessun endpoint
//                            si rompe per una mis-config o un disservizio Redis.

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const b = store.get(key);
  if (!b || b.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.max - 1, retryAfterSec: 0 };
  }
  if (b.count >= opts.max) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((b.resetAt - now) / 1000),
    };
  }
  b.count += 1;
  return { ok: true, remaining: opts.max - b.count, retryAfterSec: 0 };
}

/**
 * Rate limit distribuito (Upstash Redis REST) con fallback in-memory.
 * Stessa semantica fixed-window di `rateLimit`. Non lancia mai: in caso di
 * errore di rete/config torna al contatore in-memory così l'endpoint resta vivo.
 */
export async function rateLimitDistributed(
  key: string,
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    // Upstash non configurato → comportamento attuale (in-memory per-istanza).
    return rateLimit(key, opts);
  }

  const redisKey = `rl:${key}`;
  try {
    // Pipeline atomica: INCR + (PEXPIRE solo alla prima richiesta) + PTTL.
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["PEXPIRE", redisKey, opts.windowMs, "NX"],
        ["PTTL", redisKey],
      ]),
      // Non bloccare la richiesta utente se Redis è lento/giù.
      signal: AbortSignal.timeout(1500),
    });

    if (!res.ok) return rateLimit(key, opts);

    const data = (await res.json()) as Array<{ result?: number }>;
    const count = Number(data[0]?.result ?? 0);
    const ttlMs = Number(data[2]?.result ?? opts.windowMs);
    const retryAfterSec =
      ttlMs > 0 ? Math.ceil(ttlMs / 1000) : Math.ceil(opts.windowMs / 1000);

    if (count > opts.max) {
      return { ok: false, remaining: 0, retryAfterSec };
    }
    return { ok: true, remaining: Math.max(0, opts.max - count), retryAfterSec: 0 };
  } catch {
    // Timeout / rete / risposta malformata → fallback in-memory.
    return rateLimit(key, opts);
  }
}

export function getClientIp(req: Request | { headers: Headers }): string {
  const h = req.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? "unknown";
  const real = h.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
