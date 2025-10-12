addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})

// List of domains you want to BLOCK
const BLOCKED_DOMAINS = [
  'facebook.com',
  'youtube.com',
  'tiktok.com',
  'example-bad.com'
]

// Helper function: true if domain is blocked (including subdomains)
function isBlocked(hostname) {
  hostname = hostname.toLowerCase()
  return BLOCKED_DOMAINS.some(blocked =>
    hostname === blocked || hostname.endsWith('.' + blocked)
  )
}

// Main request handler
async function handle(request) {
  const url = new URL(request.url)
  const targetUrl = url.searchParams.get('u')

  if (!targetUrl) {
    return new Response('Missing ?u= URL parameter', { status: 400 })
  }

  let target
  try {
    target = new URL(targetUrl)
  } catch (e) {
    return new Response('Invalid target URL', { status: 400 })
  }

  if (isBlocked(target.hostname)) {
    return new Response('This domain is blocked by the proxy', { status: 403 })
  }

  try {
    const response = await fetch(target.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Cloudflare-Proxy-Worker'
      }
    })

    const newHeaders = new Headers(response.headers)

    // CORS headers to allow frontend access
    newHeaders.set('Access-Control-Allow-Origin', '*')
    newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    newHeaders.set('Access-Control-Allow-Headers', '*')

    // Remove headers that may block embedding or content loading
    newHeaders.delete('X-Frame-Options')
    newHeaders.delete('Content-Security-Policy')

    const body = await response.arrayBuffer()

    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    })
  } catch (err) {
    return new Response('Proxy fetch failed: ' + err.message, { status: 502 })
  }
}
