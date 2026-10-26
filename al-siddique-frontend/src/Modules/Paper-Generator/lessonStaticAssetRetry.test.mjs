import test from 'node:test'
import assert from 'node:assert/strict'
import { isTransientLessonAssetError, loadLessonAssetWithSingleRetry } from './lessonStaticAssetRetry.js'

test('CSS preload network failure is recognized', () =>
  assert.equal(isTransientLessonAssetError(new Error('Unable to preload CSS for /assets/LessonPlanModule-Ch5ZCMBJ.css')), true))
test('foreign invalid CSS URL is not automatically retried', () =>
  assert.equal(isTransientLessonAssetError(new Error('Unable to preload CSS for http://remote/css.css')), false))
test('arbitrary authorization error not retried', () =>
  assert.equal(isTransientLessonAssetError(new Error('HTTP 401 Unauthorized')), false))
test('single successful retry follows transient failure', async () => {
  let calls = 0
  const result = await loadLessonAssetWithSingleRetry(async () => {
    calls++
    if (calls === 1) throw new Error('Unable to preload CSS for /assets/lesson-1234.css')
    return { default: 'lesson' }
  }, async () => {})
  assert.equal(calls, 2)
  assert.equal(result.default, 'lesson')
})
test('no unbounded retry, preserves second original failure', async () => {
  let calls = 0
  await assert.rejects(loadLessonAssetWithSingleRetry(async () => {
    calls++
    throw new Error('Failed to fetch dynamically imported module')
  }, async () => {}), /Failed to fetch/)
  assert.equal(calls, 2)
})
test('non transient failure does not retry', async () => {
  let calls = 0
  await assert.rejects(loadLessonAssetWithSingleRetry(async () => {
    calls++
    throw new Error('HTTP 403 Forbidden')
  }, async () => {}), /403/)
  assert.equal(calls, 1)
})
