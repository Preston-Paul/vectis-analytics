/**
 * Shared formatting utilities used across all pages.
 * Central location prevents duplicate fmt() functions scattered in each page.
 */

/** Format a number as compact USD currency (e.g. $1.2M, $450K) */
export function fmtCurrency(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)
}

/** Format a percentage with optional sign prefix (e.g. +3.5%, -1.2%) */
export function fmtPct(n: number | null | undefined, showSign = true): string {
  if (n == null || isNaN(n)) return '—'
  const sign = showSign && n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

/** Format a date string as short locale date (e.g. Jan 2024) */
export function fmtDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/** Format a number with commas (e.g. 1,234,567) */
export function fmtNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US').format(n)
}
