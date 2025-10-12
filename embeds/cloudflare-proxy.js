/**
 * Robust Cloudflare Worker proxy with browser-like header spoofing and retry
 *
 * Usage:
 *  https://<worker>.workers.dev/?u=https://example.com/path
 *
 * Features:
 *  - CORS support + OPTIONS preflight handling
 *  - HTTPS enforcement
 *  - Domain blacklist (blocks subdomains too)
 *  - Rotating User-Agent list (randomized)
 *  - Browser-like headers: Accept, Accept-Language, Referer, Sec-Fetch-*
 *  - Retry once with a different UA if initial fetch returns error or 403/429
 *  - Optionally strips X-Frame-Options / CSP to allow embedding
 *
 * Tweak BLOCKED_DOMAINS, ALLOW_EMBEDDING, and RETRY_ON_FAILURE as needed.
 */

const BLOCKED_DOMAINS = ['facebook.com', 'youtube.com', 'tiktok.com'];
const ENABLE_CORS = true;
const ALLOW_EMBEDDING = true; // if true, remove X-Frame-Options & CSP
const RETRY_ON_FAILURE = true; // retry once on network error or 403/429
const MAX_BODY_SIZE = 8 * 1024 * 1024; // optional guard (8MB)

// Small set of modern browser-like User-Agents (rotate/randomize)
const USER_AGENTS = [
  // Chrome on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  // Chrome on Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  // Firefox on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  // Safari on iOS
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
]

// Utility: pick a random UA
function pickUserAgent(excludeUa) {
  const list = USER_AGENTS.slice()
  if (excludeUa) {
    const idx = list.indexOf(excludeUa)
    if (idx !== -1) list.splice(idx, 1)
  }
  return list[Math.floor(Math.random() * list.length)]
}

// Helper: check blocked domains including subdomains
function isBlocked(hostname) {
  const hn = hostname.toLowerCase()
  return BLOCKED_DOMAINS.some(blocked =>
    hn === blocked || hn.endsWith('.' + blocked)
  )
}

// CORS preflight response
function optionsResponse() {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400'
  }
  return new Response(null, { status: 204, headers })
}

addEventListener('fetch', event => {
  const req = event.request
  if (req.method === 'OPTIONS') {
    event.respondWith(optionsResponse())
  } else {
    event.respondWith(handleRequest(req))
  }
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const targetParam = url.searchParams.get('u')
  if (!targetParam) {
    return new Response('Error: missing ?u= parameter (target URL)', { status: 400 })
  }

  let target
  try {
    target = new URL(targetParam)
  } catch (err) {
    return new Response('Error: invalid target URL', { status: 400 })
  }

  // enforce https
  if (target.protocol !== 'https:') {
    return new Response('Error: only HTTPS targets allowed', { status: 400 })
  }

  if (isBlocked(target.hostname)) {
    return new Response('Error: blocked domain', { status: 403 })
  }

  const initialUA = pickUserAgent()
  try {
    // try main fetch + optional retry
    const resp = await fetchWithSpoof(target, { userAgent: initialUA })
    if (shouldRetry(resp) && RETRY_ON_FAILURE) {
      const altUA = pickUserAgent(initialUA)
      try {
        const retryResp = await fetchWithSpoof(target, { userAgent: altUA })
        return retryResp
      } catch (reErr) {
        // fall through to return original resp if we can
      }
    }
    return resp
  } catch (err) {
    // network level error, try one retry if enabled
    if (RETRY_ON_FAILURE) {
      const altUA = pickUserAgent(initialUA)
      try {
        const retryResp = await fetchWithSpoof(target, { userAgent: altUA })
        return retryResp
      } catch (retryErr) {
        return new Response('Error: fetch failed after retry: ' + retryErr.message, { status: 502 })
      }
    }
    return new Response('Error: fetch failed: ' + err.message, { status: 502 })
  }
}

// Return true if we should attempt retry (e.g., 403 Forbidden, 429 Too Many Requests)
function shouldRetry(response) {
  if (!response) return true
  return response.status === 403 || response.status === 429 || response.status >= 500
}

async function fetchWithSpoof(target, opts = {}) {
  const ua = opts.userAgent || pickUserAgent()
  // Build browser-like header set
  const headers = {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    // Provide a plausible Referer (the origin of the target)
    'Referer': target.origin + '/',
    // Some sites look for these Fetch metadata headers; we add plausible values
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    // Optional Accept-Encoding left out since Cloudflare/fetch handles compression
  }

  const fetchOptions = {
    method: 'GET',
    headers,
    // Don't send credentials
    redirect: 'follow'
  }

  const upstream = await fetch(target.toString(), fetchOptions)

  // Copy headers, then modify
  const newHeaders = new Headers(upstream.headers)

  // Attach CORS for client-side JS
  if (ENABLE_CORS) {
    newHeaders.set('Access-Control-Allow-Origin', '*')
    newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    newHeaders.set('Access-Control-Allow-Headers', '*')
  }

  if (ALLOW_EMBEDDING) {
    newHeaders.delete('X-Frame-Options')
    newHeaders.delete('Content-Security-Policy')
    // some servers use 'frame-options' variants — try to remove common ones
    newHeaders.delete('frame-options')
  }

  // Defensive: prevent huge bodies from being proxied if desired
  // (Cloudflare has response size limits too — adjust as needed)
  const arrBuf = await upstream.arrayBuffer()
  if (arrBuf.byteLength > MAX_BODY_SIZE) {
    return new Response('Error: upstream response too large', { status: 413 })
  }

  return new Response(arrBuf, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: newHeaders
  })
}
