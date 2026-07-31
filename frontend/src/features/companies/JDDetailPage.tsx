import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import type { InterviewQuestion, JDDetail } from '../../lib/types'

const SECTION_LABELS: Record<string, string> = {
  overview: 'Overview',
  responsibilities: 'Responsibilities',
  qualifications: 'Qualifications',
  skills: 'Skills',
  experience: 'Experience',
  about: 'About',
  compensation: 'Compensation',
  location: 'Location',
}

const SECTION_ORDER = [
  'overview',
  'about',
  'responsibilities',
  'qualifications',
  'skills',
  'experience',
  'location',
  'compensation',
]

function Body({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim())
  return (
    <div className="space-y-2 text-sm text-slate-700">
      {lines.map((line, i) =>
        line.trim().startsWith('•') ? (
          <div key={i} className="flex gap-2">
            <span className="text-indigo-400 shrink-0">•</span>
            <span>{line.replace(/^•\s*/, '')}</span>
          </div>
        ) : (
          <p key={i}>{line}</p>
        ),
      )}
    </div>
  )
}

function QuestionGroups({ questions }: { questions: InterviewQuestion[] }) {
  const byRound = questions.reduce<Record<string, InterviewQuestion[]>>((acc, q) => {
    ;(acc[q.round_name] ??= []).push(q)
    return acc
  }, {})
  return (
    <div className="space-y-4">
      {Object.entries(byRound).map(([round, qs]) => (
        <div key={round}>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">
            {round} <span className="font-normal text-slate-400">({qs.length})</span>
          </h4>
          <ul className="space-y-1.5">
            {qs.map((q) => (
              <li key={q.id} className="flex gap-2 text-sm text-slate-700">
                <span className={q.starred ? 'text-amber-500' : 'text-slate-300'}>
                  {q.starred ? '★' : '•'}
                </span>
                <span>{q.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default function JDDetailPage() {
  const { slug } = useParams()
  const [jd, setJd] = useState<JDDetail | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'jd' | 'prep' | 'questions'>('jd')

  useEffect(() => {
    setJd(null)
    api<JDDetail>(`/api/jds/${slug}`).then(setJd).catch((e) => setError(e.message))
  }, [slug])

  if (error) return <p className="text-red-600">{error}</p>
  if (!jd) return <p className="text-slate-500">Loading…</p>

  const sections = jd.sections ?? {}
  const keys = SECTION_ORDER.filter((k) => sections[k]).concat(
    Object.keys(sections).filter((k) => !SECTION_ORDER.includes(k)),
  )

  const tabs = [
    { id: 'jd' as const, label: 'Job description' },
    { id: 'prep' as const, label: `Prepare for this role (${jd.prep_topics.length})` },
    { id: 'questions' as const, label: `Interview questions (${jd.interview_questions.length})` },
  ]

  return (
    <div>
      <Link to={`/companies/${jd.company_slug}`} className="text-sm text-indigo-600 hover:underline">
        ← {jd.company_name}
      </Link>
      <h1 className="text-2xl font-bold mt-2">{jd.role}</h1>
      <div className="flex flex-wrap items-center gap-2 mt-2 mb-4">
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          {jd.category}
        </span>
        {jd.skills.map((s) => (
          <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
            {s}
          </span>
        ))}
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap -mb-px ${
              tab === t.id
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'jd' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          {keys.length === 0 ? (
            <Body text={jd.full_text} />
          ) : (
            keys.map((k) => (
              <section key={k}>
                <h3 className="font-semibold mb-2">{SECTION_LABELS[k] ?? k}</h3>
                <Body text={sections[k]} />
              </section>
            ))
          )}
          {jd.source_file && (
            <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
              Source: {jd.source_file}
            </p>
          )}
        </div>
      )}

      {tab === 'prep' && (
        <div className="space-y-5">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <h3 className="font-semibold text-indigo-900 mb-1">Your prep plan</h3>
            <p className="text-sm text-indigo-800">
              These aptitude topics matter most for a <strong>{jd.category}</strong> role like this
              one. Work through them in order — each has study material, practice questions and a
              timed test.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {jd.prep_topics.map((t, i) => (
              <Link
                key={t.slug}
                to={`/topics/${t.slug}`}
                className="bg-white rounded-lg border border-slate-200 p-3 hover:border-indigo-300 hover:shadow-sm transition flex items-center gap-3"
              >
                <span className="w-7 h-7 shrink-0 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-sm font-medium">{t.title}</span>
                  <span className="block text-xs text-slate-500">{t.subject_name}</span>
                </span>
              </Link>
            ))}
          </div>

          {jd.interview_questions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold mb-1">What they actually asked</h3>
              <p className="text-sm text-slate-500 mb-4">
                {jd.interview_questions.length} questions reported by candidates at{' '}
                {jd.company_name}. Starred (★) questions came up more than once.
              </p>
              <QuestionGroups questions={jd.interview_questions.slice(0, 12)} />
              {jd.interview_questions.length > 12 && (
                <button
                  onClick={() => setTab('questions')}
                  className="mt-4 text-sm text-indigo-600 hover:underline"
                >
                  See all {jd.interview_questions.length} questions →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'questions' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          {jd.interview_questions.length === 0 ? (
            <p className="text-slate-500 text-sm">
              No interview questions recorded for {jd.company_name} yet.
            </p>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-4">
                Reported by candidates at {jd.company_name}. Starred (★) questions came up more than
                once.
              </p>
              <QuestionGroups questions={jd.interview_questions} />
            </>
          )}
        </div>
      )}

      {jd.related_roles.length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold mb-3">Other roles at {jd.company_name}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {jd.related_roles.map((r) => (
              <Link
                key={r.id}
                to={`/jds/${r.slug}`}
                className="bg-white rounded-lg border border-slate-200 p-3 text-sm hover:border-indigo-300 transition"
              >
                {r.role}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
