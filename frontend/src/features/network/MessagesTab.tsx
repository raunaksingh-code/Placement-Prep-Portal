import { useEffect, useState, useRef } from 'react'
import { api, getUser } from '../../lib/api'
import { Send } from 'lucide-react'

// Define types locally based on backend
interface ConversationUser {
  id: number
  full_name: string
  headline: string | null
  domain: string | null
}
interface MessageOut {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  created_at: string
}
interface ConversationOut {
  user: ConversationUser
  last_message: MessageOut | null
}

export function MessagesTab({ preselectUserId }: { preselectUserId?: number }) {
  const me = getUser()
  const [conversations, setConversations] = useState<ConversationOut[]>([])
  const [loading, setLoading] = useState(true)
  const [activeUserId, setActiveUserId] = useState<number | null>(preselectUserId || null)
  
  const [messages, setMessages] = useState<MessageOut[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api<ConversationOut[]>('/api/messages/conversations')
      .then((data) => {
        setConversations(data)
        if (!activeUserId && data.length > 0 && !preselectUserId) {
            setActiveUserId(data[0].user.id)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeUserId, preselectUserId])

  useEffect(() => {
    if (!activeUserId) return
    setLoadingMessages(true)
    api<MessageOut[]>(`/api/messages/${activeUserId}`)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoadingMessages(false))
  }, [activeUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!draft.trim() || !activeUserId || sending) return
    setSending(true)
    const content = draft.trim()
    setDraft('')
    try {
      const msg = await api<MessageOut>(`/api/messages/${activeUserId}`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      })
      setMessages((prev) => [...prev, msg])
      
      // Update conversations list with last message
      setConversations(prev => prev.map(c => 
          c.user.id === activeUserId ? { ...c, last_message: msg } : c
      ).sort((a, b) => {
          const t1 = a.last_message?.created_at || ''
          const t2 = b.last_message?.created_at || ''
          return t2.localeCompare(t1)
      }))
    } catch (e) {
      alert("Failed to send message")
      setDraft(content)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-black/50">Loading conversations...</div>

  if (conversations.length === 0) {
    return (
      <div className="py-12 text-center text-black/50 bg-white border border-black/10 rounded-xl shadow-sm">
        No active conversations. Connect with someone in the Discover tab to start chatting!
      </div>
    )
  }

  const activeUser = conversations.find(c => c.user.id === activeUserId)?.user || conversations[0]?.user

  return (
    <div className="flex h-[36rem] bg-white border border-black/10 rounded-xl shadow-sm overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/3 min-w-[240px] border-r border-black/10 flex flex-col">
        <div className="p-4 border-b border-black/10 font-semibold text-black/90">
          Messages
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => (
            <div
              key={c.user.id}
              onClick={() => setActiveUserId(c.user.id)}
              className={`p-4 border-b border-black/5 cursor-pointer hover:bg-black/5 transition ${
                activeUserId === c.user.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                  {c.user.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-black/90 truncate">{c.user.full_name}</div>
                  <div className="text-xs text-black/50 truncate">
                    {c.last_message ? (c.last_message.sender_id === me?.id ? `You: ${c.last_message.content}` : c.last_message.content) : 'No messages yet'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50 relative">
        {activeUser ? (
          <>
            {/* Header */}
            <div className="p-4 bg-white border-b border-black/10 flex items-center gap-3 shadow-sm z-10">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                {activeUser.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-sm text-black/90">{activeUser.full_name}</div>
                <div className="text-xs text-black/50">{activeUser.headline || activeUser.domain || 'Student'}</div>
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="text-center text-sm text-slate-400 mt-4">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  Start the conversation!
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender_id === me?.id
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                          isMe
                            ? 'bg-[#0A66C2] text-white rounded-br-sm'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-end gap-2">
              <textarea
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 resize-none px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0A66C2] outline-none text-sm max-h-32"
              />
              <button
                onClick={handleSend}
                disabled={sending || !draft.trim()}
                className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg text-white bg-[#0A66C2] hover:bg-[#004182] transition disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            Select a conversation to start chatting.
          </div>
        )}
      </div>
    </div>
  )
}
