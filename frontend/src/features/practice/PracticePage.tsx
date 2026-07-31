import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import type { PracticeQuestion } from '../../lib/types'

export default function PracticePage() {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const difficulty = params.get('difficulty') ?? ''
  const [questions, setQuestions] = useState<PracticeQuestion[] | null>(null)
  const [error, setError] = useState('')
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [tally, setTally] = useState({ right: 0, wrong: 0 })

  useEffect(() => {
    setQuestions(null)
    setIndex(0)
    setSelected(null)
    setTally({ right: 0, wrong: 0 })
    const q = difficulty ? `?difficulty=${difficulty}&limit=15` : '?limit=15'
    api<PracticeQuestion[]>(`/api/topics/${slug}/practice${q}`)
      .then(setQuestions)
      .catch((e) => setError(e.message))
  }, [slug, difficulty])

  if (error) return <p className="text-red-600">{error}</p>
  if (!questions) return <p className="text-slate-500">Loading…</p>
  if (!questions.length) return <p className="text-slate-500">No practice questions for this topic yet.</p>

  const done = index >= questions.length
  const q = questions[Math.min(index, questions.length - 1)]

  function choose(option: string) {
    if (selected) return
    setSelected(option)
    setTally((t) =>
      option === q.correct_answer ? { ...t, right: t.right + 1 } : { ...t, wrong: t.wrong + 1 },
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link to={`/topics/${slug}`} className="text-sm text-indigo-600 hover:underline">← Back to topic</Link>
        <select
          value={difficulty}
          onChange={(e) => {
            const v = e.target.value
            setParams(v ? { difficulty: v } : {})
          }}
          className="text-sm border border-slate-300 rounded-lg px-2 py-1 bg-white"
        >
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {done ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Practice complete!</h2>
          <p className="text-slate-600 mb-6">
            You got <span className="font-semibold text-emerald-700">{tally.right}</span> right and{' '}
            <span className="font-semibold text-red-600">{tally.wrong}</span> wrong out of {questions.length}.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setIndex(0)
                setSelected(null)
                setTally({ right: 0, wrong: 0 })
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              Practice again
            </button>
            <Link
              to={`/topics/${slug}`}
              className="bg-white border border-slate-300 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-medium"
            >
              Back to topic
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
            <span>Question {index + 1} of {questions.length}</span>
            <span className="capitalize">{q.difficulty}</span>
          </div>
          <p className="font-medium text-lg mb-5">{q.text}</p>
          <div className="space-y-2">
            {q.options.map((o) => {
              let cls = 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
              if (selected) {
                if (o === q.correct_answer) cls = 'border-emerald-400 bg-emerald-50'
                else if (o === selected) cls = 'border-red-400 bg-red-50'
                else cls = 'border-slate-200 opacity-60'
              }
              return (
                <button
                  key={o}
                  onClick={() => choose(o)}
                  disabled={!!selected}
                  className={`w-full text-left border rounded-lg px-4 py-2.5 transition ${cls}`}
                >
                  {o}
                </button>
              )
            })}
          </div>
          {selected && (
            <div className="mt-5">
              {q.explanation && (
                <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <span className="font-medium">Explanation: </span>
                  {q.explanation}
                </p>
              )}
              <button
                onClick={() => {
                  setIndex((i) => i + 1)
                  setSelected(null)
                }}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2 text-sm font-medium"
              >
                {index + 1 === questions.length ? 'Finish' : 'Next question'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
