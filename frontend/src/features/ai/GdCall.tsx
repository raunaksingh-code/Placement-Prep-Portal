import { useEffect, useRef, useState } from 'react'
import { Mic, RotateCcw, Send } from 'lucide-react'
import { api } from '../../lib/api'
import type { ChatMessage, ChatReply } from '../../lib/types'
import VideoStage, { type AiParticipant } from './VideoStage'
import { cancelSpeech, isSpeechRecognitionSupported, createRecognizer, speak } from './useSpeech'

const PARTICIPANTS: AiParticipant[] = [
  { id: 'aisha', name: 'Aisha', gradient: 'from-pink-500 to-rose-600' },
  { id: 'rohan', name: 'Rohan', gradient: 'from-blue-500 to-indigo-600' },
]

const VOICE_PROFILE: Record<string, { pitch: number; nameHint: string }> = {
  aisha: { pitch: 1.15, nameHint: 'female' },
  rohan: { pitch: 0.85, nameHint: 'male' },
}

interface Segment {
  speakerId: string
  text: string
}

function parseSpeakerLines(text: string): Segment[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  const segments: Segment[] = []
  let current: Segment | null = null
  for (const line of lines) {
    const match = line.match(/^(Aisha|Rohan)\s*:\s*(.*)$/i)
    if (match) {
      if (current) segments.push(current)
      current = { speakerId: match[1].toLowerCase(), text: match[2] }
    } else if (current) {
      current.text += ' ' + line
    } else {
      current = { speakerId: 'aisha', text: line }
    }
  }
  if (current) segments.push(current)
  return segments
}

interface GdCallProps {
  topic: string
  onRestart: () => void
}

type Phase = 'connecting' | 'ai-speaking' | 'your-turn' | 'listening' | 'thinking' | 'ended'

export default function GdCall({ topic, onRestart }: GdCallProps) {
  const [phase, setPhase] = useState<Phase>('connecting')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [caption, setCaption] = useState('')
  const [speakingId, setSpeakingId] = useState<string | null>(null)
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
      .catch(() => setCameraError('Camera access was denied - you can still join the discussion by voice or text.'))
      .finally(() => {
        if (!cancelled) beginGd()
      })
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      cancelSpeech()
      recognizerRef.current?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const speakSegments = async (segments: Segment[]) => {
    for (const seg of segments) {
      setSpeakingId(seg.speakerId)
      setCaption(seg.text)
      await speak(seg.text, VOICE_PROFILE[seg.speakerId] ?? {})
    }
    setSpeakingId(null)
  }

  const beginGd = async () => {
    if (startedRef.current) return
    startedRef.current = true
    setPhase('ai-speaking')
    try {
      const res = await api<ChatReply>('/api/ai/mock-gd', {
        method: 'POST',
        body: JSON.stringify({ messages: [], topic }),
      })
      await advance(res.reply, [])
    } catch {
      setPhase('your-turn')
    }
  }

  const advance = async (aiText: string, historyBeforeReply: ChatMessage[]) => {
    const nextMessages = [...historyBeforeReply, { role: 'ai' as const, content: aiText }]
    setMessages(nextMessages)
    setPhase('ai-speaking')
    if (aiText.toLowerCase().includes('gd summary')) {
      setSummary(aiText)
      setPhase('ended')
      return
    }
    await speakSegments(parseSpeakerLines(aiText))
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
    if (answer) submitPoint(answer)
    else setPhase('your-turn')
  }

  const submitPoint = async (text: string) => {
    setCaption(text)
    setSpeakingId(null)
    setPhase('thinking')
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    try {
      const res = await api<ChatReply>('/api/ai/mock-gd', {
        method: 'POST',
        body: JSON.stringify({ messages: next, topic }),
      })
      await advance(res.reply, next)
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

  const speechSupported = isSpeechRecognitionSupported()

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">{topic}</div>
        <button onClick={onRestart} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
          <RotateCcw size={13} />
          Restart
        </button>
      </div>

      <VideoStage
        participants={PARTICIPANTS}
        speakingId={speakingId}
        userVideoRef={videoRef}
        cameraOn={cameraOn}
        micOn={micOn}
        listening={phase === 'listening'}
        onToggleCamera={toggleCamera}
        onToggleMic={() => setMicOn((v) => !v)}
        caption={phase === 'listening' ? liveTranscript || 'Listening...' : caption}
      />

      {cameraError && <p className="text-xs text-amber-600 mt-2">{cameraError}</p>}

      <div className="mt-4 flex flex-col items-center gap-3">
        {phase === 'connecting' && <p className="text-sm text-slate-500">Connecting...</p>}
        {phase === 'ai-speaking' && <p className="text-sm text-slate-500">Discussion in progress...</p>}
        {phase === 'thinking' && <p className="text-sm text-slate-500">The group is considering your point...</p>}

        {phase === 'your-turn' && speechSupported && (
          <button
            onClick={startListening}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-cyan-600 text-white font-medium shadow-md hover:bg-cyan-700 transition"
          >
            <Mic size={18} />
            Tap to speak
          </button>
        )}
        {phase === 'listening' && (
          <button
            onClick={stopListeningAndSend}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-500 text-white font-medium shadow-md hover:bg-red-600 transition animate-pulse"
          >
            <Mic size={18} />
            Done speaking
          </button>
        )}

        {(!speechSupported || phase === 'your-turn') && (
          <div className="flex items-center gap-2 w-full max-w-md">
            <input
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && typedAnswer.trim()) {
                  submitPoint(typedAnswer.trim())
                  setTypedAnswer('')
                }
              }}
              placeholder={speechSupported ? 'Or type your point instead...' : 'Type your point (voice input not supported in this browser)...'}
              className="flex-1 px-4 py-2 rounded-full border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
            />
            <button
              onClick={() => {
                if (typedAnswer.trim()) {
                  submitPoint(typedAnswer.trim())
                  setTypedAnswer('')
                }
              }}
              disabled={!typedAnswer.trim()}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-cyan-600 text-white disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </div>
        )}

        {phase === 'ended' && summary && (
          <div className="w-full max-w-lg bg-cyan-50 border border-cyan-200 rounded-xl p-5 mt-2">
            <h3 className="font-semibold text-cyan-900 mb-2">Discussion complete</h3>
            <p className="text-sm text-cyan-800 whitespace-pre-wrap leading-relaxed">{summary}</p>
          </div>
        )}
      </div>
    </div>
  )
}
