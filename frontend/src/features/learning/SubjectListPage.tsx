import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import type { Subject } from '../../lib/types'

const SUBJECT_META: Record<string, { icon: string; blurb: string }> = {
  'quantitative-aptitude': { icon: '🔢', blurb: 'Arithmetic, algebra, geometry, DI — the core of every aptitude round.' },
  'logical-reasoning': { icon: '🧩', blurb: 'Puzzles, arrangements, series, syllogisms and more.' },
  'verbal-ability': { icon: '📖', blurb: 'Grammar, vocabulary, reading comprehension.' },
}

export default function SubjectListPage() {
  const [subjects, setSubjects] = useState<Subject[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Subject[]>('/api/subjects').then(setSubjects).catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="text-red-600">{error}</p>
  if (!subjects) return <p className="text-slate-500">Loading…</p>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Aptitude Learning Center</h1>
      <p className="text-slate-500 mb-6">Pick a subject, learn the concepts, then practice and test yourself.</p>
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
              <p className="text-xs text-indigo-600 font-medium mt-3">{s.topic_count} topics</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
