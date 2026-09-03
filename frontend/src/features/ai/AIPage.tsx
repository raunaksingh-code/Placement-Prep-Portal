import { useRef, useState } from 'react'
import { Bot, FileUp, Loader2, MessagesSquare, Mic, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { extractPdfText } from '../../lib/pdf'
import type { ATSResponse, AnswerResponse, ChatMessage, ChatReply } from '../../lib/types'
import ChatThread from './ChatThread'
import InterviewCall from './InterviewCall'
import GdCall from './GdCall'

type Tab = 'ats' | 'answer' | 'mock-interview' | 'mock-gd' | 'chatbot'

const TABS: { id: Tab; label: string; icon: typeof Bot }[] = [
  { id: 'ats', label: 'ATS Resume Grader', icon: FileUp },
  { id: 'answer', label: 'Answer Framer', icon: MessagesSquare },
  { id: 'mock-interview', label: 'Virtual Interview', icon: Mic },
  { id: 'mock-gd', label: 'Virtual GD', icon: Users },
  { id: 'chatbot', label: 'Ask AI', icon: Bot },
]

const INTERVIEW_TYPES = ['HR', 'Technical', 'Behavioral', 'Case Study']
const GD_TOPICS = [
  'Should AI replace human jobs?',
  'Is work-from-home better than office culture?',
  'Social media: boon or bane for society?',
  'Should college placements be merit-only?',
]

export default function AIPage() {
  const [activeTab, setActiveTab] = useState<Tab>('ats')

  // ATS State
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [atsResult, setAtsResult] = useState<ATSResponse | null>(null)
  const [loadingAts, setLoadingAts] = useState(false)

  // PDF upload state, keyed by field
  const [extracting, setExtracting] = useState<'jd' | 'resume' | null>(null)
  const [uploadError, setUploadError] = useState<{ field: 'jd' | 'resume'; message: string } | null>(null)
  const jdFileRef = useRef<HTMLInputElement>(null)
  const resumeFileRef = useRef<HTMLInputElement>(null)

  const handlePdfUpload = async (field: 'jd' | 'resume', file: File | undefined) => {
    if (!file) return
    setUploadError(null)
    setExtracting(field)
    try {
      const text = await extractPdfText(file)
      if (field === 'jd') setJobDescription(text)
      else setResumeText(text)
    } catch (err) {
      setUploadError({ field, message: err instanceof Error ? err.message : 'Could not read that PDF.' })
    } finally {
      setExtracting(null)
    }
  }

  // Answer Framer State
  const [question, setQuestion] = useState('')
  const [draftAnswer, setDraftAnswer] = useState('')
  const [answerResult, setAnswerResult] = useState<AnswerResponse | null>(null)
  const [loadingAnswer, setLoadingAnswer] = useState(false)

  // Virtual Interview state
  const [interviewType, setInterviewType] = useState(INTERVIEW_TYPES[1])
  const [interviewCompany, setInterviewCompany] = useState('')
  const [interviewStarted, setInterviewStarted] = useState(false)

  // Virtual GD state
  const [gdTopic, setGdTopic] = useState('')
  const [gdStarted, setGdStarted] = useState(false)

  // Chatbot state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)

  const handleAtsSubmit = async () => {
    if (!resumeText || !jobDescription) return
    setLoadingAts(true)
    try {
      const res = await api<ATSResponse>('/api/ai/ats-score', {
        method: 'POST',
        body: JSON.stringify({ resume_text: resumeText, job_description: jobDescription }),
      })
      setAtsResult(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingAts(false)
    }
  }

  const handleAnswerSubmit = async () => {
    if (!question || !draftAnswer) return
    setLoadingAnswer(true)
    try {
      const res = await api<AnswerResponse>('/api/ai/frame-answer', {
        method: 'POST',
        body: JSON.stringify({ question, draft_answer: draftAnswer }),
      })
      setAnswerResult(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingAnswer(false)
    }
  }

  const restartInterview = () => setInterviewStarted(false)
  const restartGd = () => {
    setGdStarted(false)
    setGdTopic('')
  }

  const sendChatMessage = async (text: string) => {
    const next: ChatMessage[] = [...chatMessages, { role: 'user', content: text }]
    setChatMessages(next)
    setChatLoading(true)
    try {
      const res = await api<ChatReply>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: next }),
      })
      setChatMessages([...next, { role: 'ai', content: res.reply }])
    } catch (err) {
      console.error(err)
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 mb-4">
          <Bot size={28} />
        </div>
        <h1 className="text-3xl font-bold mb-3 text-slate-900">AI Placement Coach</h1>
        <p className="text-slate-500 max-w-xl mx-auto text-lg">
          Powered by Gemini. Grade your resume, practice mock interviews and group discussions, or
          just ask anything about placements.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex flex-wrap border-b border-slate-200">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 sm:px-5 py-4 text-center font-medium text-sm transition-colors border-b-2 ${
                  activeTab === t.id
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon size={15} />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="p-6 sm:p-8">
          {activeTab === 'ats' && (
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700">Job Description</label>
                    <button
                      type="button"
                      onClick={() => jdFileRef.current?.click()}
                      disabled={extracting === 'jd'}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-60"
                    >
                      {extracting === 'jd' ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <FileUp size={13} />
                      )}
                      {extracting === 'jd' ? 'Reading PDF...' : 'Upload PDF'}
                    </button>
                    <input
                      ref={jdFileRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        handlePdfUpload('jd', e.target.files?.[0])
                        e.target.value = ''
                      }}
                    />
                  </div>
                  <textarea
                    rows={6}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the JD here, or upload a PDF..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm"
                  />
                  {uploadError?.field === 'jd' && (
                    <p className="text-xs text-red-600 mt-1">{uploadError.message}</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700">Your Resume Text</label>
                    <button
                      type="button"
                      onClick={() => resumeFileRef.current?.click()}
                      disabled={extracting === 'resume'}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-60"
                    >
                      {extracting === 'resume' ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <FileUp size={13} />
                      )}
                      {extracting === 'resume' ? 'Reading PDF...' : 'Upload PDF'}
                    </button>
                    <input
                      ref={resumeFileRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        handlePdfUpload('resume', e.target.files?.[0])
                        e.target.value = ''
                      }}
                    />
                  </div>
                  <textarea
                    rows={10}
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste your resume content here, or upload a PDF..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm"
                  />
                  {uploadError?.field === 'resume' && (
                    <p className="text-xs text-red-600 mt-1">{uploadError.message}</p>
                  )}
                </div>
                <button
                  onClick={handleAtsSubmit}
                  disabled={loadingAts || !resumeText || !jobDescription}
                  className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {loadingAts ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Analyzing...
                    </>
                  ) : (
                    'Get ATS Score'
                  )}
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                {atsResult ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-6">
                      <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold text-white shadow-lg ${
                        atsResult.score >= 80 ? 'bg-green-500 shadow-green-500/30' :
                        atsResult.score >= 60 ? 'bg-amber-500 shadow-amber-500/30' : 'bg-red-500 shadow-red-500/30'
                      }`}>
                        {atsResult.score}
                      </div>
                      <p className="mt-3 font-medium text-slate-700">ATS Match Score</p>
                    </div>

                    <div className="mb-6 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                      <h3 className="font-semibold text-slate-900 mb-2">Overall Feedback</h3>
                      <p className="text-sm text-slate-600">{atsResult.feedback}</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                      <h3 className="font-semibold text-slate-900 mb-2">Suggestions for Improvement</h3>
                      <ul className="space-y-2 text-sm text-slate-600">
                        {atsResult.suggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-indigo-500 mt-0.5">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <div className="text-5xl mb-4 opacity-50">📄</div>
                    <p>Paste the Job Description and your Resume to see your ATS match score and get actionable feedback.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'answer' && (
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Interview Question</label>
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g. Tell me about a time you failed."
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Your Draft Answer</label>
                  <textarea
                    rows={8}
                    value={draftAnswer}
                    onChange={(e) => setDraftAnswer(e.target.value)}
                    placeholder="How would you answer this? Just type your thoughts..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm"
                  />
                </div>
                <button
                  onClick={handleAnswerSubmit}
                  disabled={loadingAnswer || !question || !draftAnswer}
                  className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {loadingAnswer ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Framing Answer...
                    </>
                  ) : (
                    'Improve My Answer'
                  )}
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                {answerResult ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-6 bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative">
                      <div className="absolute -top-3 -left-3 bg-indigo-100 text-indigo-700 w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-sm">✨</div>
                      <h3 className="font-semibold text-slate-900 mb-2 pl-3">Improved Answer</h3>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{answerResult.improved_answer}</p>
                    </div>

                    <div className="bg-amber-50 p-5 rounded-xl border border-amber-100">
                      <h3 className="font-semibold text-amber-900 mb-2">Coach's Feedback</h3>
                      <p className="text-sm text-amber-800">{answerResult.feedback}</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <div className="text-5xl mb-4 opacity-50">💬</div>
                    <p>Enter an interview question and your rough draft answer. The AI will structure it professionally.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'mock-interview' && (
            <div>
              {!interviewStarted ? (
                <div className="max-w-md mx-auto text-center py-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg mb-4">
                    <Mic size={24} />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-1">Start a Virtual Interview</h2>
                  <p className="text-sm text-slate-500 mb-6">
                    The AI plays the interviewer and asks you questions one at a time, then gives you a
                    scored summary at the end.
                  </p>
                  <div className="text-left space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Interview Type</label>
                      <div className="flex flex-wrap gap-2">
                        {INTERVIEW_TYPES.map((t) => (
                          <button
                            key={t}
                            onClick={() => setInterviewType(t)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                              interviewType === t
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 text-slate-600 hover:border-emerald-400'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Company <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        value={interviewCompany}
                        onChange={(e) => setInterviewCompany(e.target.value)}
                        placeholder="e.g. Deloitte, TCS..."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    You'll be asked to allow camera and microphone access - this is a real video call
                    with the AI interviewer.
                  </p>
                  <button
                    onClick={() => setInterviewStarted(true)}
                    className="mt-3 w-full py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition shadow-md"
                  >
                    Start Interview
                  </button>
                </div>
              ) : (
                <InterviewCall interviewType={interviewType} company={interviewCompany} onRestart={restartInterview} />
              )}
            </div>
          )}

          {activeTab === 'mock-gd' && (
            <div>
              {!gdStarted ? (
                <div className="max-w-md mx-auto text-center py-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg mb-4">
                    <Users size={24} />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-1">Start a Virtual Group Discussion</h2>
                  <p className="text-sm text-slate-500 mb-6">
                    Two AI participants, Aisha and Rohan, join the discussion with you and give you
                    feedback at the end.
                  </p>
                  <div className="text-left space-y-3">
                    <label className="block text-sm font-medium text-slate-700">Pick a topic</label>
                    <div className="flex flex-col gap-2">
                      {GD_TOPICS.map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setGdTopic(t)
                            setGdStarted(true)
                          }}
                          className="text-left px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-700 hover:border-cyan-400 hover:bg-cyan-50 transition"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <input
                        value={gdTopic}
                        onChange={(e) => setGdTopic(e.target.value)}
                        placeholder="Or type your own topic..."
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                      />
                      <button
                        onClick={() => gdTopic.trim() && setGdStarted(true)}
                        disabled={!gdTopic.trim()}
                        className="px-4 py-2.5 bg-cyan-600 text-white font-medium rounded-xl hover:bg-cyan-700 transition disabled:opacity-50"
                      >
                        Start
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    You'll be asked to allow camera and microphone access - this is a real video call
                    with the group.
                  </p>
                </div>
              ) : (
                <GdCall topic={gdTopic} onRestart={restartGd} />
              )}
            </div>
          )}

          {activeTab === 'chatbot' && (
            <ChatThread
              messages={chatMessages}
              onSend={sendChatMessage}
              loading={chatLoading}
              placeholder="Ask anything about placements..."
              accent="bg-fuchsia-600"
              emptyState={
                <>
                  <Bot size={40} className="opacity-40 mb-3" />
                  <p className="font-medium text-slate-500 mb-1">Ask me anything about placements</p>
                  <p className="text-sm">
                    Aptitude topics, resume advice, specific companies, GD tips, salary negotiation - fire away.
                  </p>
                </>
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
