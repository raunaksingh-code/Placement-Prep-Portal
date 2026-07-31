import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import type { AttemptResult } from '../../lib/types'

export default function ResultPage() {
  const { attemptId } = useParams()
  const [result, setResult] = useState<AttemptResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<AttemptResult>(`/api/attempts/${attemptId}`).then(setResult).catch((e) => setError(e.message))
  }, [attemptId])

  if (error) return <p className="text-red-600">{error}</p>
  if (!result) return <p className="text-slate-500">Loading…</p>

  const pct = result.total ? Math.round((result.correct / result.total) * 100) : 0
  // Cross-topic tests carry section labels; topic tests do not
  const isMock = result.sections.length > 0

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center mb-6">
        <h1 className="text-xl font-bold mb-1">{result.test_title}</h1>
        <p className="text-slate-500 text-sm mb-6">Attempt result</p>
        <p className="text-5xl font-bold text-indigo-700 mb-2">
          {result.score}
          <span className="text-2xl text-slate-400"> / {result.total}</span>
        </p>
        <p className="text-slate-500 text-sm mb-6">{pct}% questions correct</p>
        <div className="flex justify-center gap-6 text-sm">
          <span className="text-emerald-700 font-medium">{result.correct} correct</span>
          <span className="text-red-600 font-medium">{result.incorrect} incorrect</span>
          <span className="text-slate-500 font-medium">{result.unattempted} unattempted</span>
        </div>
        {result.negative_mark > 0 && (
          <p className="text-xs text-slate-400 mt-3">Negative marking: -{result.negative_mark} per wrong answer</p>
        )}
        <Link
          to={isMock ? '/mock-tests' : '/aptitude'}
          className="inline-block mt-6 text-sm text-indigo-600 hover:underline"
        >
          ← Back to {isMock ? 'Mock Tests' : 'Learning Center'}
        </Link>
      </div>

      {result.sections.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-3">Section-wise breakdown</h2>
          <div className="space-y-3">
            {result.sections.map((s) => {
              const accuracy = s.total ? Math.round((s.correct / s.total) * 100) : 0
              return (
                <div key={s.section}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{s.section}</span>
                    <span className="text-slate-500">
                      {s.score} / {s.total} · {accuracy}% correct
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
                    <div className="bg-emerald-500" style={{ width: `${(s.correct / s.total) * 100}%` }} />
                    <div className="bg-red-400" style={{ width: `${(s.incorrect / s.total) * 100}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {s.correct} correct · {s.incorrect} incorrect · {s.unattempted} unattempted
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {result.weakest_topics.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-amber-900 mb-1">Where you lost marks</h2>
          <p className="text-sm text-amber-800 mb-3">
            Revise these topics before your next attempt.
          </p>
          <div className="flex flex-wrap gap-2">
            {result.weakest_topics.map((t) => (
              <Link
                key={t.topic_slug}
                to={`/topics/${t.topic_slug}`}
                className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-sm hover:border-amber-500 transition"
              >
                {t.topic_title}{' '}
                <span className="text-amber-700 font-medium">
                  {t.correct}/{t.total}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-semibold text-lg mb-3">Question review</h2>
      <div className="space-y-3">
        {result.results.map((r, i) => (
          <div
            key={r.question_id}
            className={`bg-white border rounded-lg p-4 ${
              r.selected == null
                ? 'border-slate-200'
                : r.is_correct
                  ? 'border-emerald-300'
                  : 'border-red-300'
            }`}
          >
            <p className="font-medium mb-2">
              <span className="text-slate-400 mr-2">Q{i + 1}.</span>
              {r.text}
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {r.options.map((o) => {
                let cls = 'border-slate-200 text-slate-600'
                if (o === r.correct_answer) cls = 'border-emerald-400 bg-emerald-50 text-emerald-800'
                else if (o === r.selected) cls = 'border-red-400 bg-red-50 text-red-700'
                return (
                  <span key={o} className={`text-sm border rounded-md px-2.5 py-1 ${cls}`}>
                    {o}
                  </span>
                )
              })}
            </div>
            <p className="text-xs text-slate-500 mb-1">
              {r.selected == null
                ? 'Not attempted'
                : r.is_correct
                  ? 'Correct'
                  : `You chose "${r.selected}"`}
            </p>
            {r.explanation && <p className="text-sm text-slate-700">{r.explanation}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
