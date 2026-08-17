import { useState, useRef, useEffect } from 'react'
import { Send, Lock, ChevronLeft, BadgeCheck, Star } from 'lucide-react'
import { MONO } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { useConversations, useMessages, sendMessage } from '../hooks/useMessages'
import { markListingSold, leaveReview } from '../hooks/useListings'
import { supabase } from '../lib/supabase'

export default function MessagesPage({
  openConversationId = null,
  unreadByConvo = {},
  markRead,
}: {
  openConversationId?: string | null
  unreadByConvo?: Record<string, number>
  markRead?: (conversationId: string) => void
}) {
  const { user } = useAuth()
  const { conversations, loading } = useConversations(user?.id ?? null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const inputRef = useRef<HTMLInputElement>(null)

  // Deal + Review state (per conversation id)
  const [dealsCompleted, setDealsCompleted] = useState<Set<string>>(new Set())
  const [reviewsGiven, setReviewsGiven] = useState<Set<string>>(new Set())
  const [dealLoading, setDealLoading] = useState(false)
  const [reviewStars, setReviewStars] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState('')

  const activeConvo = conversations.find((c) => c.id === activeId) ?? null
  const { messages, bottomRef, refetch: refetchMessages } = useMessages(activeId)

  const isDealDone = activeId ? dealsCompleted.has(activeId) : false
  const hasReviewed = activeId ? reviewsGiven.has(activeId) : false
  const isBuyer = user && activeConvo ? activeConvo.buyer_id === user.id : false
  const isSeller = user && activeConvo ? activeConvo.seller_id === user.id : false

  // Deep-link from a notification toast opens that conversation directly.
  useEffect(() => {
    if (openConversationId && conversations.some((c) => c.id === openConversationId)) {
      setActiveId(openConversationId)
      setMobileView('chat')
    }
  }, [openConversationId, conversations])

  useEffect(() => {
    if (!activeId && !openConversationId && conversations.length > 0 && window.innerWidth >= 640) {
      setActiveId(conversations[0].id)
    }
  }, [conversations, activeId, openConversationId])

  // Reading a thread clears its unread badge (also as new messages stream in).
  useEffect(() => {
    if (activeId && markRead) markRead(activeId)
  }, [activeId, messages.length, markRead])

  // Deal + review state lives in the database, not just this session — otherwise
  // it resets on reload and both sides disagree about whether the deal closed.
  useEffect(() => {
    if (!activeConvo || !user) return
    let cancelled = false
    ;(async () => {
      const [{ data: listing }, { data: review }] = await Promise.all([
        supabase.from('listings').select('status').eq('id', activeConvo.listing_id).maybeSingle(),
        supabase.from('reviews').select('id')
          .eq('listing_id', activeConvo.listing_id)
          .eq('reviewer_id', user.id)
          .maybeSingle(),
      ])
      if (cancelled) return
      setDealsCompleted((prev) => {
        const next = new Set(prev)
        if (listing?.status === 'sold') next.add(activeConvo.id)
        else next.delete(activeConvo.id)
        return next
      })
      setReviewsGiven((prev) => {
        const next = new Set(prev)
        if (review) next.add(activeConvo.id)
        return next
      })
    })()
    return () => { cancelled = true }
  }, [activeConvo?.id, activeConvo?.listing_id, user?.id])

  function selectConvo(id: string) {
    setActiveId(id)
    setMobileView('chat')
    setReviewError('')
    setSendError('')
    markRead?.(id)
  }

  async function handleSend() {
    if (!user || !activeId) return
    const body = draft.trim()
    if (!body) return
    if (body.length > 2000) { setSendError('Message is too long (2000 characters max).'); return }
    setSending(true)
    setDraft('')
    const err = await sendMessage(activeId, user.id, body)
    setSending(false)
    if (err) { setDraft(body); setSendError(err) } else { setSendError('') }
    await refetchMessages()
    inputRef.current?.focus()
  }

  async function handleDealDone() {
    if (!activeConvo) return
    setDealLoading(true)
    const err = await markListingSold(activeConvo.listing_id)
    setDealLoading(false)
    if (err) { setReviewError(err); return }
    setDealsCompleted((prev) => new Set(prev).add(activeConvo.id))
  }

  async function handleLeaveReview() {
    if (!activeConvo || !user) return
    if (reviewComment.trim().length > 1000) { setReviewError('Note is too long (1000 characters max).'); return }
    setReviewLoading(true)
    setReviewError('')
    const err = await leaveReview(
      activeConvo.listing_id, user.id, activeConvo.seller_id,
      reviewStars, reviewComment.trim()
    )
    setReviewLoading(false)
    if (err) {
      setReviewError(err)
    } else {
      setReviewsGiven((prev) => new Set(prev).add(activeConvo.id))
      setReviewComment('')
    }
  }

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 text-center">
        <Lock size={32} className="mx-auto text-[#E5E5E5] mb-4" />
        <p className="text-sm text-[#737373]">Sign in to view your messages.</p>
      </div>
    )
  }

  return (
    <div
      className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col overflow-hidden"
      style={{ height: 'calc(100dvh - 56px)' }}
    >
      <h1 className="text-xl font-bold text-[#0A0A0A] py-4 sm:py-6 shrink-0" style={{ fontFamily: MONO }}>
        Messages
      </h1>

      <div className="border border-[#E5E5E5] sm:grid sm:grid-cols-[260px_1fr] sm:grid-rows-[minmax(0,1fr)] overflow-hidden flex-1 min-h-0 mb-4">
        {/* Conversation list */}
        <div className={`border-r border-[#E5E5E5] overflow-y-auto overscroll-contain min-h-0 h-full flex-col ${mobileView === 'chat' ? 'hidden sm:flex' : 'flex'}`}>
          {loading ? (
            <div className="p-4 text-xs text-[#737373]" style={{ fontFamily: MONO }}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-xs text-[#737373]" style={{ fontFamily: MONO }}>No conversations yet.</div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => selectConvo(c.id)}
                className={`w-full text-left px-4 py-3.5 border-b border-[#E5E5E5] transition-colors ${
                  activeId === c.id ? 'bg-[#0A0A0A] text-white' : 'hover:bg-[#F5F5F5]'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-semibold truncate flex-1">{c.other_name}</span>
                  {(unreadByConvo[c.id] ?? 0) > 0 && activeId !== c.id && (
                    <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
                  )}
                </div>
                <div className={`text-xs mt-0.5 truncate ${activeId === c.id ? 'text-[#E5E5E5]' : 'text-[#737373]'}`} style={{ fontFamily: MONO }}>
                  {c.listing_title} · ₱{Number(c.listing_price).toLocaleString()}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Chat panel */}
        <div className={`flex-col h-full min-h-0 min-w-0 overflow-hidden ${mobileView === 'list' ? 'hidden sm:flex' : 'flex'}`}>
          {activeConvo ? (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-[#E5E5E5] flex items-center gap-2 shrink-0">
                <button onClick={() => setMobileView('list')} className="sm:hidden p-1 -ml-1 text-[#737373]">
                  <ChevronLeft size={18} />
                </button>
                <div className="min-w-0 flex-1" style={{ fontFamily: MONO }}>
                  <div className="text-xs font-semibold text-[#0A0A0A] truncate">{activeConvo.other_name}</div>
                  <div className="text-xs text-[#737373] truncate">re: {activeConvo.listing_title}</div>
                </div>
                {/* Deal Done button */}
                {!isDealDone && (
                  <button
                    onClick={handleDealDone}
                    disabled={dealLoading}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-[#E5E5E5] text-[#737373] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors shrink-0 disabled:opacity-40"
                    style={{ fontFamily: MONO }}
                    title="Mark this deal as completed"
                  >
                    <BadgeCheck size={12} />
                    <span className="hidden sm:inline">{dealLoading ? 'Marking...' : 'Deal Done'}</span>
                  </button>
                )}
                {isDealDone && (
                  <span className="text-xs text-[#737373] px-2 py-1 border border-[#E5E5E5] shrink-0" style={{ fontFamily: MONO }}>
                    ✓ Dealt
                  </span>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 flex flex-col gap-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`text-sm px-3 py-2 max-w-[75%] break-words ${
                      m.sender_id === user.id ? 'bg-[#0A0A0A] text-white' : 'bg-[#F5F5F5] text-[#0A0A0A] border border-[#E5E5E5]'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Review panel — shown after deal done, to buyer only, before review given */}
              {isDealDone && isBuyer && !hasReviewed && (
                <div className="border-t border-[#E5E5E5] bg-[#F5F5F5] px-4 py-3 shrink-0">
                  <p className="text-xs text-[#737373] mb-2" style={{ fontFamily: MONO }}>
                    Rate your seller — {activeConvo.other_name}
                  </p>
                  {/* Stars */}
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setReviewStars(n)}>
                        <Star
                          size={20}
                          className={n <= reviewStars ? 'text-[#0A0A0A]' : 'text-[#E5E5E5]'}
                          fill={n <= reviewStars ? '#0A0A0A' : 'none'}
                        />
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    maxLength={1000}
                    placeholder="Optional note (e.g. fast seller, item as described)"
                    className="w-full text-xs border border-[#E5E5E5] bg-white px-3 py-2 text-[#0A0A0A] placeholder:text-[#737373] focus:outline-none focus:border-[#0A0A0A] mb-2"
                  />
                  {reviewError && <p className="text-xs text-red-600 mb-1">{reviewError}</p>}
                  <button
                    onClick={handleLeaveReview}
                    disabled={reviewLoading}
                    className="w-full bg-[#0A0A0A] text-white text-xs py-2 hover:bg-[#737373] transition-colors disabled:opacity-50"
                    style={{ fontFamily: MONO }}
                  >
                    {reviewLoading ? 'Submitting...' : 'Submit Review →'}
                  </button>
                </div>
              )}
              {isDealDone && isBuyer && hasReviewed && (
                <div className="border-t border-[#E5E5E5] bg-[#F5F5F5] px-4 py-2 shrink-0 text-xs text-[#737373] text-center" style={{ fontFamily: MONO }}>
                  ✓ Review submitted — thanks!
                </div>
              )}
              {isDealDone && isSeller && (
                <div className="border-t border-[#E5E5E5] bg-[#F5F5F5] px-4 py-2 shrink-0 text-xs text-[#737373] text-center" style={{ fontFamily: MONO }}>
                  Deal closed. Listing marked as sold.
                </div>
              )}

              {/* Input */}
              {!isDealDone && (
                <div className="border-t border-[#E5E5E5] shrink-0">
                  {sendError && (
                    <p className="text-xs text-red-600 px-4 pt-2" style={{ fontFamily: MONO }}>{sendError}</p>
                  )}
                  <div className="flex">
                  <input
                    ref={inputRef}
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    maxLength={2000}
                    placeholder="Type a message..."
                    className="flex-1 min-w-0 px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#737373] focus:outline-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                    className="flex items-center gap-1.5 px-4 py-3 bg-[#0A0A0A] text-white text-sm hover:bg-[#737373] transition-colors disabled:opacity-50 shrink-0"
                    style={{ fontFamily: MONO }}
                  >
                    <Send size={14} />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-[#737373]">
              {conversations.length === 0 ? 'No messages yet' : 'Select a conversation'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
