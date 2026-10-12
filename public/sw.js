/* Relic OS service worker — installable, opens offline, never caches the heavy Windows/ReactOS payloads. */
const VERSION = 'relic-os-v1'
const SHELL = `${VERSION}-shell`
const ASSETS = `${VERSION}-assets`
const BASE = new URL('./', self.location).pathname
const PRECACHE = ['./', 'manifest.webmanifest', 'brand/icon-192.png', 'brand/icon-512.png', 'brand/apple-touch-icon.png', 'brand/relic-mark.svg']
// big, range-requested or emulator files: always straight to the network
const SKIP = /\/(windows|reactos|v86)\/|\.(mp4|webm|zst)$/i

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || req.headers.has('range')) return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE) || SKIP.test(url.pathname)) return

  // page loads: network first so a new deploy shows up at once, cached shell when offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(SHELL).then((c) => c.put('./', copy))
          return res
        })
        .catch(() => caches.match('./')),
    )
    return
  }

  // hashed build files and fonts never change under the same name: cache first
  // everything else (wallpapers, icons): serve cached, refresh in the background
  const hashed = /\/assets\//.test(url.pathname)
  e.respondWith(
    caches.open(ASSETS).then(async (cache) => {
      const hit = await cache.match(req)
      if (hit && hashed) return hit
      const net = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone())
          return res
        })
        .catch(() => hit)
      return hit || net
    }),
  )
})
