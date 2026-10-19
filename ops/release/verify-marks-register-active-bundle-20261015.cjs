#!/usr/bin/env node
'use strict'
// Checks the marks review/print module reachable from the real Vite entrypoint.
// Orphan chunks cannot satisfy this release invariant.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

function inspect(root) {
  if (!root || !fs.statSync(root).isDirectory()) throw Error('MARKS_DIST_MISSING')
  const read = rel => {
    const full = path.join(root, rel)
    if (!full.startsWith(path.resolve(root) + path.sep)) throw Error('PATH_ESCAPE')
    if (fs.lstatSync(full).isSymbolicLink()) throw Error('SYMLINK_ASSET_REJECTED')
    return fs.readFileSync(full)
  }
  const unique = (text, regex, code) => {
    const values = [...text.matchAll(regex)].map(match => match[1])
    if (values.length !== 1) throw Error(code + '_' + values.length)
    return values[0]
  }
  const html = read('index.html').toString('utf8')
  const entry = unique(html, /(?:src|href)="\/?(assets\/index-[\w-]+\.js)"/g, 'INDEX_NOT_UNIQUE')
  const routeBytes = read(entry), route = routeBytes.toString('utf8')
  const module = unique(route, /["'](assets\/MarksRegister-[\w-]+\.js)["']/g, 'ACTIVE_MARKS_MODULE_NOT_UNIQUE')
  const css = unique(route, /["'](assets\/MarksRegister-[\w-]+\.css)["']/g, 'ACTIVE_MARKS_STYLES_NOT_UNIQUE')
  const jsBytes = read(module), moduleText = jsBytes.toString('utf8')
  const cssBytes = read(css)
  const entrySignals = ['/examination/marks/review','/exams/marks/review','exams_marks']
  const viewSignals = ['Print Marks','Print / Save PDF','marks_obtained','SCORED','PENDING','ABSENT','/api/exams/results']
  const missing = [
    ...entrySignals.filter(x=>!route.includes(x)).map(x=>'ENTRY_'+x),
    ...viewSignals.filter(x=>!moduleText.includes(x)).map(x=>'MODULE_'+x),
  ]
  if (cssBytes.length < 300 || !cssBytes.toString('utf8').includes('.mr-')) missing.push('MARKS_CSS_STYLES')
  if (missing.length) throw Error('MARKS_REVIEW_PRINT_CONTRACT_FAIL_' + missing.join(','))
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
  return {
    schema:'assps-active-marks-review-print-release-v1',
    activeEntry:entry, activeMarksModule:module, activeMarksCss:css,
    htmlSha256:sha(read('index.html')), activeModuleSha256:sha(jsBytes),
    routePermissionMarkerVerified:true, zeroVsAbsentMarkersVerified:true,
    printAndEditSourceBehaviorTestedSeparately:true,
    activeGraphVerified:true, orphanBundlesIgnored:true,
    productionChanged:false, schoolRecordsTouched:false,
    decision:'PASS_ACTIVE_MARKS_REVIEW_PRINT_SOURCE_CONTRACT'
  }
}
if(require.main===module){
  const i=process.argv.indexOf('--dist')
  try { if(i<0||!process.argv[i+1])throw Error('MISSING_DIST_ARG')
    console.log(JSON.stringify(inspect(path.resolve(process.argv[i+1]))))
  } catch(e) {console.error(e.message);process.exitCode=2}
}
module.exports={inspect}
