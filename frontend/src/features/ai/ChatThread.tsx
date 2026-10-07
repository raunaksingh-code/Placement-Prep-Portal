import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
    <div className="flex flex-col h-[36rem] rounded-2xl bg-slate-50/50 border border-slate-100 overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 && !loading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-6">
            {emptyState}
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] sm:max-w-[75%] px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                  m.role === 'user'
                    ? `${accent} text-white rounded-2xl rounded-br-sm whitespace-pre-wrap`
                    : 'bg-white text-slate-700 border border-slate-200/60 rounded-2xl rounded-bl-sm shadow-slate-200/40'
                }`}
              >
                {m.role === 'ai' ? (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-outside ml-4 mb-3 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-4 mb-3 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li className="" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-slate-900" {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-5 mb-3 text-slate-900" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-base font-bold mt-4 mb-2 text-slate-900" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-3 mb-2 text-slate-900" {...props} />,
                      a: ({node, ...props}) => <a className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2" {...props} />,
                      code: ({node, className, children, ...props}: any) => {
                        const match = /language-(\w+)/.exec(className || '')
                        const inline = !match && !className?.includes('language-')
                        return inline ? (
                          <code className="bg-slate-100/80 px-1.5 py-0.5 rounded-md text-fuchsia-600 text-[0.8em] font-mono border border-slate-200/50" {...props}>{children}</code>
                        ) : (
                          <div className="bg-slate-800 rounded-xl overflow-hidden my-3 shadow-inner border border-slate-700">
                            <div className="px-4 py-1.5 bg-slate-900 border-b border-slate-700 text-slate-400 text-xs font-medium uppercase tracking-wider">{match?.[1] || 'code'}</div>
                            <pre className="p-4 overflow-x-auto text-slate-50 text-[0.85em] font-mono leading-relaxed">
                              <code className={className} {...props}>{children}</code>
                            </pre>
                          </div>
                        )
                      }
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="px-5 py-4 bg-white border border-slate-200/60 rounded-2xl rounded-bl-sm shadow-sm flex gap-1.5 items-center">
              <span className="w-2 h-2 rounded-full bg-fuchsia-400/60 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-fuchsia-400/80 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-bounce" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-100">
        <div className="flex items-end gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-fuchsia-500/20 focus-within:border-fuchsia-400 transition-all">
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
            className="flex-1 resize-none px-3 py-2.5 bg-transparent outline-none text-sm max-h-32 text-slate-700 placeholder:text-slate-400"
          />
          <button
            onClick={send}
            disabled={loading || !draft.trim()}
            className={`shrink-0 flex items-center justify-center w-10 h-10 mb-0.5 mr-0.5 rounded-xl text-white ${accent} hover:shadow-md hover:shadow-fuchsia-500/20 transition-all disabled:opacity-40 disabled:hover:shadow-none`}
          >
            <Send size={18} className={draft.trim() && !loading ? "translate-x-0.5 -translate-y-0.5 transition-transform" : ""} />
          </button>
        </div>
      </div>
    </div>
  )
}
