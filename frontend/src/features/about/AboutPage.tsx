import { GraduationCap, Award, Target, BookOpen, Bot, Briefcase, Mail, Phone, MessageCircle, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 space-y-12">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Placement Mantra" className="h-24 sm:h-28 w-auto object-contain drop-shadow-sm" />
        </div>
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold tracking-wide uppercase border border-emerald-200/60 mb-4">
          About Placement Mantra
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Empowering Business School Aspirants for <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Career Success</span>
        </h1>
        <p className="text-slate-500 mt-4 text-base sm:text-lg leading-relaxed">
          Placement Mantra is an elite, all-in-one placement preparation ecosystem designed specifically for MBA graduates and management professionals. 
          From structured aptitude modules and domain-specific knowledge to company intelligence and an AI Placement Coach, everything is crafted to turn interviews into offers.
        </p>
      </div>

      {/* Founder Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Avatar / Profile Card */}
          <div className="text-center md:text-left flex flex-col items-center md:items-start space-y-4">
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 p-1 shadow-lg ring-4 ring-white/10 flex items-center justify-center text-4xl font-extrabold text-white">
              RS
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Raunak Singh</h2>
              <p className="text-emerald-400 font-medium text-sm mt-0.5">Founder & Lead Architect</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2 justify-center md:justify-start">
                <GraduationCap size={15} className="text-emerald-400" />
                <span>PGDM / MBA Candidate</span>
              </div>
              <p className="text-xs text-slate-400">Great Lakes Institute of Management</p>
            </div>
          </div>

          {/* Bio / Vision */}
          <div className="md:col-span-2 space-y-4 text-slate-300 text-sm sm:text-base leading-relaxed">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Award size={18} className="text-emerald-400" /> The Vision Behind the Platform
            </h3>
            <p>
              <strong>Placement Mantra was founded by Raunak Singh</strong>, an MBA candidate at Great Lakes Institute of Management, to empower students and business school aspirants with institutional-grade corporate recruitment intelligence, comprehensive domain preparation, and cutting-edge AI interview coaching.
            </p>
            <p>
              Having experienced the rigorous preparation required for business school campus placements firsthand, 
              Raunak noticed a persistent gap: most preparation portals cater heavily to generic software engineering roles, leaving MBA and management graduates without structured, business-centric placement tools.
            </p>
            <p>
              He architected <strong>Placement Mantra</strong> to solve this exact problem. The platform brings together rigorous business domain prep (Consulting, Finance, Marketing, Operations, and Analytics), company hiring patterns, authentic interview experiences, and a Gemini-powered AI Career Coach tuned exclusively for management interviews.
            </p>

            {/* Quick Contact Buttons */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              <a
                href="mailto:raunaksingh181190@gmail.com"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all border border-white/10"
              >
                <Mail size={14} className="text-emerald-400" /> raunaksingh181190@gmail.com
              </a>
              <a
                href="tel:+919334318989"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all border border-white/10"
              >
                <Phone size={14} className="text-emerald-400" /> +91 9334318989
              </a>
              <a
                href="https://wa.me/918539036364?text=Hi%20Raunak,%20contacting%20you%20via%20Placement%20Mantra"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md transition-all"
              >
                <MessageCircle size={14} /> WhatsApp: +91 8539036364
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Core Pillars */}
      <div>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900">What Makes Placement Mantra Different</h2>
          <p className="text-sm text-slate-500 mt-1">Built specifically for MBA and management hiring cycles</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Briefcase size={22} />
            </div>
            <h3 className="font-bold text-slate-800 text-base">MBA Domain Preparation</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              In-depth concept guides, solved business cases, and targeted tests across Finance (DCF, Comps), Operations (Lean, Six Sigma), Analytics, and Marketing (4Ps, STP).
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center">
              <Bot size={22} />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Dedicated AI Career Coach</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Powered by Google Gemini and trained with strict Business School persona constraints for MBA resume ATS scoring, STAR-method answer framing, case interviews, and GD prep.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={22} />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Corporate Intelligence & JDs</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Secure institutional repository of verified company Job Descriptions, selection patterns, authentic senior interview transcripts, and timed mock tests.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200/80 text-center space-y-4">
        <h3 className="text-xl font-bold text-slate-900">Ready to Accelerate Your Placement Prep?</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Explore curated company question banks, practice timed aptitude assessments, and polish your resume with AI feedback.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            to="/aptitude"
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all"
          >
            Start Preparing
          </Link>
          <Link
            to="/contact"
            className="px-6 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-sm transition-all"
          >
            Contact Founder
          </Link>
        </div>
      </div>
    </div>
  )
}
