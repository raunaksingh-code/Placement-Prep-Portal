import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import type { AttemptResult, AttemptStart, MockTest } from '../../lib/types'

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function TestPage() {
  const { testId } = useParams()
  const navigate = useNavigate()
  // Mock test list passes the test meta so the start screen can show real instructions
  const meta = (useLocation().state as { test?: MockTest } | null)?.test
  const [attempt, setAttempt] = useState<AttemptStart | null>(null)
  const [started, setStarted] = useState(false)
  const [error, setError] = useState('')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const submittingRef = useRef(false)

  const answersRef = useRef(answers)
  answersRef.current = answers

  const submit = useCallback(async () => {
    if (submittingRef.current || !attempt) return
    submittingRef.current = true
    try {
      const result = await api<AttemptResult>(`/api/attempts/${attempt.attempt_id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: answersRef.current }),
      })
      navigate(`/attempts/${result.attempt_id}`)
    } catch (e) {
      submittingRef.current = false
      setError(e instanceof Error ? e.message : 'Submit failed')
    }
  }, [attempt, navigate])

  useEffect(() => {
    if (!started || secondsLeft === null) return
    if (secondsLeft <= 0) {
      submit()
      return
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000)
    return () => clearTimeout(t)
  }, [started, secondsLeft, submit])

  async function start() {
    try {
      const a = await api<AttemptStart>(`/api/tests/${testId}/start`, { method: 'POST' })
      setAttempt(a)
      setStarted(true)
      if (a.duration_minutes) setSecondsLeft(a.duration_minutes * 60)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start test')
    }
  }

  if (error) return <p className="text-red-600">{error}</p>

  if (!started) {
    return (
      <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-xl p-8">
        <h1 className="text-xl font-bold mb-1">{meta ? meta.title : 'Ready to start?'}</h1>
        {meta && (
          <p className="text-sm text-slate-500 mb-4">
            {meta.question_count} questions · {meta.duration_minutes} minutes
            {meta.sections && meta.sections.length > 1 && ` · ${meta.sections.join(', ')}`}
          </p>
        )}
        <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5 mb-6">
          <li>The timer starts as soon as you click Start and the test auto-submits when time runs out.</li>
          <li>
            {meta
              ? `Wrong answers cost ${meta.negative_mark} marks; unattempted questions carry no penalty.`
              : 'Incorrect answers may carry negative marking; unattempted questions carry no penalty.'}
          </li>
          <li>Use the question palette to move between questions before submitting.</li>
        </ul>
        <button
          onClick={start}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-2.5 font-medium"
        >
          Start test
        </button>
      </div>
    )
  }

  if (!attempt) return <p className="text-slate-500">Loading…</p>

  const q = attempt.questions[index]
  const answered = Object.keys(answers).length

  // Group the palette by section, keeping the original question numbering
  const paletteGroups: { section: string | null; items: { question: typeof q; index: number }[] }[] =
    []
  attempt.questions.forEach((question, i) => {
    const section = question.section
    const last = paletteGroups[paletteGroups.length - 1]
    if (last && last.section === section) last.items.push({ question, index: i })
    else paletteGroups.push({ section, items: [{ question, index: i }] })
  })

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-bold">{attempt.title}</h1>
        {secondsLeft !== null && (
          <span
            className={`font-mono text-lg font-semibold rounded-lg px-3 py-1 ${
              secondsLeft <= 120 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {formatTime(secondsLeft)}
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr_180px] gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
            <span>
              Question {index + 1} of {attempt.questions.length}
              {q.section && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                  {q.section}
                </span>
              )}
            </span>
            <span className="capitalize">{q.difficulty}</span>
          </div>
          <p className="font-medium text-lg mb-5">{q.text}</p>
          <div className="space-y-2">
            {q.options.map((o) => {
              const chosen = answers[String(q.id)] === o
              return (
                <button
                  key={o}
                  onClick={() =>
                    setAnswers((a) => {
                      const next = { ...a }
                      if (chosen) delete next[String(q.id)]
                      else next[String(q.id)] = o
                      return next
                    })
                  }
                  className={`w-full text-left border rounded-lg px-4 py-2.5 transition ${
                    chosen
                      ? 'border-indigo-500 bg-indigo-50 font-medium'
                      : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {o}
                </button>
              )
            })}
          </div>
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="border border-slate-300 rounded-lg px-4 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            {index < attempt.questions.length - 1 ? (
              <button
                onClick={() => setIndex((i) => i + 1)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
              >
                Next
              </button>
            ) : (
              <button
                onClick={submit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
              >
                Submit test
              </button>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 h-fit">
          <p className="text-xs text-slate-500 mb-3">{answered} of {attempt.questions.length} answered</p>
          {paletteGroups.map((group) => (
            <div key={group.section ?? 'all'} className="mb-3">
              {group.section && (
                <p className="text-[11px] font-medium text-slate-500 mb-1.5">{group.section}</p>
              )}
              <div className="grid grid-cols-5 gap-1.5">
                {group.items.map(({ question: qq, index: i }) => (
                  <button
                    key={qq.id}
                    onClick={() => setIndex(i)}
                    className={`h-8 rounded text-xs font-medium border ${
                      i === index
                        ? 'border-indigo-600 ring-1 ring-indigo-600'
                        : 'border-slate-200'
                    } ${answers[String(qq.id)] ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={submit}
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 text-sm font-medium"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}
