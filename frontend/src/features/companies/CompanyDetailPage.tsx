import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import type { CompanyDetail } from '../../lib/types'

export default function CompanyDetailPage() {
  const { slug } = useParams()
  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setCompany(null)
    api<CompanyDetail>(`/api/companies/${slug}`).then(setCompany).catch((e) => setError(e.message))
  }, [slug])

  if (error) return <p className="text-red-600">{error}</p>
  if (!company) return <p className="text-slate-500">Loading…</p>

  return (
    <div>
      <Link to="/companies" className="text-sm text-indigo-600 hover:underline">
        ← All companies
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">{company.name}</h1>
      <p className="text-slate-500 mb-6">
        {company.job_descriptions.length} job description
        {company.job_descriptions.length === 1 ? '' : 's'} · {company.question_count} interview question
        {company.question_count === 1 ? '' : 's'}
      </p>

      {company.question_count > 0 && (
        <Link
          to={`/question-bank?company=${company.slug}`}
          className="inline-block mb-6 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          View {company.question_count} interview questions
          {company.rounds.length > 0 && ` (${company.rounds.join(', ')})`}
        </Link>
      )}

      <h2 className="font-semibold text-lg mb-3">Job descriptions</h2>
      {company.job_descriptions.length === 0 ? (
        <p className="text-slate-500 text-sm">
          No job description on file for this company — only interview questions.
        </p>
      ) : (
        <div className="grid gap-3">
          {company.job_descriptions.map((jd) => (
            <Link
              key={jd.id}
              to={`/jds/${jd.slug}`}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-indigo-300 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium">{jd.role}</h3>
                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {jd.category}
                </span>
              </div>
              {jd.skills.length > 0 && (
                <p className="text-xs text-slate-500 mt-2">{jd.skills.slice(0, 8).join(' · ')}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
