import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import type { TopicSummary } from '../../lib/types'

export default function TopicListPage() {
  const { slug } = useParams()
  const [topics, setTopics] = useState<TopicSummary[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<TopicSummary[]>(`/api/subjects/${slug}/topics`).then(setTopics).catch((e) => setError(e.message))
  }, [slug])

  if (error) return <p className="text-red-600">{error}</p>
  if (!topics) return <p className="text-slate-500">Loading…</p>

  return (
    <div>
      <Link to="/aptitude" className="text-sm text-indigo-600 hover:underline">← All subjects</Link>
      <h1 className="text-2xl font-bold mt-2 mb-6 capitalize">{slug?.replace(/-/g, ' ')}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {topics.map((t, i) => (
          <Link
            key={t.id}
            to={`/topics/${t.slug}`}
            className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-center justify-between hover:border-indigo-300 hover:shadow-sm transition"
          >
            <span className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400 w-6">{String(i + 1).padStart(2, '0')}</span>
              <span className="font-medium">{t.title}</span>
            </span>
            <span className="flex gap-1.5">
              {t.has_content && (
                <span className="text-[10px] uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">Full content</span>
              )}
              {t.has_questions && (
                <span className="text-[10px] uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5">Tests</span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
