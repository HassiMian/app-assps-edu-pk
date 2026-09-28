// urduEmergencyRecovery.test.js — Unit Tests for Urdu Layout Recovery & Jameel Print Parity (2026-09-27)
import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolvePaperRoute, isUrduScriptPaper, URDU_FONT_STACK } from '../../resolvePaperRoute.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('URDU RECOVERY 1: isUrduScriptPaper correctly identifies all Urdu-script subjects', () => {
  // Urdu subjects
  assert.strictEqual(isUrduScriptPaper({ name: 'First Term Examination 2026 - Class 8 - Urdu' }), true)
  assert.strictEqual(isUrduScriptPaper({ config: { subject: 'Urdu', language: 'urdu' } }), true)
  assert.strictEqual(isUrduScriptPaper({ config: { subjectName: 'اردو لازمی' } }), true)
  
  // Islamiyat
  assert.strictEqual(isUrduScriptPaper({ name: 'First Term Examination 2026 - Class 8 - Islamiyat' }), true)
  assert.strictEqual(isUrduScriptPaper({ config: { subject: 'Islamiyat' } }), true)
  assert.strictEqual(isUrduScriptPaper({ config: { subject: 'Islamiat' } }), true)
  assert.strictEqual(isUrduScriptPaper({ config: { subjectName: 'اسلامیات' } }), true)

  // Pakistan Studies / Social Studies Urdu
  assert.strictEqual(isUrduScriptPaper({ name: 'First Term Examination 2026 - Class 8 - Pakistan Studies' }), true)
  assert.strictEqual(isUrduScriptPaper({ config: { subject: 'Pak Studies' } }), true)
  assert.strictEqual(isUrduScriptPaper({ config: { subjectName: 'مطالعہ پاکستان' } }), true)

  // Tarjuma-tul-Quran
  assert.strictEqual(isUrduScriptPaper({ name: 'First Term Examination 2026 - Class 8 - Tarjuma-tul-Quran' }), true)
  assert.strictEqual(isUrduScriptPaper({ config: { subject: 'Tarjuma-tul-Quran' } }), true)
  assert.strictEqual(isUrduScriptPaper({ config: { subject: 'Quran' } }), true)

  // Non-Urdu subjects
  assert.strictEqual(isUrduScriptPaper({ name: 'First Term Examination 2026 - Class 5 - English', config: { subject: 'English', language: 'english' } }), false)
  assert.strictEqual(isUrduScriptPaper({ name: 'First Term Examination 2026 - Class 7 - English', config: { subject: 'English', language: 'english' } }), false)
  assert.strictEqual(isUrduScriptPaper({ name: 'First Term Examination 2026 - Class 6 - Mathematics', config: { subject: 'Mathematics', language: 'english' } }), false)
  assert.strictEqual(isUrduScriptPaper({ name: 'First Term Examination 2026 - Class 6 - Science', config: { subject: 'Science', language: 'english' } }), false)
})

test('URDU RECOVERY 2: Urdu-script V13 papers use canonical editor; legacy V12 remains build', () => {
  const class8Urdu = {
    id: 'official-first-term-2026-class-8-urdu',
    name: 'First Term Examination 2026 - Class 8 - Urdu',
    documentFormat: 'pts-native-v13',
    config: { classLevel: '8', subject: 'Urdu', language: 'urdu' },
  }
  assert.strictEqual(resolvePaperRoute(class8Urdu), 'word_editor')

  const class5Urdu = {
    id: 'official-first-term-2026-class-5-urdu',
    name: 'First Term Examination 2026 - Class 5 - Urdu',
    documentFormat: 'official-v12',
    config: { classLevel: '5', subject: 'Urdu', language: 'urdu' },
  }
  assert.strictEqual(resolvePaperRoute(class5Urdu), 'build')

  const islamiyatPaper = {
    id: 'official-first-term-2026-class-8-islamiyat',
    name: 'First Term Examination 2026 - Class 8 - Islamiyat',
    documentFormat: 'pts-native-v13',
    config: { classLevel: '8', subject: 'Islamiyat' },
  }
  assert.strictEqual(resolvePaperRoute(islamiyatPaper), 'word_editor')

  const pakStudiesPaper = {
    id: 'official-first-term-2026-class-8-pak-studies',
    name: 'First Term Examination 2026 - Class 8 - Pakistan Studies',
    documentFormat: 'pts-native-v13',
    config: { classLevel: '8', subject: 'Pak Studies' },
  }
  assert.strictEqual(resolvePaperRoute(pakStudiesPaper), 'word_editor')

  const quranPaper = {
    id: 'official-first-term-2026-class-8-tarjuma-tul-quran',
    name: 'First Term Examination 2026 - Class 8 - Tarjuma-tul-Quran',
    documentFormat: 'pts-native-v13',
    config: { classLevel: '8', subject: 'Tarjuma-tul-Quran' },
  }
  assert.strictEqual(resolvePaperRoute(quranPaper), 'word_editor')
})

test('URDU RECOVERY 3: Urdu-script V13 uses canonical route and retains emergency stable-workspace rollback', () => {
  const class8Urdu = {
    id: 'official-first-term-2026-class-8-urdu',
    name: 'First Term Examination 2026 - Class 8 - Urdu',
    documentFormat: 'pts-native-v13',
    config: { classLevel: '8', subject: 'Urdu', language: 'urdu' },
  }
  assert.strictEqual(resolvePaperRoute(class8Urdu, 'word_editor'), 'word_editor')
  assert.strictEqual(
    resolvePaperRoute(class8Urdu, null, { forceOfficialLegacyRoute: true }),
    'build'
  )
})

test('URDU RECOVERY 4: English official V13 papers share the canonical editor default after cutover', () => {
  const class5English = {
    id: 'official-first-term-2026-class-5-english',
    name: 'First Term Examination 2026 - Class 5 - English',
    documentFormat: 'pts-native-v13',
    config: { classLevel: '5', subject: 'English', language: 'english' },
  }
  assert.strictEqual(resolvePaperRoute(class5English), 'word_editor')

  const class7English = {
    id: 'official-first-term-2026-class-7-english',
    name: 'First Term Examination 2026 - Class 7 - English',
    documentFormat: 'pts-native-v13',
    config: { classLevel: '7', subject: 'English', language: 'english' },
  }
  assert.strictEqual(resolvePaperRoute(class7English), 'word_editor')
})

test('URDU RECOVERY 5: Early Years papers strictly retain early_years route', () => {
  assert.strictEqual(resolvePaperRoute({ id: 'ey-p1', classStage: 'starter' }), 'early_years')
  assert.strictEqual(resolvePaperRoute({ id: 'ey-p2', classStage: 'mover' }), 'early_years')
  assert.strictEqual(resolvePaperRoute({ id: 'ey-p3', classStage: 'flyer' }), 'early_years')
})

test('URDU RECOVERY 6: Jameel Noori font precedes Noto Nastaliq in all stacks', () => {
  // 1. PTSPaperGenerator URDU_FONT_STACK
  assert.ok(URDU_FONT_STACK.includes('ASSPS Jameel Noori'))
  assert.ok(URDU_FONT_STACK.includes('Jameel Noori Nastaleeq'))
  assert.ok(
    URDU_FONT_STACK.indexOf('Jameel Noori Nastaleeq') < URDU_FONT_STACK.indexOf('Noto Nastaliq Urdu'),
    'Jameel must precede Noto in legacy stack'
  )

  // 2. canonicalEditor.css
  const cssPath = path.resolve(__dirname, '../editorV2/canonicalEditor.css')
  const css = fs.readFileSync(cssPath, 'utf-8')
  assert.ok(css.includes('--canonical-font-ur:'), 'CSS has --canonical-font-ur')
  const jameelIdx = css.indexOf("'Jameel Noori Nastaleeq'")
  const notoIdx = css.indexOf("'Noto Nastaliq Urdu'")
  assert.ok(jameelIdx > 0 && notoIdx > 0 && jameelIdx < notoIdx, 'Jameel must precede Noto in canonicalEditor.css')

  // 3. index.css
  const indexCssPath = path.resolve(__dirname, '../../../../index.css')
  const indexCss = fs.readFileSync(indexCssPath, 'utf-8')
  assert.ok(indexCss.includes('--font-urdu:'), 'index.css has --font-urdu')
  const idxJameel = indexCss.indexOf("'Jameel Noori Nastaleeq'")
  const idxNoto = indexCss.indexOf("'Noto Nastaliq Urdu'")
  assert.ok(idxJameel > 0 && idxNoto > 0 && idxJameel < idxNoto, 'Jameel must precede Noto in index.css')
})
