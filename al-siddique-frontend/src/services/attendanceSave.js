export async function saveAttendanceRecords(api, records = []) {
  const normalized = Array.isArray(records) ? records.filter(Boolean) : []
  if (!normalized.length) {
    return { response: null, saved: 0, rejectedIds: [] }
  }

  try {
    const response = await api.post('/api/attendance/mark', { records: normalized })
    return { response, saved: normalized.length, rejectedIds: [] }
  } catch (err) {
    const payload = err?.response?.data || {}
    const rejectedIds = Array.isArray(payload.invalidIds)
      ? payload.invalidIds.map((id) => Number(id)).filter(Number.isFinite)
      : []

    if (payload.error !== 'INVALID_STUDENT_IDS' || !rejectedIds.length) throw err

    const rejected = new Set(rejectedIds)
    const validRecords = normalized.filter((record) => !rejected.has(Number(record?.student_id)))
    if (!validRecords.length) throw err

    const response = await api.post('/api/attendance/mark', { records: validRecords })
    return {
      response,
      saved: validRecords.length,
      rejectedIds,
      partial: true,
      originalError: payload,
    }
  }
}
