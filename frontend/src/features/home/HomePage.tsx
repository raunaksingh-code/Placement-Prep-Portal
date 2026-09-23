import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Bot,
  Briefcase,
  Building2,
  Check,
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
    <div className="space-y-12">
      <section className="relative overflow-hidden prepinsta-grid rounded-3xl shadow-sm border border-slate-200 bg-white pt-16 sm:pt-24 pb-16 sm:pb-24 flex flex-col">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 px-6 sm:px-12">
          <div className="flex-1 max-w-2xl">
            <h1 className="text-4xl sm:text-[3.5rem] font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              <span className="text-emerald-500">Placement Mantra,</span><br/>
              Placements Simplified!!!
            </h1>
            
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm sm:text-base font-bold text-slate-700">
              <span className="flex items-center gap-1.5"><Check size={20} className="text-emerald-500 stroke-[3]" /> Aptitude</span>
              <span className="flex items-center gap-1.5"><Check size={20} className="text-emerald-500 stroke-[3]" /> Interview Prep</span>
              <span className="flex items-center gap-1.5"><Check size={20} className="text-emerald-500 stroke-[3]" /> New Age Skills</span>
            </div>
          </div>
          
          <div className="flex-1 relative w-full h-[350px] sm:h-[450px] hidden md:block mt-8 md:mt-0">
            <div className="absolute inset-0 bg-emerald-500 rounded-tl-[80px] rounded-br-[80px] transform rotate-3" />
            <img src="/hero-bg.png" alt="Campus" className="absolute inset-0 w-full h-full object-cover rounded-tl-[80px] rounded-br-[80px] shadow-xl" />
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h2 className="text-2xl font-extrabold text-slate-900">Explore Modules</h2>
        </div>

        {filteredCards.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
            No modules match your search.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map((c, i) => {
              const Icon = c.icon
            return (
              <Link
                key={c.to}
                to={c.to}
                style={{ animationDelay: `${i * 40}ms` }}
                className="group animate-fade-up relative flex flex-col rounded-2xl bg-white p-6 border border-slate-200 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:border-emerald-200"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition-colors duration-300 group-hover:bg-emerald-50 group-hover:text-emerald-600`}
                  >
                    <Icon size={22} strokeWidth={2.5} />
                  </div>
                  <ArrowUpRight
                    size={18}
                    className="mt-1 text-slate-300 transition-all duration-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </div>
                <h2 className="mt-5 font-bold text-lg text-slate-900">{c.title}</h2>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed font-medium">{c.blurb}</p>
                {c.stat && (
                  <p className="text-xs text-emerald-600 font-bold mt-5 pt-4 border-t border-slate-100 uppercase tracking-wide">
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
