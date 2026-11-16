const buckets = new Map<string, { count: number; until: number }>();
const windowMs = 60_000;

export function localRequestLimit(key: string, limit = 120, now = Date.now()) {
  let bucket = buckets.get(key);
  if (!bucket || bucket.until <= now) {
    if (buckets.size >= 10000) {
      for (const [storedKey, value] of buckets) if (value.until <= now) buckets.delete(storedKey);
      if (buckets.size >= 10000 && !buckets.has(key)) return false;
    }
    bucket = { count: 0, until: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

export async function requestLimit(key: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url && !token) return localRequestLimit(key);
  if (!url || !token || !url.startsWith('https://')) throw new Error('Rate limiter not configured');
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      'EVAL',
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",
      '1',
      'et:api:' + key,
    ]),
    signal: AbortSignal.timeout(2000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Rate limiter unavailable');
  const body = await response.json();
  if (body.error || !Number.isInteger(body.result) || body.result < 1)
    throw new Error('Invalid rate limiter response');
  return body.result <= 120;
}

export function blockedProbe(path: string) {
  return (
    /^\/(?:wp-admin|wp-includes|\.git|\.env|vendor\/phpunit)(?:[/.]|$)/i.test(path) ||
    /^\/(?:wp-login|xmlrpc)\.php$/i.test(path)
  );
}
