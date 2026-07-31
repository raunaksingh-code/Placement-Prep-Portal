import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import type { MockTest } from '../../lib/types'

const GROUPS = [
  {
    type: 'full_mock',
    title: 'Full mock tests',
    blurb: 'Full-length papers covering all three sections, like a real placement test.',
  },
  {
    type: 'sectional',
    title: 'Sectional tests',
    blurb: 'One section at a time — useful when you want to drill a single area.',
  },
]

export default function MockTestListPage() {
  const [tests, setTests] = useState<MockTest[] | null>(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api<MockTest[]>('/api/mock-tests').then(setTests).catch((e) => setError(e.message))
  }, [])

  // TestPage creates the attempt on its own start screen; pass the meta along so it
  // can show this test's real instructions before the timer begins.
  function open(test: MockTest) {
    navigate(`/tests/${test.id}`, { state: { test } })
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!tests) return <p className="text-slate-500">Loading…</p>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Mock Tests</h1>
      <p className="text-slate-500 mb-6">
        Timed papers with negative marking. Each mock has a fixed question set, so you can retake it
        and compare your scores.
      </p>

      {GROUPS.map((group) => {
        const items = tests.filter((t) => t.test_type === group.type)
        if (!items.length) return null
        return (
          <section key={group.type} className="mb-8">
            <h2 className="font-semibold text-lg">{group.title}</h2>
            <p className="text-sm text-slate-500 mb-3">{group.blurb}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col"
                >
                  <h3 className="font-medium">{t.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {t.question_count} questions · {t.duration_minutes} min · −{t.negative_mark} per
                    wrong answer
                  </p>
                  {t.sections && t.sections.length > 1 && (
                    <p className="text-xs text-slate-400 mt-1">{t.sections.join(' · ')}</p>
                  )}
                  {t.description && (
                    <p className="text-sm text-slate-600 mt-2 flex-1">{t.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => open(t)}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                    >
                      {t.attempt_count ? 'Retake test' : 'Start test'}
                    </button>
                    {t.attempt_count > 0 && (
                      <span className="text-xs text-slate-500">
                        {t.attempt_count} attempt{t.attempt_count > 1 ? 's' : ''} · best{' '}
                        <strong className="text-slate-700">{t.best_score}</strong>/{t.question_count}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
