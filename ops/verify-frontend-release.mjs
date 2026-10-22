#!/usr/bin/env node
// Verifies Vite release references. No database or production writes.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.resolve(process.argv[2] || path.join(repo, 'al-siddique-frontend', 'dist'))
const fail = (reason) => { throw new Error('RELEASE REJECTED: ' + reason) }
const read = (file) => {
  if (!fs.existsSync(file)) fail('Missing asset: ' + file)
  return fs.readFileSync(file, 'utf8')
}

function verify() {
  const html = read(path.join(dist, 'index.html'))
  const match = html.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+\.js)["']/i)
  if (!match || !match[1].startsWith('/assets/index-')) fail('Missing immutable main entry')
  const entryName = path.basename(match[1])
  read(path.join(dist, match[1].slice(1)))
  const assets = path.join(dist, 'assets')
  if (!fs.existsSync(assets)) fail('Assets folder missing')
  const files = fs.readdirSync(assets).filter(x => x.endsWith('.js'))
  if (files.length < 2) fail('Expected entry and lazy chunks')
  let importsCount = 0, entryReferences = 0
  for (const file of files) {
    const js = read(path.join(assets, file))
    const refs = [
      ...js.matchAll(/\bfrom\s*["'](\.\.?\/[^"']+\.js)["']/g),
      ...js.matchAll(/\bimport\s*["'](\.\.?\/[^"']+\.js)["']/g),
      ...js.matchAll(/\bimport\s*\(\s*["'`](\.\.?\/[^"'`]+\.js)["'`]\s*\)/g),
    ]
    for (const match of refs) {
      const target = path.resolve(assets, match[1])
      if (!target.startsWith(assets + path.sep)) fail('Invalid import path: ' + file)
      if (!fs.existsSync(target)) fail(file + ' references missing ' + match[1])
      importsCount++
      const leaf = path.basename(match[1])
      if (/^index-[\w-]+\.js$/.test(leaf)) {
        entryReferences++
        if (leaf !== entryName) fail(file + ' imports ' + leaf + ' while HTML loads ' + entryName)
      }
    }
  }
  const htmlAssets = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)]
  for (const entry of htmlAssets) read(path.join(dist, entry[1].slice(1)))
  console.log(JSON.stringify({result:'PASS',entry:entryName,scannedJs:files.length,imports:importsCount,contextEntryRefs:entryReferences,htmlAssets:htmlAssets.length}))
}
try { verify() } catch(e) { console.error(e.message); process.exitCode=1 }
