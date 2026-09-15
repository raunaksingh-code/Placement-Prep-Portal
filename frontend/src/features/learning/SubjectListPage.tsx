import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import type { Subject } from '../../lib/types'

const SUBJECT_META: Record<string, { icon: string; blurb: string }> = {
  'quantitative-aptitude': { icon: '🔢', blurb: 'Arithmetic, algebra, geometry, DI — the core of every aptitude round.' },
  'logical-reasoning': { icon: '🧩', blurb: 'Puzzles, arrangements, series, syllogisms and more.' },
  'verbal-ability': { icon: '📖', blurb: 'Grammar, vocabulary, reading comprehension.' },
  finance: { icon: '💰', blurb: 'Financial statements, valuation, ratios and corporate finance basics.' },
  operations: { icon: '⚙️', blurb: 'Supply chain, inventory, Lean/Six Sigma and quality management.' },
  analytics: { icon: '📊', blurb: 'Data analytics fundamentals, statistics, visualization and forecasting.' },
  marketing: { icon: '📣', blurb: 'STP, the 4Ps, digital channels, consumer behavior and branding.' },
}

interface SubjectListPageProps {
  track?: 'aptitude' | 'domain'
  title?: string
  subtitle?: string
}

export default function SubjectListPage({
  track = 'aptitude',
  title = 'Aptitude Learning Center',
  subtitle = 'Pick a subject, learn the concepts, then practice and test yourself.',
}: SubjectListPageProps) {
  const [subjects, setSubjects] = useState<Subject[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setSubjects(null)
    api<Subject[]>(`/api/subjects?track=${track}`).then(setSubjects).catch((e) => setError(e.message))
  }, [track])

  if (error) return <p className="text-red-600">{error}</p>
  if (!subjects) return <p className="text-slate-500">Loading…</p>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{title}</h1>
      <p className="text-slate-500 mb-6">{subtitle}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => {
          const meta = SUBJECT_META[s.slug] ?? { icon: '📚', blurb: '' }
          return (
            <Link
              key={s.id}
              to={`/subjects/${s.slug}`}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-300 transition"
            >
              <div className="text-3xl mb-3">{meta.icon}</div>
              <h2 className="font-semibold text-lg">{s.name}</h2>
              <p className="text-sm text-slate-500 mt-1">{meta.blurb}</p>
              <p className="text-xs text-indigo-600 font-medium mt-3">
                {s.topic_count ? `${s.topic_count} topics` : 'Coming soon'}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
