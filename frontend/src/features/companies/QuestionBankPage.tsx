import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import type { CompanySummary, QuestionBankPage as BankPage } from '../../lib/types'
import { BookOpen, Layers } from 'lucide-react'

const PAGE_SIZE = 60

export default function QuestionBankPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<BankPage | null>(null)
  const [companies, setCompanies] = useState<CompanySummary[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState(params.get('q') ?? '')

  // Module filter (defaults to PGDM 1)
  const module = params.get('module') ?? 'PGDM 1'
  const company = params.get('company') ?? ''
  const round = params.get('round_name') ?? ''
  const category = params.get('category') ?? ''
  const starredOnly = params.get('starred_only') === 'true'
  const offset = Number(params.get('offset') ?? 0)
  const q = params.get('q') ?? ''

  // Sync search input if URL changes
  useEffect(() => {
    setSearch(q)
  }, [q])

  // Fetch companies for the selected module
  useEffect(() => {
    const compQuery = module && module !== 'all' ? `?module=${encodeURIComponent(module)}` : ''
    api<CompanySummary[]>(`/api/companies${compQuery}`)
      .then((all) => setCompanies(all.filter((c) => c.question_count > 0)))
      .catch(() => {})
  }, [module])

  // Fetch questions
  useEffect(() => {
    const searchParams = new URLSearchParams()
    if (module && module !== 'all') searchParams.set('module', module)
    if (company) searchParams.set('company', company)
    if (round) searchParams.set('round_name', round)
    if (category) searchParams.set('category', category)
    if (starredOnly) searchParams.set('starred_only', 'true')
    if (q) searchParams.set('q', q)
    searchParams.set('limit', String(PAGE_SIZE))
    searchParams.set('offset', String(offset))

    setLoading(true)
    api<BankPage>(`/api/question-bank?${searchParams}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [module, company, round, category, starredOnly, q, offset])

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'offset') next.delete('offset')
    setParams(next)
  }

  function switchModule(newModule: string) {
    const next = new URLSearchParams()
    next.set('module', newModule)
    if (q) next.set('q', q)
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
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 rounded-2xl p-5 border border-indigo-100 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Interview Question Bank</h1>
        <p className="text-slate-600 text-sm">
          {module === 'PGDM 1' &&
            'Real placement questions reported by PGDM 1 candidates covering Aptitude, GD topics, L1–L4 technical, HR, and Leadership rounds.'}
          {module === 'PGDM 2' &&
            'Real final placement interview experiences reported by PGDM 2 candidates across 67+ premier recruiters.'}
          {module === 'all' &&
            'All real interview experiences and questions across PGDM 1 and PGDM 2 placement seasons.'}
        </p>
      </div>

      {/* Module Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => switchModule('PGDM 1')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm ${
              module === 'PGDM 1'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <BookOpen size={16} />
            <span>PGDM 1</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                module === 'PGDM 1' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
              }`}
            >
              2,499 Qs
            </span>
          </button>

          <button
            type="button"
            onClick={() => switchModule('PGDM 2')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm ${
              module === 'PGDM 2'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers size={16} />
            <span>PGDM 2</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                module === 'PGDM 2' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
              }`}
            >
              1,791 Qs
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => switchModule('all')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
            module === 'all'
              ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          View All Modules (4,290 Qs)
        </button>
      </div>

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
          placeholder={`Search ${module === 'all' ? 'all' : module} questions… e.g. guesstimate, SQL, why this role`}
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
          <option value="">All companies ({companies.length})</option>
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
          type="button"
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
            type="button"
            onClick={() => {
              const reset = new URLSearchParams()
              if (module) reset.set('module', module)
              setParams(reset)
            }}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-800"
          >
            Clear filters
          </button>
        )}
      </div>

      <p className="text-sm text-slate-500 mb-4">
        {loading ? 'Loading…' : `${data?.total ?? 0} questions`}
        {module !== 'all' && ` in ${module}`}
        {activeCompanyName && ` at ${activeCompanyName}`}
        {q && ` matching “${q}”`}
      </p>

      <div className="space-y-4">
        {Object.entries(grouped).map(([heading, items]) => (
          <div key={heading} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-sm">{heading}</h2>
                {items[0].module && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {items[0].module}
                  </span>
                )}
              </div>
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
            type="button"
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
            type="button"
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
