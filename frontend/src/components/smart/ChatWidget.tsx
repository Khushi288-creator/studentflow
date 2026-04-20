import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { http } from '../../api/http'
import { useAuthStore } from '../../store/authStore'

type ChatMsg = { id: string; role: 'user' | 'assistant'; text: string }

export default function ChatWidget() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'm0',
      role: 'assistant',
      text: 'Hi! I\'m your AI assistant 🤖 Ask me anything — travel, food, skin care, studies, coding, or anything else!',
    },
  ])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const intro = useMemo(() => {
    if (!user) return null
    if (user.role === 'student') return 'Ask me anything — studies, travel, food & more'
    if (user.role === 'teacher') return 'Ask me anything — teaching, general topics & more'
    return 'Ask me anything — school, general topics & more'
  }, [user])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      // Send last 10 messages as history for context
      const history = messages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.text,
      }))
      const res = await http.post('/assistant/chat', {
        message,
        role: user?.role ?? 'student',
        history,
      })
      return res.data as { reply: string }
    },
    onMutate: (vars) => {
      // Add user message immediately
      setMessages(prev => [...prev, { id: `u_${Date.now()}`, role: 'user', text: vars }])
    },
    onSuccess: (d) => {
      setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'assistant', text: d.reply }])
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.reply || err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.'
      setMessages(prev => [...prev, { id: `e_${Date.now()}`, role: 'assistant', text: `⚠️ ${msg}` }])
    },
  })

  const send = () => {
    const v = input.trim()
    if (!v || chatMutation.isPending) return
    chatMutation.mutate(v)
    setInput('')
  }

  // Hide on home page — only show when logged in
  if (!user) return null

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-500 hover:to-purple-500 transition-all hover:scale-110"
        aria-label="Open AI chat"
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <span className="text-lg font-bold">AI</span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex w-[92vw] max-w-sm flex-col rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0f172a] shadow-2xl shadow-black/20 overflow-hidden"
          style={{ height: '480px' }}>

          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-200 dark:border-white/8 bg-white/5 px-4 py-3 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-md shadow-indigo-500/20">
              AI
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">AI Assistant</div>
              {intro && <div className="text-xs text-slate-500 dark:text-slate-500">{intro}</div>}
            </div>
            <button type="button" onClick={() => setOpen(false)}
              className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-semibold text-slate-400 hover:bg-white/5 transition-colors">
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white">
                    AI
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-sm shadow-md shadow-indigo-500/20'
                    : 'border border-slate-200 dark:border-white/8 bg-white/5 text-slate-200 rounded-bl-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white">
                  AI
                </div>
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-white/8 bg-white/5 px-4 py-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 dark:border-white/8 bg-white/80 dark:bg-white/3 px-3 py-3 shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask anything..."
                className="h-10 flex-1 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors"
                onKeyDown={e => { if (e.key === 'Enter') send() }}
              />
              <button
                type="button"
                disabled={!input.trim() || chatMutation.isPending}
                onClick={send}
                className="h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 text-sm font-semibold text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 transition-all shadow-md shadow-indigo-500/20"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
