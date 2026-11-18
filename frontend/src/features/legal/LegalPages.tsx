import { ShieldCheck, FileText, Lock, Building, Scale, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700">
          <ArrowLeft size={16} /> Back to Portal
        </Link>
      </div>

      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm space-y-8">
        <div className="border-b border-slate-100 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck size={16} /> Placement Mantra Compliance
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Privacy Policy & Data Protection</h1>
          <p className="text-slate-500 mt-2 text-base">
            Last updated: November 2026. How we protect student resumes, academic data, and placement records.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Lock size={20} className="text-emerald-600" /> 1. Student Information We Collect
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
            Placement Mantra is designed exclusively for MBA and professional students preparing for campus hiring. We collect:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 text-sm sm:text-base pl-2">
            <li><strong>Account & Profile:</strong> Full name, institutional email address, education history, and profile pictures.</li>
            <li><strong>Resume Files:</strong> Resumes and CVs uploaded for ATS parsing, scoring, and placement drive preparation.</li>
            <li><strong>Mock Test Performance:</strong> Scores, duration, test attempts, question logs, and progress analytics.</li>
            <li><strong>AI Interaction Logs:</strong> Queries submitted to the AI Placement Coach for mock GDs, interview framing, and resume feedback.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck size={20} className="text-emerald-600" /> 2. Resume Confidentiality & Storage Security
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
            Your resume contains sensitive career and contact details. We enforce strict data protection protocols:
          </p>
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-2 text-sm text-slate-700">
            <p><strong>Private Access:</strong> Uploaded resumes are accessible only by you and designated institute placement administrators. Resumes are never accessible to other students or search engine indexers.</p>
            <p><strong>Object Storage Encryption:</strong> Resumes are stored using industry-standard encrypted object storage with secure time-limited presigned URLs for downloads.</p>
            <p><strong>No Commercial Sale:</strong> Student data and resumes are never sold, rented, or distributed to third-party recruitment agencies or advertisers.</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">3. AI & Language Model Processing</h2>
          <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
            Features such as the ATS Resume Scorer, Answer Framer, and Mock GD Assistant utilize Google Gemini API. 
            Information processed by the AI Coach is processed transiently to generate immediate placement feedback and is not retained by external parties to train public foundation models.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">4. Your Data Rights</h2>
          <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
            You retain 100% ownership of your resume and profile data. You may update, replace, or request deletion of your uploaded resume and account records at any time by contacting your Placement Cell administrator or using your profile dashboard.
          </p>
        </section>
      </div>
    </div>
  )
}

export function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700">
          <ArrowLeft size={16} /> Back to Portal
        </Link>
      </div>

      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm space-y-8">
        <div className="border-b border-slate-100 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-4">
            <Scale size={16} /> Placement Cell Guidelines
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Terms of Service & Campus Placement Policy</h1>
          <p className="text-slate-500 mt-2 text-base">
            Guidelines governing the use of job descriptions, mock test resources, and company placement intel.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building size={20} className="text-blue-600" /> 1. Confidentiality of Company JDs & Compensation Intel
          </h2>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900 leading-relaxed">
            <strong>Mandatory PlaceCom Compliance:</strong> Company Job Descriptions (JDs), selection processes, CTC package details, and interview experiences shared on Placement Mantra are provided in confidence for eligible students. 
            Redistributing, publishing, or sharing campus hiring details with external forums, social media, or unauthorized individuals is strictly prohibited and subject to institutional disciplinary action.
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText size={20} className="text-blue-600" /> 2. Assessment & Proctored Test Integrity
          </h2>
          <ul className="list-disc list-inside space-y-2 text-slate-600 text-sm sm:text-base pl-2">
            <li><strong>Fair Practice:</strong> Students taking timed topic tests and full-length mock tests must complete assessments independently without unauthorized aids or answer-sharing.</li>
            <li><strong>Anti-Leakage Measures:</strong> All test questions, solution keys, and scoring metrics are verified server-side. Tampering with client-side responses or attempting to extract answer keys is logged and reported.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">3. AI Coach Guidance Disclaimer</h2>
          <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
            The AI Placement Coach provides automated coaching, interview questions, and ATS resume scoring based on industry patterns and business school frameworks. 
            AI evaluations are coaching benchmarks designed for self-improvement and do not guarantee shortlisting, selection, or employment offers from recruiting firms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">4. Community & Campus Network Conduct</h2>
          <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
            The campus networking and messaging features are provided to foster peer preparation, mentorship, and mock discussion practice. 
            Harassment, spam, fraudulent company experiences, or unprofessional conduct will result in immediate revocation of portal privileges.
          </p>
        </section>
      </div>
    </div>
  )
}
