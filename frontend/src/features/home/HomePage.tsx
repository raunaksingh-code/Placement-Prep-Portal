import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import type { CompanySummary, GuideSummary, MockTest, Progress, Subject } from '../../lib/types'

export default function HomePage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [companies, setCompanies] = useState<CompanySummary[]>([])
  const [mocks, setMocks] = useState<MockTest[]>([])
  const [progress, setProgress] = useState<Progress | null>(null)
  const [guides, setGuides] = useState<GuideSummary[]>([])

  useEffect(() => {
    api<Subject[]>('/api/subjects').then(setSubjects).catch(() => {})
    api<CompanySummary[]>('/api/companies').then(setCompanies).catch(() => {})
    api<MockTest[]>('/api/mock-tests').then(setMocks).catch(() => {})
    api<Progress>('/api/progress').then(setProgress).catch(() => {})
    api<GuideSummary[]>('/api/guides').then(setGuides).catch(() => {})
  }, [])

  const topicCount = subjects.reduce((n, s) => n + s.topic_count, 0)
  const jdCount = companies.reduce((n, c) => n + c.jd_count, 0)
  const questionCount = companies.reduce((n, c) => n + c.question_count, 0)

  const cards = [
    {
      to: '/aptitude',
      icon: '🎯',
      title: 'Aptitude Preparation',
      blurb: 'Learn each topic, then practice and take timed tests.',
      stat: topicCount ? `${topicCount} topics across ${subjects.length} subjects` : '',
    },
    {
      to: '/mock-tests',
      icon: '⏱️',
      title: 'Mock Tests',
      blurb: 'Full-length and sectional papers, timed with negative marking.',
      stat: mocks.length ? `${mocks.length} tests available` : '',
    },
    {
      to: '/interview-prep',
      icon: '🤝',
      title: 'Interview Preparation',
      blurb: 'HR, resume, GD, technical, guesstimates and cases — with real questions.',
      stat: guides.length ? `${guides.length} guides` : '',
    },
    {
      to: '/companies',
      icon: '🏢',
      title: 'Companies & JDs',
      blurb: 'Browse job descriptions and get a prep plan tailored to each role.',
      stat: jdCount ? `${jdCount} JDs from ${companies.filter((c) => c.jd_count).length} companies` : '',
    },
    {
      to: '/question-bank',
      icon: '💬',
      title: 'Interview Question Bank',
      blurb: 'Real questions asked, filtered by company, role and round.',
      stat: questionCount ? `${questionCount} questions` : '',
    },
    {
      to: '/progress',
      icon: '📈',
      title: 'Your Progress',
      blurb: 'Scores, accuracy, syllabus coverage and the topics to revise next.',
      stat: progress?.summary.attempts
        ? `${progress.summary.attempts} tests · ${progress.summary.accuracy}% accuracy`
        : 'No attempts yet',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Placement Preparation</h1>
      <p className="text-slate-500 mb-6">
        Everything for the placement season — aptitude, job descriptions and real interview questions.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-300 transition"
          >
            <div className="text-3xl mb-3">{c.icon}</div>
            <h2 className="font-semibold text-lg">{c.title}</h2>
            <p className="text-sm text-slate-500 mt-1">{c.blurb}</p>
            {c.stat && <p className="text-xs text-indigo-600 font-medium mt-3">{c.stat}</p>}
          </Link>
        ))}
      </div>
    </div>
  )
}
