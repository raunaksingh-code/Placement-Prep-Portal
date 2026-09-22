import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import type { AttemptResult, AttemptStart, MockTest } from '../../lib/types'
import { AlertTriangle, Camera } from 'lucide-react'

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const MAX_WARNINGS = 1

export default function TestPage() {
  const { testId } = useParams()
  const navigate = useNavigate()
  // Mock test list passes the test meta so the start screen can show real instructions
  const meta = (useLocation().state as { test?: MockTest } | null)?.test
  const [attempt, setAttempt] = useState<AttemptStart | null>(null)
  const [started, setStarted] = useState(false)
  const [error, setError] = useState('')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const submittingRef = useRef(false)
  
  // Proctoring states
  const [warnings, setWarnings] = useState(0)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const answersRef = useRef(answers)
  answersRef.current = answers
  const warningsRef = useRef(warnings)
  warningsRef.current = warnings
  const startedRef = useRef(started)
  startedRef.current = started

  const submit = useCallback(async () => {
    if (submittingRef.current || !attempt) return
    submittingRef.current = true
    try {
      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      
      const result = await api<AttemptResult>(`/api/attempts/${attempt.attempt_id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: answersRef.current }),
      })
      navigate(`/attempts/${result.attempt_id}`)
    } catch (e) {
      submittingRef.current = false
      setError(e instanceof Error ? e.message : 'Submit failed')
    }
  }, [attempt, navigate])

  const issueWarning = useCallback((reason: string) => {
    if (!startedRef.current || submittingRef.current) return
    const currentWarnings = warningsRef.current + 1
    setWarnings(currentWarnings)
    setWarningMessage(`Violation: ${reason}`)
    
    if (currentWarnings >= MAX_WARNINGS) {
      setTimeout(() => {
        submit()
      }, 3000)
    }
  }, [submit])

  // Proctoring event listeners
  useEffect(() => {
    if (!started) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        issueWarning('Tab switching or window minimization detected.')
      }
    }
    const handleBlur = () => {
      issueWarning('You clicked outside the test window.')
    }
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        issueWarning('Exited full screen mode.')
      }
    }
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('Screenshots are disabled.').catch(() => {})
        issueWarning('Screenshots are not allowed.')
      }
      // F12 or Ctrl+Shift+I (DevTools)
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J'))) {
        e.preventDefault()
        issueWarning('Developer tools are not allowed.')
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'U') {
        e.preventDefault()
      }
      // Ctrl+P (Print)
      if (e.ctrlKey && e.key === 'P') {
        e.preventDefault()
      }
      // Ctrl+C, Ctrl+V
      if (e.ctrlKey && (e.key === 'C' || e.key === 'V')) {
        e.preventDefault()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [started, issueWarning])

  useEffect(() => {
    if (!started || secondsLeft === null) return
    if (secondsLeft <= 0) {
      submit()
      return
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000)
    return () => clearTimeout(t)
  }, [started, secondsLeft, submit])
  
  // Cleanup media
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [])

  async function start() {
    try {
      // Request permissions
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      
      // Start audio proctoring
      const audioCtx = new window.AudioContext()
      audioContextRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      
      let noiseViolations = 0
      const checkAudio = () => {
        if (!submittingRef.current && startedRef.current) {
          analyser.getByteFrequencyData(dataArray)
          const sum = dataArray.reduce((a, b) => a + b, 0)
          const avg = sum / dataArray.length
          if (avg > 50) { // Threshold for talking
            noiseViolations++
            if (noiseViolations > 10) { // Buffer to avoid single blips
              issueWarning('Background noise or talking detected.')
              noiseViolations = 0
            }
          } else {
            noiseViolations = Math.max(0, noiseViolations - 1)
          }
        }
        if (!submittingRef.current) {
          requestAnimationFrame(checkAudio)
        }
      }
      checkAudio()
      
      // Enter Fullscreen
      await document.documentElement.requestFullscreen()

      const a = await api<AttemptStart>(`/api/tests/${testId}/start`, { method: 'POST' })
      setAttempt(a)
      setStarted(true)
      if (a.duration_minutes) setSecondsLeft(a.duration_minutes * 60)
      
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start test. Ensure camera/mic permissions are granted and try again.')
    }
  }

  // Set video stream once started
  useEffect(() => {
    if (started && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [started])

  if (error) return <p className="text-red-600 p-8">{error}</p>

  if (!started) {
    return (
      <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <Camera size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold">{meta ? meta.title : 'Ready to start?'}</h1>
            <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Fully Proctored Exam</p>
          </div>
        </div>
        
        {meta && (
          <p className="text-sm text-slate-500 mb-4">
            {meta.question_count} questions · {meta.duration_minutes} minutes
            {meta.sections && meta.sections.length > 1 && ` · ${meta.sections.join(', ')}`}
          </p>
        )}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Proctoring Rules:</h3>
          <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5">
            <li>You must grant <strong>Camera & Microphone</strong> access to start.</li>
            <li>The test will run in <strong>Full Screen</strong> mode. Do not exit it.</li>
            <li><strong>Do not switch tabs</strong> or click outside the window.</li>
            <li><strong>No talking</strong> or background help is allowed.</li>
            <li>Copy/Paste and screenshots are disabled.</li>
            <li className="text-red-600 font-medium">Zero tolerance: ANY violation will result in immediate automatic submission.</li>
          </ul>
        </div>
        
        <button
          onClick={start}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-3 font-medium flex justify-center items-center gap-2 shadow-sm"
        >
          I Agree, Start Test
        </button>
      </div>
    )
  }

  if (!attempt) return <p className="text-slate-500 p-8">Loading…</p>

  const q = attempt.questions[index]
  const answered = Object.keys(answers).length

  // Group the palette by section, keeping the original question numbering
  const paletteGroups: { section: string | null; items: { question: typeof q; index: number }[] }[] =
    []
  attempt.questions.forEach((question, i) => {
    const section = question.section
    const last = paletteGroups[paletteGroups.length - 1]
    if (last && last.section === section) last.items.push({ question, index: i })
    else paletteGroups.push({ section, items: [{ question, index: i }] })
  })

  return (
    <div className="select-none h-screen bg-slate-50 overflow-auto pt-6 px-4 pb-20">
      
      {/* Warning Overlay */}
      {warningMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-900/60 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Proctoring Violation</h2>
            <p className="text-lg text-slate-600 mb-6">{warningMessage}</p>
            <p className="text-red-600 font-medium">Submitting test immediately...</p>
          </div>
        </div>
      )}

      {/* Mini camera preview */}
      <div className="fixed bottom-4 right-4 z-40 bg-white p-1.5 rounded-lg shadow-lg border border-slate-200 pointer-events-none">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          className="w-32 h-24 object-cover rounded bg-slate-900 transform -scale-x-100" 
        />
        <div className="mt-1 flex items-center justify-between px-1">
          <span className="text-[10px] font-medium text-red-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Recording
          </span>
          <span className="text-[10px] font-medium text-slate-500">
            Strict Proctoring
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-bold">{attempt.title}</h1>
          {secondsLeft !== null && (
            <span
              className={`font-mono text-lg font-semibold rounded-lg px-3 py-1 ${
                secondsLeft <= 120 ? 'bg-red-50 text-red-700' : 'bg-white shadow-sm border border-slate-200 text-slate-700'
              }`}
            >
              {formatTime(secondsLeft)}
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-[1fr_220px] gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
              <span>
                Question {index + 1} of {attempt.questions.length}
                {q.section && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                    {q.section}
                  </span>
                )}
              </span>
              <span className="capitalize">{q.difficulty}</span>
            </div>
            <p className="font-medium text-lg mb-5">{q.text}</p>
            <div className="space-y-2">
              {q.options.map((o) => {
                const chosen = answers[String(q.id)] === o
                return (
                  <button
                    key={o}
                    onClick={() =>
                      setAnswers((a) => {
                        const next = { ...a }
                        if (chosen) delete next[String(q.id)]
                        else next[String(q.id)] = o
                        return next
                      })
                    }
                    className={`w-full text-left border rounded-lg px-4 py-2.5 transition ${
                      chosen
                        ? 'border-indigo-500 bg-indigo-50 font-medium'
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {o}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="border border-slate-300 rounded-lg px-4 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              {index < attempt.questions.length - 1 ? (
                <button
                  onClick={() => setIndex((i) => i + 1)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={submit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm"
                >
                  Submit test
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 h-fit shadow-sm">
            <p className="text-xs text-slate-500 mb-3">{answered} of {attempt.questions.length} answered</p>
            {paletteGroups.map((group) => (
              <div key={group.section ?? 'all'} className="mb-3">
                {group.section && (
                  <p className="text-[11px] font-medium text-slate-500 mb-1.5">{group.section}</p>
                )}
                <div className="grid grid-cols-5 gap-1.5">
                  {group.items.map(({ question: qq, index: i }) => (
                    <button
                      key={qq.id}
                      onClick={() => setIndex(i)}
                      className={`h-8 rounded text-xs font-medium border ${
                        i === index
                          ? 'border-indigo-600 ring-1 ring-indigo-600'
                          : 'border-slate-200'
                      } ${answers[String(qq.id)] ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={submit}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 text-sm font-medium shadow-sm"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
