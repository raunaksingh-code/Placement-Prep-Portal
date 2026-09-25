import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, downloadFile, getUser } from '../../lib/api'
import type { MockTest } from '../../lib/types'
import { FileText, Download, Trash2 } from 'lucide-react'

const GROUPS: { key: string; title: string; blurb: string; match: (t: MockTest) => boolean }[] = [
  {
    key: 'full_mock',
    title: 'Full mock tests',
    blurb: 'Full-length papers covering all three sections, like a real placement test.',
    match: (t) => t.test_type === 'full_mock',
  },
  {
    key: 'sectional',
    title: 'Sectional tests',
    blurb: 'One section at a time — useful when you want to drill a single area.',
    match: (t) => t.test_type === 'sectional' && t.track !== 'domain',
  },
  {
    key: 'domain',
    title: 'Domain tests',
    blurb: 'Finance, Operations, Analytics or Marketing — one domain at a time.',
    match: (t) => t.test_type === 'sectional' && t.track === 'domain',
  },
]

export default function MockTestListPage() {
  const [tests, setTests] = useState<MockTest[] | null>(null)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const navigate = useNavigate()
  
  const isAdmin = getUser()?.is_admin

  useEffect(() => {
    api<MockTest[]>('/api/mock-tests').then(setTests).catch((e) => setError(e.message))
  }, [])

  function open(test: MockTest) {
    navigate(`/tests/${test.id}`, { state: { test } })
  }

  async function handleDownload(test: MockTest) {
    if (!test.document_filename) return
    try {
      setDownloadingId(test.id)
      await downloadFile(`/api/tests/${test.id}/document`, test.document_filename)
    } catch (e: any) {
      alert("Failed to download: " + e.message)
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleDelete(test: MockTest) {
    if (!confirm(`Are you sure you want to delete "${test.title}"?`)) return
    try {
      setDeletingId(test.id)
      await api(`/api/admin/tests/${test.id}`, { method: 'DELETE' })
      setTests(tests => tests ? tests.filter(t => t.id !== test.id) : null)
    } catch (e: any) {
      alert("Failed to delete: " + e.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!tests) return <p className="text-slate-500">Loading...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Mock Tests</h1>
      <p className="text-slate-500 mb-6">
        Timed papers with negative marking. Each mock has a fixed question set, so you can retake it
        and compare your scores.
      </p>

      {GROUPS.map((group) => {
        const items = tests.filter(group.match)
        if (!items.length) return null
        return (
          <section key={group.key} className="mb-8">
            <h2 className="font-semibold text-lg">{group.title}</h2>
            <p className="text-sm text-slate-500 mb-3">{group.blurb}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col"
                >
                  <h3 className="font-medium flex items-center gap-2">
                    {t.has_document && <FileText size={18} className="text-emerald-500" />}
                    {t.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {t.has_document ? (
                      <span>Document Test</span>
                    ) : (
                      <span>{t.question_count} questions • {t.duration_minutes} min • -{t.negative_mark} per wrong answer</span>
                    )}
                  </p>
                  {t.sections && t.sections.length > 1 && (
                    <p className="text-xs text-slate-400 mt-1">{t.sections.join(' • ')}</p>
                  )}
                  {t.description && (
                    <p className="text-sm text-slate-600 mt-2 flex-1">{t.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      {t.has_document ? (
                        <button
                          onClick={() => handleDownload(t)}
                          disabled={downloadingId === t.id}
                          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          <Download size={16} />
                          {downloadingId === t.id ? 'Downloading...' : 'Download Test'}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => open(t)}
                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                          >
                            {t.attempt_count ? 'Retake test' : 'Start test'}
                          </button>
                          {t.attempt_count > 0 && (
                            <span className="text-xs text-slate-500">
                              {t.attempt_count} attempt{t.attempt_count > 1 ? 's' : ''} • best{' '}
                              <strong className="text-slate-700">{t.best_score}</strong>/{t.question_count}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(t)}
                        disabled={deletingId === t.id}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete test"
                      >
                        <Trash2 size={18} />
                      </button>
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
