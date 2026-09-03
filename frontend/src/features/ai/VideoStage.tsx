import { useEffect, type RefObject } from 'react'
import { Mic, MicOff, User, Video, VideoOff } from 'lucide-react'

export interface AiParticipant {
  id: string
  name: string
  gradient: string
}

interface VideoStageProps {
  participants: AiParticipant[]
  speakingId: string | null
  userVideoRef: RefObject<HTMLVideoElement | null>
  cameraOn: boolean
  micOn: boolean
  listening: boolean
  onToggleCamera: () => void
  onToggleMic: () => void
  caption?: string
}

function AvatarTile({ participant, speaking }: { participant: AiParticipant; speaking: boolean }) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-2xl bg-slate-900 aspect-video overflow-hidden transition-shadow ${
        speaking ? 'ring-4 ring-emerald-400 shadow-lg shadow-emerald-500/30' : 'ring-1 ring-slate-700'
      }`}
    >
      <div
        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br ${participant.gradient} flex items-center justify-center text-white text-2xl font-bold shadow-xl transition-transform ${
          speaking ? 'scale-110' : 'scale-100'
        }`}
      >
        {participant.name[0]}
      </div>
      <p className="mt-3 text-sm font-medium text-white/90">{participant.name}</p>
      {speaking && (
        <div className="absolute bottom-3 flex items-end gap-0.5 h-4">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-emerald-400 animate-[bounce_0.9s_ease-in-out_infinite]"
              style={{ height: '100%', animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      )}
      <span className="absolute top-2.5 left-2.5 text-[11px] font-medium text-white/70 bg-black/30 px-2 py-0.5 rounded-full">
        AI
      </span>
    </div>
  )
}

export default function VideoStage({
  participants,
  speakingId,
  userVideoRef,
  cameraOn,
  micOn,
  listening,
  onToggleCamera,
  onToggleMic,
  caption,
}: VideoStageProps) {
  useEffect(() => {
    // no-op effect kept for future stream lifecycle hooks
  }, [])

  return (
    <div className="rounded-2xl bg-slate-950 p-3 sm:p-4">
      <div className={`grid gap-3 ${participants.length > 1 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {participants.map((p) => (
          <AvatarTile key={p.id} participant={p} speaking={speakingId === p.id} />
        ))}
        <div className="relative rounded-2xl bg-slate-900 aspect-video overflow-hidden ring-1 ring-slate-700">
          {cameraOn ? (
            <video ref={userVideoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
              <User size={32} />
              <p className="mt-2 text-xs">Camera off</p>
            </div>
          )}
          <span className="absolute top-2.5 left-2.5 text-[11px] font-medium text-white/70 bg-black/30 px-2 py-0.5 rounded-full">
            You
          </span>
          {listening && (
            <span className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[11px] font-medium text-white bg-red-500/90 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Listening
            </span>
          )}
        </div>
      </div>

      {caption && (
        <div className="mt-3 rounded-xl bg-black/40 px-4 py-2.5 text-center">
          <p className="text-sm text-white/90 leading-relaxed">{caption}</p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          onClick={onToggleMic}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
            micOn ? 'bg-white text-slate-900' : 'bg-red-500 text-white'
          }`}
        >
          {micOn ? <Mic size={16} /> : <MicOff size={16} />}
          {micOn ? 'Mic on' : 'Mic off'}
        </button>
        <button
          onClick={onToggleCamera}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
            cameraOn ? 'bg-white text-slate-900' : 'bg-red-500 text-white'
          }`}
        >
          {cameraOn ? <Video size={16} /> : <VideoOff size={16} />}
          {cameraOn ? 'Camera on' : 'Camera off'}
        </button>
      </div>
    </div>
  )
}
