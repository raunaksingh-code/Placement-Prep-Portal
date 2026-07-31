import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import type { SolvedExample, TopicDetail } from '../../lib/types'

const diffColors: Record<string, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  hard: 'bg-red-50 text-red-700 border-red-200',
}

function DiffBadge({ d }: { d: string }) {
  return (
    <span className={`text-[10px] uppercase tracking-wide border rounded-full px-2 py-0.5 ${diffColors[d] ?? ''}`}>
      {d}
    </span>
  )
}

function StringList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null
  return (
    <section>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </section>
  )
}

function StudyMaterial({ topic }: { topic: TopicDetail }) {
  const rich = topic.rich
  if (!rich) {
    return topic.theory ? (
      <div className="whitespace-pre-wrap leading-relaxed text-slate-700">{topic.theory}</div>
    ) : (
      <p className="text-slate-500">Content for this topic is coming soon.</p>
    )
  }
  const r = rich as Record<string, unknown>
  return (
    <div className="space-y-8">
      {rich.introduction && <p className="text-slate-700 leading-relaxed">{rich.introduction}</p>}
      <StringList title="What you'll learn" items={rich.learning_objectives} />
      {rich.concepts?.length ? (
        <section>
          <h3 className="font-semibold text-lg mb-3">Concepts</h3>
          <div className="space-y-4">
            {rich.concepts.map((c, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg p-4">
                <h4 className="font-medium mb-1.5">{c.heading}</h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <StringList title="Formulas" items={r.formulas as string[]} />
      <StringList title="Shortcut methods" items={r.shortcut_methods as string[]} />
      <StringList title="Common mistakes" items={r.common_mistakes as string[]} />
      <StringList title="Real-life examples" items={r.real_life_examples as string[]} />
      {rich.summary && (
        <section>
          <h3 className="font-semibold text-lg mb-2">Summary</h3>
          <p className="text-slate-700 leading-relaxed">{rich.summary}</p>
        </section>
      )}
      <StringList title="Quick revision notes" items={r.quick_revision_notes as string[]} />
    </div>
  )
}

function ExampleCard({ ex, index }: { ex: SolvedExample; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">
          <span className="text-slate-400 mr-2">Q{index + 1}.</span>
          {ex.question}
        </p>
        <DiffBadge d={ex.difficulty} />
      </div>
      {ex.options && (
        <div className="flex flex-wrap gap-2 mt-3">
          {ex.options.map((o) => (
            <span
              key={o}
              className={`text-sm border rounded-md px-2.5 py-1 ${
                open && o === ex.correct_answer
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200'
              }`}
            >
              {o}
            </span>
          ))}
        </div>
      )}
      {open ? (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-emerald-700 font-medium">Answer: {ex.correct_answer}</p>
          <p className="text-slate-700"><span className="font-medium">Solution: </span>{ex.step_by_step}</p>
          {ex.shortcut && (
            <p className="text-indigo-700"><span className="font-medium">Shortcut: </span>{ex.shortcut}</p>
          )}
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="mt-3 text-sm text-indigo-600 hover:underline">
          Show solution
        </button>
      )}
    </div>
  )
}

export default function TopicDetailPage() {
  const { slug } = useParams()
  const [topic, setTopic] = useState<TopicDetail | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'study' | 'examples'>('study')

  useEffect(() => {
    api<TopicDetail>(`/api/topics/${slug}`).then(setTopic).catch((e) => setError(e.message))
  }, [slug])

  if (error) return <p className="text-red-600">{error}</p>
  if (!topic) return <p className="text-slate-500">Loading…</p>

  return (
    <div>
      <Link to={`/subjects/${topic.subject_slug}`} className="text-sm text-indigo-600 hover:underline">
        ← {topic.subject_name}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4 mt-2 mb-6">
        <h1 className="text-2xl font-bold">{topic.title}</h1>
        <div className="flex gap-2">
          {topic.practice_question_count > 0 && (
            <Link
              to={`/topics/${topic.slug}/practice`}
              className="bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50 rounded-lg px-4 py-2 text-sm font-medium"
            >
              Practice ({topic.practice_question_count} Qs)
            </Link>
          )}
          {topic.tests.map((t) => (
            <Link
              key={t.id}
              to={`/tests/${t.id}`}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              {t.title.includes('Advanced') ? 'Advanced Challenge' : 'Topic Test'}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {(
          [
            ['study', 'Study Material'],
            ['examples', `Solved Examples (${topic.solved_examples.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === key
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'study' && <StudyMaterial topic={topic} />}
      {tab === 'examples' &&
        (topic.solved_examples.length ? (
          <div className="space-y-4">
            {topic.solved_examples.map((ex, i) => (
              <ExampleCard key={ex.id} ex={ex} index={i} />
            ))}
          </div>
        ) : (
          <p className="text-slate-500">Solved examples for this topic are coming soon.</p>
        ))}
    </div>
  )
}
