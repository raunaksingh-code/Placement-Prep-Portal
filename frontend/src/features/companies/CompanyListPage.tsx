import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import type { CompanySummary } from '../../lib/types'

export default function CompanyListPage() {
  const [companies, setCompanies] = useState<CompanySummary[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    api<CompanySummary[]>('/api/companies').then(setCompanies).catch((e) => setError(e.message))
  }, [])

  const filtered = useMemo(() => {
    if (!companies) return []
    const q = query.trim().toLowerCase()
    if (!q) return companies
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.roles.some((r) => r.toLowerCase().includes(q)),
    )
  }, [companies, query])

  if (error) return <p className="text-red-600">{error}</p>
  if (!companies) return <p className="text-slate-500">Loading…</p>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Companies & Job Descriptions</h1>
      <p className="text-slate-500 mb-4">
        {companies.length} companies · {companies.reduce((n, c) => n + c.jd_count, 0)} job descriptions ·{' '}
        {companies.reduce((n, c) => n + c.question_count, 0)} interview questions
      </p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search company or role…"
        className="w-full sm:w-96 mb-6 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />

      {filtered.length === 0 && <p className="text-slate-500">No companies match “{query}”.</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <Link
            key={c.id}
            to={`/companies/${c.slug}`}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-indigo-300 transition flex flex-col"
          >
            <h2 className="font-semibold">{c.name}</h2>
            <div className="flex gap-2 mt-2 text-xs">
              {c.jd_count > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                  {c.jd_count} JD{c.jd_count > 1 ? 's' : ''}
                </span>
              )}
              {c.question_count > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                  {c.question_count} questions
                </span>
              )}
            </div>
            {c.roles.length > 0 && (
              <p className="text-xs text-slate-500 mt-2 line-clamp-2">{c.roles.join(' · ')}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
