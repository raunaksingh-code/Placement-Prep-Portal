import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import type { Progress, TopicMastery } from '../../lib/types'

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function TopicChips({ topics, tone }: { topics: TopicMastery[]; tone: 'weak' | 'strong' }) {
  const styles =
    tone === 'weak'
      ? 'bg-white border-amber-300 hover:border-amber-500'
      : 'bg-white border-emerald-300 hover:border-emerald-500'
  const numStyle = tone === 'weak' ? 'text-amber-700' : 'text-emerald-700'
  return (
    <div className="flex flex-wrap gap-2">
      {topics.map((t) => (
        <Link
          key={t.topic_slug}
          to={`/topics/${t.topic_slug}`}
          className={`px-3 py-1.5 rounded-lg border text-sm transition ${styles}`}
        >
          {t.topic_title}{' '}
          <span className={`font-medium ${numStyle}`}>
            {t.correct}/{t.attempted}
          </span>
        </Link>
      ))}
    </div>
  )
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function formatDuration(sec: number | null) {
  if (sec === null || sec <= 0) return ''
  const m = Math.floor(sec / 60)
  return m >= 1 ? `${m} min` : `${sec}s`
}

const TYPE_LABELS: Record<string, string> = {
  topic_test: 'Topic test',
  sectional: 'Sectional',
  full_mock: 'Full mock',
  practice: 'Practice',
}

export default function ProgressPage() {
  const [data, setData] = useState<Progress | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Progress>('/api/progress').then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="text-red-600">{error}</p>
  if (!data) return <p className="text-slate-500">Loading…</p>

  const s = data.summary

  if (s.attempts === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1">Your Progress</h1>
        <p className="text-slate-500 mb-6">
          Nothing here yet — take a test and your scores, accuracy and weak topics will show up.
        </p>
        <div className="flex gap-3">
          <Link
            to="/mock-tests"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            Take a mock test
          </Link>
          <Link
            to="/aptitude"
            className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:border-indigo-300"
          >
            Browse topics
          </Link>
        </div>
      </div>
    )
  }

  // Only count attempts where most of the paper was actually attempted - 100% on
  // three answered questions out of thirty-five is not a "best" result.
  const bestAttempt = [...data.recent_attempts]
    .filter((a) => a.total > 0 && (a.correct + a.incorrect) / a.total >= 0.5)
    .sort((a, b) => b.accuracy - a.accuracy)[0]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Your Progress</h1>
      <p className="text-slate-500 mb-6">
        Built from every test you have submitted, across topic tests and mocks.
      </p>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-8">
        <Stat label="Tests taken" value={String(s.attempts)} sub={`${s.tests_taken} different tests`} />
        <Stat
          label="Overall accuracy"
          value={`${s.accuracy}%`}
          sub={`${s.questions_correct} of ${s.questions_answered} answered`}
        />
        <Stat
          label="Topics covered"
          value={`${s.topics_attempted}/${s.topics_total}`}
          sub={`${s.topics_total - s.topics_attempted} not yet attempted`}
        />
        <Stat
          label="Best accuracy"
          value={bestAttempt ? `${bestAttempt.accuracy}%` : '—'}
          sub={bestAttempt?.test_title}
        />
      </div>

      {data.weakest_topics.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-amber-900 mb-1">Revise these first</h2>
          <p className="text-sm text-amber-800 mb-3">
            Your lowest-accuracy topics across all attempts. Click through to the study material.
          </p>
          <TopicChips topics={data.weakest_topics} tone="weak" />
        </section>
      )}

      {data.section_performance.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-3">Section performance</h2>
          <div className="space-y-3">
            {data.section_performance.map((sec) => (
              <div key={sec.section}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{sec.section}</span>
                  <span className="text-slate-500">
                    {sec.correct}/{sec.attempted} · {sec.accuracy}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full ${sec.accuracy >= 70 ? 'bg-emerald-500' : sec.accuracy >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${sec.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold mb-3">Syllabus coverage</h2>
        <div className="space-y-3">
          {data.subject_coverage.map((c) => {
            const pct = c.topics_total ? (c.topics_attempted / c.topics_total) * 100 : 0
            return (
              <div key={c.subject_slug}>
                <div className="flex justify-between text-sm mb-1">
                  <Link to={`/subjects/${c.subject_slug}`} className="font-medium hover:underline">
                    {c.subject_name}
                  </Link>
                  <span className="text-slate-500">
                    {c.topics_attempted}/{c.topics_total} topics
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
        {data.untouched_topics.length > 0 && (
          <details className="mt-4">
            <summary className="text-sm text-indigo-600 cursor-pointer hover:underline">
              {data.untouched_topics.length} topics you have not attempted yet
            </summary>
            <div className="flex flex-wrap gap-2 mt-3">
              {data.untouched_topics.map((t) => (
                <Link
                  key={t.topic_slug}
                  to={`/topics/${t.topic_slug}`}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs hover:border-indigo-300 transition"
                >
                  {t.topic_title}
                </Link>
              ))}
            </div>
          </details>
        )}
      </section>

      {data.strongest_topics.length > 0 && (
        <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-emerald-900 mb-1">Your strongest topics</h2>
          <p className="text-sm text-emerald-800 mb-3">
            Based on topics where you have answered at least 3 questions.
          </p>
          <TopicChips topics={data.strongest_topics} tone="strong" />
        </section>
      )}

      <section>
        <h2 className="font-semibold text-lg mb-3">Recent attempts</h2>
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {data.recent_attempts.map((a) => (
            <Link
              key={a.attempt_id}
              to={`/attempts/${a.attempt_id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50 transition"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{a.test_title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {TYPE_LABELS[a.test_type] ?? a.test_type}
                  {a.submitted_at && ` · ${formatDate(a.submitted_at)}`}
                  {formatDuration(a.time_taken_sec) && ` · ${formatDuration(a.time_taken_sec)}`} ·{' '}
                  {a.correct} correct, {a.incorrect} wrong, {a.unattempted} skipped
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">
                  {a.score}
                  <span className="text-slate-400 font-normal">/{a.total}</span>
                </p>
                <p className="text-xs text-slate-500">{a.accuracy}% accuracy</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
