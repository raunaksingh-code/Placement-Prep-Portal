import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import type { CompanySummary, QuestionBankPage as BankPage } from '../../lib/types'

const PAGE_SIZE = 60

export default function QuestionBankPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<BankPage | null>(null)
  const [companies, setCompanies] = useState<CompanySummary[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState(params.get('q') ?? '')

  const company = params.get('company') ?? ''
  const round = params.get('round_name') ?? ''
  const category = params.get('category') ?? ''
  const starredOnly = params.get('starred_only') === 'true'
  const offset = Number(params.get('offset') ?? 0)
  const q = params.get('q') ?? ''

  useEffect(() => {
    api<CompanySummary[]>('/api/companies')
      .then((all) => setCompanies(all.filter((c) => c.question_count > 0)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const search = new URLSearchParams()
    if (company) search.set('company', company)
    if (round) search.set('round_name', round)
    if (category) search.set('category', category)
    if (starredOnly) search.set('starred_only', 'true')
    if (q) search.set('q', q)
    search.set('limit', String(PAGE_SIZE))
    search.set('offset', String(offset))

    setLoading(true)
    api<BankPage>(`/api/question-bank?${search}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [company, round, category, starredOnly, q, offset])

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'offset') next.delete('offset')
    setParams(next)
  }

  const activeCompanyName = useMemo(
    () => companies.find((c) => c.slug === company)?.name,
    [companies, company],
  )

  if (error) return <p className="text-red-600">{error}</p>

  const grouped = (data?.items ?? []).reduce<Record<string, typeof data.items>>((acc, item) => {
    const key = `${item.company_name} — ${item.role}`
    ;(acc[key] ??= []).push(item)
    return acc
  }, {})

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Interview Question Bank</h1>
      <p className="text-slate-500 mb-5">
        Real questions reported by candidates, company-wise and role-wise. Starred (★) questions were
        reported more than once.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          update('q', search || null)
        }}
        className="flex gap-2 mb-3"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions… e.g. guesstimate, SQL, why this role"
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={company}
          onChange={(e) => update('company', e.target.value || null)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name} ({c.question_count})
            </option>
          ))}
        </select>

        <select
          value={round}
          onChange={(e) => update('round_name', e.target.value || null)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
        >
          <option value="">All rounds</option>
          {data?.rounds.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => update('category', e.target.value || null)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
        >
          <option value="">All types</option>
          {data?.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          onClick={() => update('starred_only', starredOnly ? null : 'true')}
          className={`px-3 py-2 rounded-lg border text-sm font-medium ${
            starredOnly
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-white border-slate-300 text-slate-600'
          }`}
        >
          ★ Frequently asked
        </button>

        {(company || round || category || starredOnly || q) && (
          <button
            onClick={() => setParams(new URLSearchParams())}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-800"
          >
            Clear filters
          </button>
        )}
      </div>

      <p className="text-sm text-slate-500 mb-4">
        {loading ? 'Loading…' : `${data?.total ?? 0} questions`}
        {activeCompanyName && ` at ${activeCompanyName}`}
        {q && ` matching “${q}”`}
      </p>

      <div className="space-y-4">
        {Object.entries(grouped).map(([heading, items]) => (
          <div key={heading} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h2 className="font-semibold text-sm">{heading}</h2>
              <Link
                to={`/companies/${items[0].company_slug}`}
                className="text-xs text-indigo-600 hover:underline shrink-0"
              >
                Company page →
              </Link>
            </div>
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex gap-2 text-sm">
                  <span className={item.starred ? 'text-amber-500' : 'text-slate-300'}>
                    {item.starred ? '★' : '•'}
                  </span>
                  <span className="text-slate-700">
                    {item.text}
                    <span className="ml-2 text-xs text-slate-400 whitespace-nowrap">
                      {item.round_name}
                      {item.category !== 'General' && ` · ${item.category}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {!loading && data && data.total === 0 && (
        <p className="text-slate-500">No questions match these filters.</p>
      )}

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-6">
          <button
            disabled={offset === 0}
            onClick={() => update('offset', String(Math.max(0, offset - PAGE_SIZE)))}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-sm text-slate-500">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} of {data.total}
          </span>
          <button
            disabled={offset + PAGE_SIZE >= data.total}
            onClick={() => update('offset', String(offset + PAGE_SIZE))}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
