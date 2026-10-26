/**
 * Fail-closed recovery for a transient Vite CSS/module preload error.
 * Runs ONLY for lesson module import; never retries authorization/API writes.
 * No reload automatically: user must explicitly choose after a visible warning.
 */
export function isTransientLessonAssetError(error) {
  const message = String(error?.message || '')
  return /Unable to preload CSS for \/assets\/[^\s]+\.css/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message)
}

export async function loadLessonAssetWithSingleRetry(importer, wait = () =>
  new Promise(resolve => setTimeout(resolve, 350))) {
  if (typeof importer !== 'function') throw new TypeError('Lesson importer is required')
  try {
    return await importer()
  } catch (error) {
    if (!isTransientLessonAssetError(error)) throw error
    await wait()
    // A second network attempt is bounded. If rejected, leave actual lesson data untouched.
    return importer()
  }
}
