import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Bot,
  Briefcase,
  Building2,
  Globe2,
  Handshake,
  MessagesSquare,
  Newspaper,
  Rocket,
  Search,
  Target,
  Timer,
  TrendingUp,
  UserRound,
} from 'lucide-react'
import { api } from '../../lib/api'
import type { HomeSummary } from '../../lib/types'

export default function HomePage() {
  const [summary, setSummary] = useState<HomeSummary | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    api<HomeSummary>('/api/home').then(setSummary).catch(() => {})
  }, [])

  const topicCount = summary?.topic_count ?? 0
  const subjectCount = summary?.subject_count ?? 0
  const jdCount = summary?.jd_count ?? 0
  const questionCount = summary?.question_count ?? 0
  const companyCount = summary?.company_count ?? 0
  const mockCount = summary?.mock_test_count ?? 0
  const guideCount = summary?.guide_count ?? 0
  const domainTopicCount = summary?.domain_topic_count ?? 0
  const domainSubjectCount = summary?.domain_subject_count ?? 0

  const cards = [
    {
      to: '/aptitude',
      icon: Target,
      gradient: 'from-blue-500 to-indigo-600',
      title: 'Aptitude Preparation',
      blurb: 'Learn each topic, then practice and take timed tests.',
      stat: topicCount ? `${topicCount} topics across ${subjectCount} subjects` : '',
    },
    {
      to: '/domain-prep',
      icon: Briefcase,
      gradient: 'from-teal-500 to-cyan-600',
      title: 'Domain Preparation',
      blurb: 'Finance, Operations, Analytics and Marketing — core concepts for domain interviews.',
      stat: domainTopicCount ? `${domainTopicCount} topics across ${domainSubjectCount} domains` : '',
    },
    {
      to: '/mock-tests',
      icon: Timer,
      gradient: 'from-amber-500 to-orange-600',
      title: 'Mock Tests',
      blurb: 'Full-length and sectional papers, timed with negative marking.',
      stat: mockCount ? `${mockCount} tests available` : '',
    },
    {
      to: '/interview-prep',
      icon: Handshake,
      gradient: 'from-emerald-500 to-teal-600',
      title: 'Interview Preparation',
      blurb: 'HR, resume, GD, technical, guesstimates and cases — with real questions.',
      stat: guideCount ? `${guideCount} guides` : '',
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
      stat: summary?.progress_attempts
        ? `${summary.progress_attempts} tests · ${summary.progress_accuracy}% accuracy`
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
      to: '/business-news',
      icon: Newspaper,
      gradient: 'from-blue-600 to-indigo-800',
      title: 'Business News',
      blurb: 'Daily business and market news fetched directly via RSS feeds.',
      stat: 'Real-time updates',
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
    { label: 'Topics', value: topicCount },
    { label: 'Companies', value: companyCount },
    { label: 'Questions', value: questionCount },
    { label: 'Mock tests', value: mockCount },
  ]

  const filteredCards = cards.filter((c) => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.blurb.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold text-slate-900">Explore Modules</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
        </div>

        {filteredCards.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
            No modules match your search.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map((c, i) => {
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
        )}
      </section>
    </div>
  )
}
