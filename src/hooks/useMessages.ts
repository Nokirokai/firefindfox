import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Conversation, Message } from '../types'

export function useConversations(userId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) { setConversations([]); setLoading(false); return }
    setLoading(true)

    const { data, error } = await supabase
      .from('conversations')
      .select('id, listing_id, listing_title, listing_price, buyer_id, seller_id, created_at')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) { console.error('conversations fetch:', error.message); setLoading(false); return }

    const rows = data ?? []
    if (!rows.length) { setConversations([]); setLoading(false); return }

    // Fetch all relevant profiles in one query
    const allIds = [...new Set(rows.flatMap((r) => [r.buyer_id, r.seller_id]))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', allIds)

    const profileMap: Record<string, any> = {}
    for (const p of profiles ?? []) profileMap[p.id] = p

    const mapped: Conversation[] = rows.map((row) => {
      const otherId = row.buyer_id === userId ? row.seller_id : row.buyer_id
      const other = profileMap[otherId]
      return {
        id: row.id,
        listing_id: row.listing_id,
        listing_title: row.listing_title ?? 'Listing',
        listing_price: row.listing_price ?? 0,
        buyer_id: row.buyer_id,
        seller_id: row.seller_id,
        other_name: other?.full_name || other?.email?.split('@')[0] || 'User',
        created_at: row.created_at,
      }
    })

    setConversations(mapped)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetch()
    if (!userId) return
    const channel = supabase
      .channel(`conversations:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => { fetch() })
      .subscribe()
    const poll = setInterval(fetch, 15000)
    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [fetch, userId])

  return { conversations, loading, refetch: fetch }
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetch = useCallback(async () => {
    if (!conversationId) { setMessages([]); return }
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
  }, [conversationId])

  useEffect(() => {
    fetch()
    if (!conversationId) return
    // No server-side filter — filter client-side so it works without replica identity config
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if ((payload.new as any).conversation_id === conversationId) fetch()
        }
      )
      .subscribe()

    // Polling fallback — realtime replication may be off for this table, and the
    // receiver must never have to reload the page to see an incoming message.
    const poll = setInterval(fetch, 3000)
    const onFocus = () => fetch()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [conversationId, fetch])

  // Only scroll when the actual message set changes — not on every poll tick,
  // otherwise the thread yanks itself down every 3s while you read.
  const lastId = messages.length ? messages[messages.length - 1].id : null
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [lastId, messages.length])

  return { messages, bottomRef, refetch: fetch }
}

export async function startConversation(
  listingId: string,
  buyerId: string,
  sellerId: string,
  listingTitle: string,
  listingPrice: number,
  firstMessage: string
): Promise<{ conversationId: string } | { error: string }> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', buyerId)
    .maybeSingle()

  let conversationId: string

  if (existing) {
    conversationId = existing.id
  } else {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId, listing_title: listingTitle, listing_price: listingPrice })
      .select('id')
      .single()
    if (error) return { error: error.message }
    conversationId = data.id
  }

  const { error: msgError } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: buyerId, content: firstMessage })

  if (msgError) return { error: msgError.message }
  return { conversationId }
}

export interface MessageNotification {
  conversationId: string
  from: string
  listingTitle: string
  preview: string
  at: string
}

const readKey = (userId: string) => `ffx:lastRead:${userId}`

function loadReadMap(userId: string): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(readKey(userId)) ?? '{}') } catch { return {} }
}

/**
 * Tracks unread incoming messages across every conversation the user is part of,
 * and surfaces the newest one as a toast-able notification.
 */
export function useMessageNotifications(userId: string | null) {
  const [unreadByConvo, setUnreadByConvo] = useState<Record<string, number>>({})
  const [notification, setNotification] = useState<MessageNotification | null>(null)
  const readMap = useRef<Record<string, string>>({})
  const seenIds = useRef<Set<string>>(new Set())
  const primed = useRef(false)

  const recompute = useCallback(async () => {
    if (!userId) { setUnreadByConvo({}); return }

    const { data: convos } = await supabase
      .from('conversations')
      .select('id, listing_title, buyer_id, seller_id')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)

    if (!convos?.length) { setUnreadByConvo({}); return }
    const convoMap: Record<string, any> = {}
    for (const c of convos) convoMap[c.id] = c

    const { data: msgs } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at')
      .in('conversation_id', convos.map((c) => c.id))
      .neq('sender_id', userId)
      .order('created_at', { ascending: false })
      .limit(200)

    const counts: Record<string, number> = {}
    let newest: { msg: any } | null = null

    for (const m of msgs ?? []) {
      const lastRead = readMap.current[m.conversation_id]
      if (!lastRead || new Date(m.created_at) > new Date(lastRead)) {
        counts[m.conversation_id] = (counts[m.conversation_id] ?? 0) + 1
        if (!newest) newest = { msg: m }
      }
    }
    setUnreadByConvo(counts)

    // Toast only for messages we have not already announced this session.
    if (newest && !seenIds.current.has(newest.msg.id)) {
      const m = newest.msg
      const alreadyPrimed = primed.current
      for (const x of msgs ?? []) seenIds.current.add(x.id)
      if (alreadyPrimed) {
        const convo = convoMap[m.conversation_id]
        const otherId = convo.buyer_id === userId ? convo.seller_id : convo.buyer_id
        const { data: p } = await supabase
          .from('profiles').select('full_name, email').eq('id', otherId).maybeSingle()
        setNotification({
          conversationId: m.conversation_id,
          from: p?.full_name || p?.email?.split('@')[0] || 'A student',
          listingTitle: convo?.listing_title ?? 'your listing',
          preview: m.content,
          at: m.created_at,
        })
      }
    }
    primed.current = true
  }, [userId])

  useEffect(() => {
    if (!userId) { primed.current = false; seenIds.current.clear(); return }
    readMap.current = loadReadMap(userId)
    primed.current = false
    seenIds.current.clear()
    recompute()

    const channel = supabase
      .channel(`msg-alert:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => { if ((payload.new as any).sender_id !== userId) recompute() }
      )
      .subscribe()
    const poll = setInterval(recompute, 5000)

    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [userId, recompute])

  const markRead = useCallback((conversationId: string) => {
    if (!userId) return
    readMap.current[conversationId] = new Date().toISOString()
    localStorage.setItem(readKey(userId), JSON.stringify(readMap.current))
    setUnreadByConvo((prev) => {
      if (!prev[conversationId]) return prev
      const next = { ...prev }
      delete next[conversationId]
      return next
    })
    setNotification((n) => (n?.conversationId === conversationId ? null : n))
  }, [userId])

  // Stable identity — the toast keys its auto-dismiss timer off this callback.
  const dismissNotification = useCallback(() => setNotification(null), [])

  const unreadTotal = Object.values(unreadByConvo).reduce((a, b) => a + b, 0)

  return {
    unreadByConvo,
    unreadTotal,
    hasNew: unreadTotal > 0,
    notification,
    dismissNotification,
    markRead,
    refresh: recompute,
  }
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<string | null> {
  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
  return error?.message ?? null
}
