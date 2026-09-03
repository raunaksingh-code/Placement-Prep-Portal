export function formatMonthYear(value?: string | null): string {
  if (!value) return 'Present'
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return value
  return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
