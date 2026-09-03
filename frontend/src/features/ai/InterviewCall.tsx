import { useEffect, useRef, useState } from 'react'
import { Mic, RotateCcw, Send } from 'lucide-react'
import { api } from '../../lib/api'
import type { ChatMessage, ChatReply } from '../../lib/types'
import VideoStage, { type AiParticipant } from './VideoStage'
import { cancelSpeech, isSpeechRecognitionSupported, createRecognizer, speak } from './useSpeech'

const INTERVIEWER: AiParticipant = { id: 'interviewer', name: 'Interviewer', gradient: 'from-emerald-500 to-teal-600' }

interface InterviewCallProps {
  interviewType: string
  company: string
  onRestart: () => void
}

type Phase = 'connecting' | 'ai-speaking' | 'your-turn' | 'listening' | 'thinking' | 'ended'

export default function InterviewCall({ interviewType, company, onRestart }: InterviewCallProps) {
  const [phase, setPhase] = useState<Phase>('connecting')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [caption, setCaption] = useState('')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [summary, setSummary] = useState<string | null>(null)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recognizerRef = useRef<ReturnType<typeof createRecognizer>>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => setCameraError('Camera access was denied - you can still do the interview by voice or text.'))
      .finally(() => {
        if (!cancelled) beginInterview()
      })
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      cancelSpeech()
      recognizerRef.current?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const beginInterview = async () => {
    if (startedRef.current) return
    startedRef.current = true
    setPhase('ai-speaking')
    try {
      const res = await api<ChatReply>('/api/ai/mock-interview', {
        method: 'POST',
        body: JSON.stringify({ messages: [], interview_type: interviewType, company: company || undefined }),
      })
      await sayAndAdvance(res.reply, [])
    } catch {
      setPhase('your-turn')
    }
  }

  const sayAndAdvance = async (aiText: string, historyBeforeReply: ChatMessage[]) => {
    setCaption(aiText)
    const nextMessages = [...historyBeforeReply, { role: 'ai' as const, content: aiText }]
    setMessages(nextMessages)
    setPhase('ai-speaking')
    await speak(aiText, { pitch: 0.95, rate: 1 })
    if (aiText.toLowerCase().includes('interview summary')) {
      setSummary(aiText)
      setPhase('ended')
      return
    }
    setPhase('your-turn')
  }

  const startListening = () => {
    if (!isSpeechRecognitionSupported()) return
    setLiveTranscript('')
    const rec = createRecognizer(
      (transcript) => setLiveTranscript(transcript),
      () => {},
    )
    if (!rec) return
    recognizerRef.current = rec
    rec.start()
    setPhase('listening')
  }

  const stopListeningAndSend = () => {
    recognizerRef.current?.stop()
    recognizerRef.current = null
    const answer = liveTranscript.trim()
    setLiveTranscript('')
    if (answer) submitAnswer(answer)
    else setPhase('your-turn')
  }

  const submitAnswer = async (text: string) => {
    setCaption(text)
    setPhase('thinking')
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    try {
      const res = await api<ChatReply>('/api/ai/mock-interview', {
        method: 'POST',
        body: JSON.stringify({ messages: next, interview_type: interviewType, company: company || undefined }),
      })
      await sayAndAdvance(res.reply, next)
    } catch {
      setPhase('your-turn')
    }
  }

  const toggleCamera = () => {
    const stream = streamRef.current
    if (!stream) return
    stream.getVideoTracks().forEach((t) => (t.enabled = !cameraOn))
    setCameraOn(!cameraOn)
  }

  const toggleMic = () => setMicOn((v) => !v)

  const speechSupported = isSpeechRecognitionSupported()

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {interviewType} Interview{company ? ` · ${company}` : ''}
        </div>
        <button onClick={onRestart} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
          <RotateCcw size={13} />
          Restart
        </button>
      </div>

      <VideoStage
        participants={[INTERVIEWER]}
        speakingId={phase === 'ai-speaking' ? 'interviewer' : null}
        userVideoRef={videoRef}
        cameraOn={cameraOn}
        micOn={micOn}
        listening={phase === 'listening'}
        onToggleCamera={toggleCamera}
        onToggleMic={toggleMic}
        caption={phase === 'listening' ? liveTranscript || 'Listening...' : caption}
      />

      {cameraError && <p className="text-xs text-amber-600 mt-2">{cameraError}</p>}

      <div className="mt-4 flex flex-col items-center gap-3">
        {phase === 'connecting' && <p className="text-sm text-slate-500">Connecting...</p>}
        {phase === 'ai-speaking' && <p className="text-sm text-slate-500">Interviewer is speaking...</p>}
        {phase === 'thinking' && <p className="text-sm text-slate-500">Interviewer is thinking...</p>}

        {phase === 'your-turn' && speechSupported && (
          <button
            onClick={startListening}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 text-white font-medium shadow-md hover:bg-emerald-700 transition"
          >
            <Mic size={18} />
            Tap to answer
          </button>
        )}
        {phase === 'listening' && (
          <button
            onClick={stopListeningAndSend}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-500 text-white font-medium shadow-md hover:bg-red-600 transition animate-pulse"
          >
            <Mic size={18} />
            Done answering
          </button>
        )}

        {(!speechSupported || phase === 'your-turn') && (
          <div className="flex items-center gap-2 w-full max-w-md">
            <input
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && typedAnswer.trim()) {
                  submitAnswer(typedAnswer.trim())
                  setTypedAnswer('')
                }
              }}
              placeholder={speechSupported ? 'Or type your answer instead...' : 'Type your answer (voice input not supported in this browser)...'}
              className="flex-1 px-4 py-2 rounded-full border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
            <button
              onClick={() => {
                if (typedAnswer.trim()) {
                  submitAnswer(typedAnswer.trim())
                  setTypedAnswer('')
                }
              }}
              disabled={!typedAnswer.trim()}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-600 text-white disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </div>
        )}

        {phase === 'ended' && summary && (
          <div className="w-full max-w-lg bg-emerald-50 border border-emerald-200 rounded-xl p-5 mt-2">
            <h3 className="font-semibold text-emerald-900 mb-2">Interview complete</h3>
            <p className="text-sm text-emerald-800 whitespace-pre-wrap leading-relaxed">{summary}</p>
          </div>
        )}
      </div>
    </div>
  )
}
