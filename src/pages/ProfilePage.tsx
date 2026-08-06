import { useEffect, useState } from 'react'
import {
  ShieldCheck, Star, Package, Bookmark, LogOut,
  Tag, MessageCircle, ArrowUpCircle, Lock,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { mapListing } from '../types'
import type { Page, Listing } from '../types'
import { MONO } from '../types'
import ListingCard from '../components/ListingCard'
import { useSellerRating, enrichWithProfiles } from '../hooks/useListings'

export default function ProfilePage({
  setPage,
  setSelectedListing,
}: {
  setPage: (p: Page) => void
  setSelectedListing: (l: Listing) => void
}) {
  const { user, profile, signOut } = useAuth()

  const [myListings, setMyListings] = useState<Listing[]>([])
  const [savedListings, setSavedListings] = useState<Listing[]>([])
  const [tab, setTab] = useState<'listings' | 'saved'>('listings')
  const [loading, setLoading] = useState(true)
  const rating = useSellerRating(user?.id ?? null)

  useEffect(() => {
    if (!user) return
    setLoading(true)

    async function fetchAll() {
      // My listings
      const { data: mine } = await supabase
        .from('listings')
        .select('id, seller_id, title, description, price, condition, status, category, location, image_url, image_urls, bump_count, last_bumped_at, created_at')
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false })

      setMyListings(await enrichWithProfiles(mine ?? []).then((rows) => rows.map(mapListing)))

      // Saved listings
      const { data: saved } = await supabase
        .from('saved_listings')
        .select('listing_id')
        .eq('user_id', user!.id)

      if (saved && saved.length > 0) {
        const ids = saved.map((s: any) => s.listing_id)
        const { data: savedRows } = await supabase
          .from('listings')
          .select('id, seller_id, title, description, price, condition, status, category, location, image_url, image_urls, bump_count, last_bumped_at, created_at')
          .in('id', ids)

        const enriched = await enrichWithProfiles(savedRows ?? [])
        setSavedListings(enriched.map(mapListing))
      } else {
        setSavedListings([])
      }

      setLoading(false)
    }

    fetchAll()
  }, [user, profile])

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 text-center">
        <Lock size={32} className="mx-auto text-[#E5E5E5] mb-4" />
        <p className="text-sm text-[#737373] mb-4">Sign in to view your profile.</p>
        <button
          onClick={() => setPage('login')}
          className="bg-[#0A0A0A] text-white text-sm px-6 py-2 hover:bg-[#737373] transition-colors"
          style={{ fontFamily: MONO }}
        >
          Sign in
        </button>
      </div>
    )
  }

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User'
  const activeCount = myListings.filter((l) => l.status === 'active').length
  const soldCount = myListings.filter((l) => l.status === 'sold').length

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

      {/* Profile header */}
      <div className="border border-[#E5E5E5] p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-6">
        {/* Avatar */}
        <div
          className="w-16 h-16 bg-[#0A0A0A] text-white flex items-center justify-center text-2xl font-bold shrink-0"
          style={{ fontFamily: MONO }}
        >
          {displayName[0]?.toUpperCase() ?? '?'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-[#0A0A0A] truncate" style={{ fontFamily: MONO }}>
              {displayName}
            </h1>
            <span className="flex items-center gap-1 text-xs border border-[#E5E5E5] px-2 py-0.5 text-[#737373] shrink-0" style={{ fontFamily: MONO }}>
              <ShieldCheck size={10} /> Verified
            </span>
          </div>
          <p className="text-sm text-[#737373] mb-2 truncate">{user.email}</p>
          <div className="flex flex-wrap gap-4" style={{ fontFamily: MONO }}>
            <span className="flex items-center gap-1.5 text-xs text-[#737373]">
              <Star size={11} fill="#0A0A0A" className="text-[#0A0A0A]" />
              {rating.count > 0
                ? `${rating.avg.toFixed(1)} rating · ${rating.count} review${rating.count !== 1 ? 's' : ''}`
                : 'No ratings yet'}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[#737373]">
              <Tag size={11} />
              {activeCount} active listing{activeCount !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[#737373]">
              <ArrowUpCircle size={11} />
              {soldCount} sold
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[#737373]">
              <Bookmark size={11} />
              {savedListings.length} saved
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap sm:shrink-0">
          <button
            onClick={() => setPage('create')}
            className="text-xs px-4 py-2 bg-[#0A0A0A] text-white hover:bg-[#737373] transition-colors"
            style={{ fontFamily: MONO }}
          >
            + Post Item
          </button>
          <button
            onClick={() => setPage('messages')}
            className="flex items-center gap-1.5 text-xs px-3 py-2 border border-[#E5E5E5] text-[#737373] hover:border-[#0A0A0A] transition-colors"
            style={{ fontFamily: MONO }}
          >
            <MessageCircle size={12} /> Messages
          </button>
          <button
            onClick={async () => { await signOut(); setPage('home') }}
            className="flex items-center gap-1.5 text-xs px-3 py-2 border border-[#E5E5E5] text-[#737373] hover:border-[#0A0A0A] transition-colors"
            style={{ fontFamily: MONO }}
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </div>

      {/* Joined date */}
      {profile?.created_at && (
        <p className="text-xs text-[#737373] mb-6" style={{ fontFamily: MONO }}>
          Member since {profile.created_at.split('T')[0]} · @student.tsu.edu.ph
        </p>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#E5E5E5] mb-6">
        {[
          { key: 'listings', label: 'My Listings', Icon: Package, count: myListings.length },
          { key: 'saved', label: 'Saved', Icon: Bookmark, count: savedListings.length },
        ].map(({ key, label, Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`flex items-center gap-2 text-sm px-4 py-3 border-b-2 transition-colors ${
              tab === key
                ? 'border-[#0A0A0A] text-[#0A0A0A] font-semibold'
                : 'border-transparent text-[#737373] hover:text-[#0A0A0A]'
            }`}
            style={{ fontFamily: MONO }}
          >
            <Icon size={14} />
            {label}
            <span className={`text-xs px-1.5 py-0.5 ${tab === key ? 'bg-[#0A0A0A] text-white' : 'bg-[#F5F5F5] text-[#737373]'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-[#E5E5E5]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white aspect-[3/4] animate-pulse bg-[#F5F5F5]" />
          ))}
        </div>
      ) : tab === 'listings' ? (
        myListings.length === 0 ? (
          <div className="border border-[#E5E5E5] py-20 text-center">
            <Package size={32} className="mx-auto text-[#E5E5E5] mb-3" />
            <p className="text-sm text-[#737373] mb-4">You have not posted any listings yet.</p>
            <button
              onClick={() => setPage('create')}
              className="bg-[#0A0A0A] text-white text-sm px-6 py-2 hover:bg-[#737373] transition-colors"
              style={{ fontFamily: MONO }}
            >
              Post your first item →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-[#E5E5E5]">
            {myListings.map((l) => (
              <div key={l.id} className="bg-white relative">
                <ListingCard
                  listing={l}
                  onClick={() => { setSelectedListing(l); setPage('listing') }}
                />
                {l.status !== 'active' && (
                  <div className="absolute top-2 left-2 text-xs px-2 py-0.5 bg-[#0A0A0A] text-white" style={{ fontFamily: MONO }}>
                    {l.status.toUpperCase()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        savedListings.length === 0 ? (
          <div className="border border-[#E5E5E5] py-20 text-center">
            <Bookmark size={32} className="mx-auto text-[#E5E5E5] mb-3" />
            <p className="text-sm text-[#737373]">No saved listings yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-[#E5E5E5]">
            {savedListings.map((l) => (
              <div key={l.id} className="bg-white">
                <ListingCard
                  listing={l}
                  onClick={() => { setSelectedListing(l); setPage('listing') }}
                />
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
