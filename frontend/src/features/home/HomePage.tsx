import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Bot,
  Building2,
  Globe2,
  Handshake,
  MessagesSquare,
  Rocket,
  Target,
  Timer,
  TrendingUp,
  UserRound,
} from 'lucide-react'
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
  const companyCount = companies.filter((c) => c.jd_count).length

  const cards = [
    {
      to: '/aptitude',
      icon: Target,
      gradient: 'from-blue-500 to-indigo-600',
      title: 'Aptitude Preparation',
      blurb: 'Learn each topic, then practice and take timed tests.',
      stat: topicCount ? `${topicCount} topics across ${subjects.length} subjects` : '',
    },
    {
      to: '/mock-tests',
      icon: Timer,
      gradient: 'from-amber-500 to-orange-600',
      title: 'Mock Tests',
      blurb: 'Full-length and sectional papers, timed with negative marking.',
      stat: mocks.length ? `${mocks.length} tests available` : '',
    },
    {
      to: '/interview-prep',
      icon: Handshake,
      gradient: 'from-emerald-500 to-teal-600',
      title: 'Interview Preparation',
      blurb: 'HR, resume, GD, technical, guesstimates and cases — with real questions.',
      stat: guides.length ? `${guides.length} guides` : '',
    },
    {
      to: '/companies',
      icon: Building2,
      gradient: 'from-violet-500 to-purple-600',
      title: 'Companies & JDs',
      blurb: 'Browse job descriptions and get a prep plan tailored to each role.',
      stat: jdCount ? `${jdCount} JDs from ${companyCount} companies` : '',
    },
    {
      to: '/question-bank',
      icon: MessagesSquare,
      gradient: 'from-pink-500 to-rose-600',
      title: 'Interview Question Bank',
      blurb: 'Real questions asked, filtered by company, role and round.',
      stat: questionCount ? `${questionCount} questions` : '',
    },
    {
      to: '/progress',
      icon: TrendingUp,
      gradient: 'from-sky-500 to-blue-600',
      title: 'Your Progress',
      blurb: 'Scores, accuracy, syllabus coverage and the topics to revise next.',
      stat: progress?.summary.attempts
        ? `${progress.summary.attempts} tests · ${progress.summary.accuracy}% accuracy`
        : 'No attempts yet',
    },
    {
      to: '/network',
      icon: Globe2,
      gradient: 'from-cyan-500 to-teal-600',
      title: 'Campus Network',
      blurb: 'Connect with peers across campus, view profiles, and build your network.',
      stat: 'New!',
    },
    {
      to: '/projects',
      icon: Rocket,
      gradient: 'from-orange-500 to-red-600',
      title: 'Domain Projects',
      blurb: 'Find and collaborate on live projects in SDE, Data, Marketing, and more.',
      stat: 'Live opportunities',
    },
    {
      to: '/ai-coach',
      icon: Bot,
      gradient: 'from-fuchsia-500 to-purple-600',
      title: 'AI Coach (ATS & Answers)',
      blurb: 'Score your resume for ATS and get AI-powered feedback on your interview answers.',
      stat: 'Powered by Gemini',
    },
    {
      to: '/profile',
      icon: UserRound,
      gradient: 'from-slate-500 to-slate-700',
      title: 'My Profile',
      blurb: 'Update your resume, domain, GitHub, and LinkedIn links.',
      stat: '',
    },
  ]

  const heroStats = [
    { label: 'Topics', value: topicCount || subjects.length },
    { label: 'Companies', value: companyCount || companies.length },
    { label: 'Questions', value: questionCount },
    { label: 'Mock tests', value: mocks.length },
  ]

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 px-6 py-12 sm:px-10 sm:py-14 shadow-[0_20px_60px_-15px_rgba(79,70,229,0.5)]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Placement Preparation
          </h1>
          <p className="mt-3 max-w-2xl text-indigo-100 text-base sm:text-lg">
            Everything for the placement season — aptitude, job descriptions and real interview
            questions, all in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 sm:gap-6">
            {heroStats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-3 min-w-[7.5rem]"
              >
                <div className="text-2xl font-bold text-white">{s.value || '—'}</div>
                <div className="text-xs font-medium text-indigo-100/90 uppercase tracking-wide">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => {
            const Icon = c.icon
            return (
              <Link
                key={c.to}
                to={c.to}
                style={{ animationDelay: `${i * 40}ms` }}
                className="group animate-fade-up relative flex flex-col rounded-2xl bg-white p-6 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_-12px_rgba(15,23,42,0.12)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_40px_-16px_rgba(79,70,229,0.35)] hover:border-indigo-200"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${c.gradient} text-white shadow-lg shadow-slate-900/10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
                  >
                    <Icon size={22} strokeWidth={2} />
                  </div>
                  <ArrowUpRight
                    size={18}
                    className="mt-1 text-slate-300 transition-all duration-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </div>
                <h2 className="mt-4 font-semibold text-lg text-slate-900">{c.title}</h2>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{c.blurb}</p>
                {c.stat && (
                  <p className="text-xs text-indigo-600 font-semibold mt-4 pt-3 border-t border-slate-100">
                    {c.stat}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
