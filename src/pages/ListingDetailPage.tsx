import { useState, useEffect } from 'react'
import {
  ChevronLeft, Send, Bookmark, BookmarkCheck,
  ThumbsUp, MapPin, ShieldCheck, Star, AlertCircle,
  Lock, CheckCircle, Clock, Trash2, BarChart2, Pencil,
} from 'lucide-react'
import type { Page, Listing } from '../types'
import { CONDITION_LABELS, STATUS_LABELS, MONO } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { bumpListing, saveListing, unsaveListing, isSaved, updateListingStatus, deleteListing, useSellerRating } from '../hooks/useListings'
import { startConversation } from '../hooks/useMessages'
import { supabase } from '../lib/supabase'

export default function ListingDetailPage({
  listing,
  setPage,
}: {
  listing: Listing
  setPage: (p: Page) => void
}) {
  const { user, profile, loading: authLoading } = useAuth()

  const [message, setMessage] = useState('')
  const [messageSent, setMessageSent] = useState(false)
  const [msgLoading, setMsgLoading] = useState(false)
  const [msgError, setMsgError] = useState('')

  const [saved, setSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)

  const [bumpLoading, setBumpLoading] = useState(false)
  const [bumpError, setBumpError] = useState('')
  const [bumpCount, setBumpCount] = useState(listing.bumps)

  const [status, setStatus] = useState(listing.status)
  const [statusLoading, setStatusLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [activeImg, setActiveImg] = useState(0)

  // Reviews
  const [reviews, setReviews] = useState<{ id: string; rating: number; comment: string; reviewer_name: string; created_at: string }[]>([])

  const isOwn = !authLoading && user?.id === listing.seller_id

  // Live seller rating — derived from reviews, so a rating left in chat shows
  // up here immediately and on every listing this seller posts afterwards.
  const sellerRating = useSellerRating(listing.seller_id)

  // Re-fetch live status (listing may have been marked sold from Messages)
  useEffect(() => {
    supabase.from('listings').select('status, bump_count').eq('id', listing.id).single()
      .then(({ data }) => { if (data) { setStatus(data.status); setBumpCount(data.bump_count ?? 0) } })
  }, [listing.id])

  // Fetch reviews for this listing
  useEffect(() => {
    supabase.from('reviews').select('id, rating, comment, created_at, reviewer_id').eq('listing_id', listing.id).order('created_at', { ascending: false })
      .then(async ({ data }) => {
        if (!data || data.length === 0) return
        const ids = data.map((r: any) => r.reviewer_id)
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', ids)
        const pmap: Record<string, any> = {}
        for (const p of profiles ?? []) pmap[p.id] = p
        setReviews(data.map((r: any) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment ?? '',
          created_at: r.created_at?.split('T')[0] ?? '',
          reviewer_name: pmap[r.reviewer_id]?.full_name || pmap[r.reviewer_id]?.email?.split('@')[0] || 'Student',
        })))
      })
  }, [listing.id])

  useEffect(() => {
    if (user && !isOwn) {
      isSaved(user.id, listing.id).then(setSaved)
    }
  }, [user, listing.id, isOwn])

  async function handleSend() {
    if (!user) { setPage('login'); return }
    if (!message.trim()) return
    setMsgLoading(true)
    setMsgError('')
    const result = await startConversation(
      listing.id, user.id, listing.seller_id,
      listing.title, listing.price, message
    )
    setMsgLoading(false)
    if ('error' in result) setMsgError(result.error)
    else setMessageSent(true)
  }

  async function handleSave() {
    if (!user) { setPage('login'); return }
    setSaveLoading(true)
    if (saved) { await unsaveListing(user.id, listing.id); setSaved(false) }
    else { await saveListing(user.id, listing.id); setSaved(true) }
    setSaveLoading(false)
  }

  async function handleBump() {
    setBumpLoading(true)
    setBumpError('')
    const error = await bumpListing(listing.id)
    if (error) setBumpError(error)
    else setBumpCount((c) => c + 1)
    setBumpLoading(false)
  }

  async function handleStatusChange(newStatus: 'active' | 'reserved' | 'sold') {
    setStatusLoading(true)
    const error = await updateListingStatus(listing.id, newStatus)
    if (!error) setStatus(newStatus)
    setStatusLoading(false)
  }

  async function handleDelete() {
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    setDeleteLoading(true)
    const error = await deleteListing(listing.id)
    if (!error) setPage('browse')
    else setDeleteLoading(false)
  }

  const sellerDisplay = isOwn
    ? (profile?.full_name || user?.email?.split('@')[0] || 'You')
    : (listing.seller || 'TSU Student')

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={() => setPage('browse')}
        className="flex items-center gap-1.5 text-xs text-[#737373] hover:text-[#0A0A0A] transition-colors mb-6"
        style={{ fontFamily: MONO }}
      >
        <ChevronLeft size={13} />
        Back to Browse
      </button>

      <div className="grid sm:grid-cols-[1fr_340px] gap-8">
        {/* Image gallery */}
        <div>
          <div className="border border-[#E5E5E5] overflow-hidden aspect-[4/3] bg-[#F5F5F5]">
            <img
              src={listing.images[activeImg] ?? listing.image}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>
          {listing.images.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
              {listing.images.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImg(idx)}
                  className={`shrink-0 w-16 h-16 border-2 overflow-hidden transition-colors ${
                    activeImg === idx ? 'border-[#0A0A0A]' : 'border-[#E5E5E5] hover:border-[#737373]'
                  }`}
                >
                  <img src={url} alt={`photo ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="text-xs text-[#737373] mb-2 truncate" style={{ fontFamily: MONO }}>
            {listing.id.slice(0, 8).toUpperCase()} · {listing.postedAt} · {listing.category}
          </div>
          <h1 className="text-xl font-bold text-[#0A0A0A] mb-3">{listing.title}</h1>
          <div className="text-3xl font-bold text-[#0A0A0A] mb-4" style={{ fontFamily: MONO }}>
            ₱{listing.price.toLocaleString()}
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            <span className="text-xs border border-[#E5E5E5] px-2 py-1" style={{ fontFamily: MONO }}>
              {CONDITION_LABELS[listing.condition]}
            </span>
            <span
              className={`text-xs border px-2 py-1 ${
                status === 'active' ? 'border-[#E5E5E5] text-[#737373]' : 'border-[#0A0A0A] text-[#0A0A0A] font-semibold'
              }`}
              style={{ fontFamily: MONO }}
            >
              {STATUS_LABELS[status]}
            </span>
            {isOwn && (
              <span className="text-xs border border-[#0A0A0A] bg-[#0A0A0A] text-white px-2 py-1" style={{ fontFamily: MONO }}>
                YOUR LISTING
              </span>
            )}
          </div>

          <p className="text-sm text-[#737373] leading-relaxed mb-6">{listing.description}</p>

          {/* Location */}
          <div className="border border-[#E5E5E5] p-3 mb-4">
            <div className="flex items-center gap-1.5 text-xs text-[#737373] mb-1" style={{ fontFamily: MONO }}>
              <MapPin size={11} /> CAMPUS LOCATION
            </div>
            <div className="text-sm font-semibold text-[#0A0A0A]">{listing.location}</div>
          </div>

          {/* Seller */}
          <div className="border border-[#E5E5E5] p-3 mb-4">
            <div className="flex items-center gap-1.5 text-xs text-[#737373] mb-1" style={{ fontFamily: MONO }}>
              <ShieldCheck size={11} /> {isOwn ? 'YOUR PROFILE' : 'SELLER'}
            </div>
            <div className="text-sm font-semibold text-[#0A0A0A]">{sellerDisplay}</div>
            <div className="flex items-center gap-1 text-xs text-[#737373] mt-0.5" style={{ fontFamily: MONO }}>
              <Star size={10} fill="#0A0A0A" className="text-[#0A0A0A]" />
              {sellerRating.count > 0
                ? `${sellerRating.avg.toFixed(1)} (${sellerRating.count}) · @student.tsu.edu.ph verified`
                : 'No ratings yet · @student.tsu.edu.ph verified'}
            </div>
            {isOwn && (
              <div className="flex items-center gap-1.5 text-xs text-[#737373] mt-1" style={{ fontFamily: MONO }}>
                <BarChart2 size={10} />
                {bumpCount} bump{bumpCount !== 1 ? 's' : ''} · listed {listing.postedAt}
              </div>
            )}
          </div>

          {/* ── SELLER PANEL ── */}
          {isOwn ? (
            <div className="flex flex-col gap-2">
              {/* Edit */}
              <button
                onClick={() => setPage('edit-listing')}
                className="flex items-center justify-center gap-2 w-full bg-[#0A0A0A] text-white text-sm py-2.5 hover:bg-[#737373] transition-colors"
                style={{ fontFamily: MONO }}
              >
                <Pencil size={13} /> Edit Listing
              </button>

              {/* Bump */}
              <div>
                <button
                  onClick={handleBump}
                  disabled={bumpLoading}
                  className="flex items-center justify-center gap-2 w-full border border-[#E5E5E5] text-[#0A0A0A] text-sm py-2.5 hover:border-[#0A0A0A] hover:bg-[#F5F5F5] transition-colors disabled:opacity-50"
                  style={{ fontFamily: MONO }}
                >
                  <ThumbsUp size={14} />
                  {bumpLoading ? 'Bumping...' : `Bump listing (${bumpCount})`}
                </button>
                {bumpError && <p className="text-xs text-[#737373] mt-1 text-center">{bumpError}</p>}
              </div>

              {/* Status controls */}
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => handleStatusChange('active')}
                  disabled={statusLoading || status === 'active'}
                  className={`flex items-center justify-center gap-1 text-xs py-2 border transition-colors disabled:opacity-40 ${
                    status === 'active' ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'border-[#E5E5E5] text-[#737373] hover:border-[#0A0A0A]'
                  }`}
                  style={{ fontFamily: MONO }}
                >
                  <CheckCircle size={11} /> Active
                </button>
                <button
                  onClick={() => handleStatusChange('reserved')}
                  disabled={statusLoading || status === 'reserved'}
                  className={`flex items-center justify-center gap-1 text-xs py-2 border transition-colors disabled:opacity-40 ${
                    status === 'reserved' ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'border-[#E5E5E5] text-[#737373] hover:border-[#0A0A0A]'
                  }`}
                  style={{ fontFamily: MONO }}
                >
                  <Clock size={11} /> Reserved
                </button>
                <button
                  onClick={() => handleStatusChange('sold')}
                  disabled={statusLoading || status === 'sold'}
                  className={`flex items-center justify-center gap-1 text-xs py-2 border transition-colors disabled:opacity-40 ${
                    status === 'sold' ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'border-[#E5E5E5] text-[#737373] hover:border-[#0A0A0A]'
                  }`}
                  style={{ fontFamily: MONO }}
                >
                  <CheckCircle size={11} /> Sold
                </button>
              </div>

              {/* Delete */}
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className={`flex items-center justify-center gap-2 w-full text-xs py-2.5 border transition-colors disabled:opacity-50 ${
                  deleteConfirm
                    ? 'border-red-500 bg-red-500 text-white hover:bg-red-600'
                    : 'border-[#E5E5E5] text-[#737373] hover:border-red-400 hover:text-red-500'
                }`}
                style={{ fontFamily: MONO }}
              >
                <Trash2 size={12} />
                {deleteLoading ? 'Deleting...' : deleteConfirm ? 'Tap again to confirm delete' : 'Delete listing'}
              </button>
              {deleteConfirm && (
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="text-xs text-center text-[#737373] underline"
                  style={{ fontFamily: MONO }}
                >
                  Cancel
                </button>
              )}
            </div>
          ) : (
            /* ── BUYER PANEL ── */
            <>
              {!messageSent ? (
                <div className="border border-[#E5E5E5] p-3 mb-3">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={user ? "Hi! Is this still available?" : "Sign in to send a message"}
                    rows={3}
                    disabled={!user}
                    className="w-full text-sm text-[#0A0A0A] placeholder:text-[#737373] bg-transparent focus:outline-none resize-none disabled:opacity-50"
                  />
                  {msgError && <p className="text-xs text-red-600 mt-1">{msgError}</p>}
                  <button
                    onClick={handleSend}
                    disabled={msgLoading}
                    className="flex items-center justify-center gap-2 w-full mt-2 bg-[#0A0A0A] text-white text-sm py-2 hover:bg-[#737373] transition-colors disabled:opacity-50"
                    style={{ fontFamily: MONO }}
                  >
                    {user ? <Send size={13} /> : <Lock size={13} />}
                    {msgLoading ? 'Sending...' : user ? 'Send Message' : 'Sign in to Message'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 border border-[#0A0A0A] p-3 mb-3 text-sm text-[#0A0A0A]" style={{ fontFamily: MONO }}>
                  <AlertCircle size={14} />
                  Message sent! Check your inbox.
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saveLoading}
                className={`flex items-center justify-center gap-2 w-full border text-sm py-2.5 transition-colors disabled:opacity-50 ${
                  saved ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white' : 'border-[#E5E5E5] text-[#737373] hover:border-[#0A0A0A]'
                }`}
                style={{ fontFamily: MONO }}
              >
                {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                {saved ? 'Saved' : 'Save listing'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="mt-10 border-t border-[#E5E5E5] pt-8">
          <h2 className="text-base font-bold text-[#0A0A0A] mb-4" style={{ fontFamily: MONO }}>
            Reviews ({reviews.length})
          </h2>
          <div className="flex flex-col gap-4">
            {reviews.map((r) => (
              <div key={r.id} className="border border-[#E5E5E5] p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={13} className={n <= r.rating ? 'text-[#0A0A0A]' : 'text-[#E5E5E5]'} fill={n <= r.rating ? '#0A0A0A' : 'none'} />
                    ))}
                  </div>
                  <span className="text-xs text-[#737373]" style={{ fontFamily: MONO }}>{r.created_at}</span>
                </div>
                <div className="text-xs font-semibold text-[#0A0A0A] mb-1">{r.reviewer_name}</div>
                {r.comment && <p className="text-sm text-[#737373]">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
