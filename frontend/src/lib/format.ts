// The API returns naive timestamps (e.g. "2026-09-04T10:15:00", no "Z" or
// offset) - they're UTC, but `new Date(...)` on a string like that parses it
// as local time instead. Append "Z" when there's no timezone designator so
// it's interpreted correctly.
export function parseApiDate(iso: string): Date {
  const hasTz = /Z$|[+-]\d\d:?\d\d$/.test(iso)
  return new Date(hasTz ? iso : `${iso}Z`)
}

export function formatMonthYear(value?: string | null): string {
  if (!value) return 'Present'
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return value
  return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
