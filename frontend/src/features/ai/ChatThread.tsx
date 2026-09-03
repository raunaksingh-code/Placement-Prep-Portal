import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Send } from 'lucide-react'
import type { ChatMessage } from '../../lib/types'

interface ChatThreadProps {
  messages: ChatMessage[]
  onSend: (text: string) => void
  loading: boolean
  placeholder?: string
  emptyState?: ReactNode
  accent?: string
}

export default function ChatThread({
  messages,
  onSend,
  loading,
  placeholder = 'Type a message...',
  emptyState,
  accent = 'bg-indigo-600',
}: ChatThreadProps) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  const send = () => {
    const text = draft.trim()
    if (!text || loading) return
    setDraft('')
    onSend(text)
  }

  return (
    <div className="flex flex-col h-[32rem] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !loading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-6">
            {emptyState}
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                  m.role === 'user'
                    ? `${accent} text-white rounded-br-sm`
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 bg-white border border-slate-200 shadow-sm flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-end gap-2 p-3 border-t border-slate-200 bg-white">
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder={placeholder}
          className="flex-1 resize-none px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm max-h-32"
        />
        <button
          onClick={send}
          disabled={loading || !draft.trim()}
          className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-lg text-white ${accent} hover:brightness-110 transition disabled:opacity-40`}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
