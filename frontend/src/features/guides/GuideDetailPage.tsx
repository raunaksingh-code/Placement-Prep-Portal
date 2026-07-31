import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import type { GuideDetail } from '../../lib/types'

/** Guide bodies use plain text with newlines and bullet lines starting with •. */
function Body({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-2 text-sm text-slate-700 leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} className="h-1" />
        if (trimmed.startsWith('•')) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-indigo-400 shrink-0">•</span>
              <span>{trimmed.replace(/^•\s*/, '')}</span>
            </div>
          )
        }
        // Numbered steps get a little emphasis
        if (/^\d+\.\s/.test(trimmed)) {
          return (
            <p key={i} className="font-medium text-slate-800">
              {trimmed}
            </p>
          )
        }
        return <p key={i}>{trimmed}</p>
      })}
    </div>
  )
}

export default function GuideDetailPage() {
  const { slug } = useParams()
  const [guide, setGuide] = useState<GuideDetail | null>(null)
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    setGuide(null)
    setShowAll(false)
    api<GuideDetail>(`/api/guides/${slug}`).then(setGuide).catch((e) => setError(e.message))
  }, [slug])

  if (error) return <p className="text-red-600">{error}</p>
  if (!guide) return <p className="text-slate-500">Loading…</p>

  const visible = showAll ? guide.questions : guide.questions.slice(0, 8)

  return (
    <div className="max-w-3xl">
      <Link to="/interview-prep" className="text-sm text-indigo-600 hover:underline">
        ← Interview Preparation
      </Link>

      <div className="flex items-start gap-3 mt-3 mb-2">
        <span className="text-3xl">{guide.icon ?? '📘'}</span>
        <div>
          <h1 className="text-2xl font-bold">{guide.title}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{guide.summary}</p>
        </div>
      </div>

      {guide.introduction && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 my-5">
          <p className="text-sm text-indigo-900 leading-relaxed">{guide.introduction}</p>
        </div>
      )}

      <div className="space-y-6">
        {guide.sections?.map((s) => (
          <section key={s.heading} className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-semibold mb-3">{s.heading}</h2>
            <Body text={s.body} />
          </section>
        ))}
      </div>

      {guide.checklist && guide.checklist.length > 0 && (
        <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mt-6">
          <h2 className="font-semibold text-emerald-900 mb-3">Before you walk in</h2>
          <ul className="space-y-2">
            {guide.checklist.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-emerald-900">
                <span className="text-emerald-600 shrink-0">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {guide.common_mistakes && guide.common_mistakes.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-5 mt-6">
          <h2 className="font-semibold text-amber-900 mb-3">Common mistakes</h2>
          <ul className="space-y-2">
            {guide.common_mistakes.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-amber-900">
                <span className="text-amber-600 shrink-0">✕</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {guide.question_count > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 mt-6">
          <h2 className="font-semibold mb-1">What candidates were actually asked</h2>
          <p className="text-sm text-slate-500 mb-1">
            {guide.question_count} questions in this category from the 2026 placement season.
            Starred (★) ones were reported more than once.
          </p>
          {guide.top_companies.length > 0 && (
            <p className="text-xs text-slate-400 mb-4">
              Most frequent: {guide.top_companies.join(' · ')}
            </p>
          )}

          <ul className="space-y-3">
            {visible.map((q) => (
              <li key={q.id} className="flex gap-2 text-sm">
                <span className={q.starred ? 'text-amber-500' : 'text-slate-300'}>
                  {q.starred ? '★' : '•'}
                </span>
                <span className="text-slate-700">
                  {q.text}
                  <Link
                    to={`/companies/${q.company_slug}`}
                    className="ml-2 text-xs text-indigo-600 hover:underline whitespace-nowrap"
                  >
                    {q.company_name}
                  </Link>
                  <span className="ml-1.5 text-xs text-slate-400">{q.round_name}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3 mt-4">
            {guide.questions.length > 8 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="text-sm text-indigo-600 hover:underline"
              >
                {showAll ? 'Show fewer' : `Show all ${guide.questions.length} shown here`}
              </button>
            )}
            {guide.question_category && (
              <Link
                to={`/question-bank?category=${encodeURIComponent(guide.question_category)}`}
                className="text-sm text-indigo-600 hover:underline"
              >
                Browse all {guide.question_count} in the question bank →
              </Link>
            )}
          </div>
        </section>
      )}

      {guide.source && (
        <p className="text-xs text-slate-400 mt-6 border-t border-slate-100 pt-3">
          Source: {guide.source}
        </p>
      )}
    </div>
  )
}
