import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import type { GuideSummary } from '../../lib/types'

export default function GuideListPage() {
  const [guides, setGuides] = useState<GuideSummary[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<GuideSummary[]>('/api/guides').then(setGuides).catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="text-red-600">{error}</p>
  if (!guides) return <p className="text-slate-500">Loading…</p>

  const categories = [...new Set(guides.map((g) => g.category))]
  const totalQuestions = guides.reduce((n, g) => n + g.question_count, 0)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Interview Preparation</h1>
      <p className="text-slate-500 mb-6">
        The rounds that come after the aptitude test. Each guide is paired with the real questions
        candidates from your batch were asked — {totalQuestions.toLocaleString()} of them.
      </p>

      {categories.map((cat) => (
        <section key={cat} className="mb-8">
          <h2 className="font-semibold text-lg mb-3">{cat}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {guides
              .filter((g) => g.category === cat)
              .map((g) => (
                <Link
                  key={g.id}
                  to={`/interview-prep/${g.slug}`}
                  className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-300 transition"
                >
                  <div className="text-2xl mb-2">{g.icon ?? '📘'}</div>
                  <h3 className="font-semibold">{g.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{g.summary}</p>
                  {g.question_count > 0 && (
                    <p className="text-xs text-indigo-600 font-medium mt-3">
                      {g.question_count} real questions
                    </p>
                  )}
                </Link>
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}
