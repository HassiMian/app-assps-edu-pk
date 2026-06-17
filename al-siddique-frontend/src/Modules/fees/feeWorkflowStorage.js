const KEY = 'assps_fee_workflow_v1'

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

function write(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

function pushUnique(list = [], entry, max = 8) {
  const id = entry?.id
  if (!id) return list
  const next = [entry, ...list.filter((item) => Number(item.id) !== Number(id))]
  return next.slice(0, max)
}

export function trackRecentAdded(student) {
  const data = read()
  data.added = pushUnique(data.added, student)
  write(data)
}

export function trackRecentViewed(student) {
  const data = read()
  data.viewed = pushUnique(data.viewed, student)
  write(data)
}

export function trackRecentChallan(student) {
  const data = read()
  data.challan = pushUnique(data.challan, student)
  write(data)
}

export function getRecentStudents() {
  const data = read()
  return {
    added: data.added || [],
    viewed: data.viewed || [],
    challan: data.challan || [],
  }
}
