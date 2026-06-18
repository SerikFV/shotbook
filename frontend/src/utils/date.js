/**
 * UTC ISO string-ді браузердің жергілікті уақытына (timezone) дұрыс аударады.
 * Backend UTC сақтайды, сондықтан барлық жерде осы функцияны қолдану керек.
 */

export function formatDate(iso, opts = {}) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...opts,
  })
}

export function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Booking date + start_time жергілікті уақытпен бірге көрсету */
export function formatBookingDate(isoDate, startTime) {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  const dateStr = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  return startTime ? `${dateStr}, ${startTime}` : dateStr
}
