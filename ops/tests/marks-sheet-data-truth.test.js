const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const source = fs.readFileSync(path.resolve(__dirname, '../../al-siddique-frontend/src/Modules/examination/MarksSheet.jsx'), 'utf8')

test('manual catalog refresh preserves roster and marks when exam refresh fails', () => {
  const refresh = source.match(/const refreshData = async \(\) => \{([\s\S]*?)\n \}/)?.[1] || ''
  assert.match(refresh, /const refreshed = await loadExams\(\)/)
  assert.match(refresh, /if \(refreshed\) resetRoster\(\)/)
  assert.doesNotMatch(refresh, /setStudents\(\[\]\)|setMarks\(\{\}\)/)
  const reset = source.match(/const resetRoster = \(\) => \{([\s\S]*?)\n \}/)?.[1] || ''
  assert.match(reset, /setStudents\(\[\]\)/)
  assert.match(reset, /setMarks\(\{\}\)/)
})

test('roster search refuses saving while revalidation is in progress', () => {
  const search = source.match(/const searchStudents = async \(\) => \{([\s\S]*?)\n \}\n\n const updateMark/)?.[1] || ''
  assert.match(search, /setMarksLoaded\(false\)/)
  const beforeFetch = search.split('const studentsForClass = await loadRoster')[0]
  assert.doesNotMatch(beforeFetch, /setStudents\(\[\]\)|setMarks\(\{\}\)|setSavedMarks\(\{\}\)/)
  assert.match(search, /if \(request !== rosterFetchSeq\.current\) return/)
  assert.match(search, /if \(!Array\.isArray\(result\.data\?\.data\)\) throw/)
})

test('verified marks load updates roster and marks together without changing genuine zeros', () => {
  const search = source.match(/const searchStudents = async \(\) => \{([\s\S]*?)\n \}\n\n const updateMark/)?.[1] || ''
  assert.match(search, /row\.marks_obtained !== null && row\.marks_obtained !== undefined/)
  assert.match(search, /setStudents\(studentsForClass\)\s*setMarks\(loaded\)\s*setSavedMarks\(loaded\)/)
  assert.match(search, /setMarksLoaded\(true\)/)
})

test('failed roster or marks fetch preserves last known good display but disallows saving', () => {
  const search = source.match(/const searchStudents = async \(\) => \{([\s\S]*?)\n \}\n\n const updateMark/)?.[1] || ''
  assert.match(search, /setMarksLoaded\(false\)/)
  const fromFailedMarks = search.split('Saved marks could not be verified:')[0].split('} catch (err) {').pop()
  assert.doesNotMatch(fromFailedMarks, /setMarks\(\{\}\)|setSavedMarks\(\{\}\)|setStudents\(\[\]\)/)
  assert.match(search, /Previous records remain displayed; saving is disabled/)
  const failedSearch = search.split('Student search failed:')[0].split('} catch (err) {').pop()
  assert.doesNotMatch(failedSearch, /setMarks\(\{\}\)|setSavedMarks\(\{\}\)|setStudents\(\[\]\)/)
  assert.match(search, /Existing loaded students and marks were preserved/)
})
