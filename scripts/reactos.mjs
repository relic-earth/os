#!/usr/bin/env node
/**
 * REACTOS — prepares the real Windows-compatible environment that Relic runs
 * in the browser (v86 x86 emulator → ReactOS 0.4.15 Live CD).
 *
 *   1. downloads the official ReactOS Live CD zip from SourceForge (cached)
 *   2. extracts the ISO (single deflate entry, read via the zip central directory)
 *   3. splits it into 1 MiB parts, each zstd-compressed, so the browser fetches
 *      only the sectors ReactOS actually reads (v86 `use_parts` + `.iso.zst`)
 *   4. copies the v86 runtime (wasm) and BIOS images next to them
 *
 * Output: public/reactos/ and public/v86/ (git-ignored; rebuilt by the build).
 * ReactOS is GPL — source: https://github.com/reactos/reactos (tag 0.4.15).
 *
 * Usage: node scripts/reactos.mjs [--if-missing]
 */
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VERSION = '0.4.15'
const ZIP_URL = 'https://downloads.sourceforge.net/project/reactos/ReactOS/0.4.15/ReactOS-0.4.15-release-1-gdbb43bbaeb2-x86-live.zip'
const CHUNK = 1 << 20
const CACHE = join(ROOT, 'node_modules', '.cache', 'relic-reactos')
const OUT = join(ROOT, 'public', 'reactos')
const V86_OUT = join(ROOT, 'public', 'v86')
const MANIFEST = join(OUT, 'manifest.json')

const log = (m) => console.log(`[reactos] ${m}`)

function copyRuntime() {
  const require = createRequire(import.meta.url)
  const v86Dir = dirname(require.resolve('v86/package.json'))
  const biosDir = join(dirname(require.resolve('v86-system/package.json')), 'assets')
  mkdirSync(V86_OUT, { recursive: true })
  copyFileSync(join(v86Dir, 'build', 'v86.wasm'), join(V86_OUT, 'v86.wasm'))
  copyFileSync(join(biosDir, 'seabios.bin'), join(V86_OUT, 'seabios.bin'))
  copyFileSync(join(biosDir, 'vgabios.bin'), join(V86_OUT, 'vgabios.bin'))
}

/** Extract the single entry of a zip using its central directory (handles data descriptors). */
function extractOnlyEntry(zip) {
  let eocd = -1
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) if (zip.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) throw new Error('not a zip (no end-of-central-directory)')
  const cd = zip.readUInt32LE(eocd + 16)
  if (zip.readUInt32LE(cd) !== 0x02014b50) throw new Error('bad central directory')
  const method = zip.readUInt16LE(cd + 10)
  const compSize = zip.readUInt32LE(cd + 20)
  const size = zip.readUInt32LE(cd + 24)
  const nameLen = zip.readUInt16LE(cd + 28)
  const name = zip.toString('utf8', cd + 46, cd + 46 + nameLen)
  const local = zip.readUInt32LE(cd + 42)
  const dataStart = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28)
  const data = zip.subarray(dataStart, dataStart + compSize)
  const out = method === 0 ? data : zlib.inflateRawSync(data)
  if (out.length !== size) throw new Error(`size mismatch for ${name}: ${out.length} != ${size}`)
  return { name, data: out }
}

async function main() {
  copyRuntime()
  if (process.argv.includes('--if-missing') && existsSync(MANIFEST)) {
    const m = JSON.parse(readFileSync(MANIFEST, 'utf8'))
    if (m.version === VERSION) return log(`ReactOS ${VERSION} ready (public/reactos)`)
  }

  mkdirSync(CACHE, { recursive: true })
  const zipPath = join(CACHE, `reactos-${VERSION}-live.zip`)
  if (!existsSync(zipPath)) {
    log(`downloading ReactOS ${VERSION} Live CD (85 MB, one time)…`)
    const res = await fetch(ZIP_URL, { redirect: 'follow' })
    if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`)
    writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()))
  }

  log('extracting ISO…')
  const { name, data: iso } = extractOnlyEntry(readFileSync(zipPath))
  log(`${name}: ${(iso.length / 1e6).toFixed(0)} MB → ${Math.ceil(iso.length / CHUNK)} zstd parts`)

  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })
  let packed = 0
  for (let start = 0; start < iso.length; start += CHUNK) {
    // v86 always requests whole parts; pad the last one to the chunk size
    const part = Buffer.alloc(CHUNK)
    iso.copy(part, 0, start, Math.min(start + CHUNK, iso.length))
    const z = zlib.zstdCompressSync(part, { params: { [zlib.constants.ZSTD_c_compressionLevel]: 12 } })
    packed += z.length
    writeFileSync(join(OUT, `live-${start}-${start + CHUNK}.iso.zst`), z)
  }
  writeFileSync(MANIFEST, JSON.stringify({ version: VERSION, file: 'live.iso.zst', size: iso.length, chunk: CHUNK, packed }, null, 2))
  log(`done: ${(packed / 1e6).toFixed(0)} MB in public/reactos`)
}

main().catch((e) => {
  console.error(`[reactos] ${e.message}`)
  // never block a build: Relic still runs; the Windows app explains what is missing
  process.exitCode = 0
})
