import {
  BarChart2,
  Tag,
  ShieldCheck,
  BookmarkCheck,
  MessageCircle,
  MapPin,
  ThumbsUp,
} from 'lucide-react'
import logo from '../imports/C__17_.png'
import ListingCard from '../components/ListingCard'
import { CATEGORIES } from '../data/listings'
import { useListings, useLiveStats } from '../hooks/useListings'
import type { Page, Listing } from '../types'
import { MONO } from '../types'
import { useAuth } from '../contexts/AuthContext'

export default function HomePage({
  setPage,
  setSelectedListing,
}: {
  setPage: (p: Page) => void
  setSelectedListing: (l: Listing) => void
}) {
  const { user, profile } = useAuth()
  const { listings, loading } = useListings(4)
  const stats = useLiveStats()
  const displayName = profile?.full_name || user?.email?.split('@')[0] || ''

  return (
    <main>
      {/* Hero */}
      <section className="border-b border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid sm:grid-cols-[1fr_auto] gap-8 items-end">
          <div>
            <p className="text-xs tracking-widest uppercase text-[#737373] mb-4" style={{ fontFamily: MONO }}>
              campus-exclusive marketplace · @tsu only -by.angel bitangcol
            </p>
            <h1
              className="text-4xl sm:text-6xl font-bold text-[#0A0A0A] leading-none tracking-tighter mb-6 break-words"
              style={{ fontFamily: MONO }}
            >
              {user ? (
                <>
                  welcome back,
                  <br />
                  <span className="text-[#737373] block truncate">{displayName}.</span>
                </>
              ) : (
                <>
                  buy &amp; sell
                  <br />
                  on campus.
                  <br />
                  <span className="text-[#737373]">no reposting.</span>
                </>
              )}
            </h1>
            <p className="text-base text-[#737373] max-w-lg mb-8">
              {user
                ? "You're verified on FireFindFox. Browse listings, post items, or check your messages."
                : "FireFindFox is a verified campus marketplace for TSU students. List items, find deals near your building, and chat without leaving the platform. Your school email is your pass."}
            </p>
            <div className="flex flex-wrap gap-3">
              {user ? (
                <>
                  <button
                    onClick={() => setPage('browse')}
                    className="bg-[#0A0A0A] text-white text-sm px-6 py-3 hover:bg-[#737373] transition-colors"
                    style={{ fontFamily: MONO }}
                  >
                    Browse Listings →
                  </button>
                  <button
                    onClick={() => setPage('create')}
                    className="border border-[#0A0A0A] text-[#0A0A0A] text-sm px-6 py-3 hover:bg-[#F5F5F5] transition-colors"
                    style={{ fontFamily: MONO }}
                  >
                    Post an Item →
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setPage('login')}
                    className="bg-[#0A0A0A] text-white text-sm px-6 py-3 hover:bg-[#737373] transition-colors"
                    style={{ fontFamily: MONO }}
                  >
                    Sign in to browse →
                  </button>
                  <button
                    onClick={() => setPage('login')}
                    className="border border-[#0A0A0A] text-[#0A0A0A] text-sm px-6 py-3 hover:bg-[#F5F5F5] transition-colors"
                    style={{ fontFamily: MONO }}
                  >
                    Sign up with school email
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Live stats receipt — only meaningful once logged in (anon RLS returns nothing) */}
          {user && (
          <div
            className="border border-[#0A0A0A] p-6 min-w-[200px] shrink-0 hidden sm:block"
            style={{ fontFamily: MONO }}
          >
            <div className="flex items-center gap-1.5 text-xs text-[#737373] mb-4 tracking-widest uppercase">
              <BarChart2 size={12} />
              live stats
            </div>
            {[
              { label: 'Listings', value: stats.listings.toLocaleString(), Icon: Tag },
              { label: 'Students', value: stats.students.toLocaleString(), Icon: ShieldCheck },
              { label: 'Deals closed', value: stats.deals.toLocaleString(), Icon: BookmarkCheck },
              { label: 'Avg. response', value: '< 1 day', Icon: MessageCircle },
            ].map((s) => (
              <div key={s.label} className="flex justify-between items-center text-sm mb-2 gap-8">
                <span className="flex items-center gap-1.5 text-[#737373]">
                  <s.Icon size={11} />
                  {s.label}
                </span>
                <span className="font-bold text-[#0A0A0A]">{s.value}</span>
              </div>
            ))}
            <div className="border-t border-[#E5E5E5] mt-4 pt-3 text-xs text-[#737373]">
              live · updates on load
            </div>
          </div>
          )}
        </div>
      </section>

      {/* Ticker — needs live listing data, so logged-in only */}
      {user && listings.length > 0 && (
      <div
        className="border-b border-[#E5E5E5] bg-[#0A0A0A] text-white py-2 overflow-hidden"
        style={{ fontFamily: MONO }}
      >
        <div className="flex gap-12 text-xs whitespace-nowrap animate-marquee px-4">
          {[...Array(3)].map((_, i) => (
            <span key={i} className="flex gap-12">
              {listings.slice(0, 5).map((l) => (
                <span key={l.id} className="flex gap-4">
                  <span>{l.title.toUpperCase()} · ₱{l.price.toLocaleString()} · {l.location.split(',')[0].toUpperCase()}</span>
                  <span>·</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
      )}

      {/* Recent Listings — logged-in only; anon can't read the listings table */}
      {user ? (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-xl font-bold text-[#0A0A0A] tracking-tight" style={{ fontFamily: MONO }}>
            Recent Listings
          </h2>
          <button
            onClick={() => setPage('browse')}
            className="text-xs text-[#737373] hover:text-[#0A0A0A] transition-colors"
            style={{ fontFamily: MONO }}
          >
            View all →
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-[#E5E5E5]">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white aspect-[3/4] animate-pulse bg-[#F5F5F5]" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="border border-[#E5E5E5] py-20 text-center text-[#737373] text-sm">
            No listings yet. Be the first to post!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-[#E5E5E5]">
            {listings.map((l) => (
              <div key={l.id} className="bg-white">
                <ListingCard
                  listing={l}
                  onClick={() => { setSelectedListing(l); setPage('listing') }}
                />
              </div>
            ))}
          </div>
        )}
      </section>
      ) : (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div
            className="border border-[#0A0A0A] bg-[#0A0A0A] text-white p-8 sm:p-12 text-center"
            style={{ fontFamily: MONO }}
          >
            <p className="text-xs tracking-widest uppercase text-[#737373] mb-3">
              members only
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter mb-3">
              Listings live behind the login.
            </h2>
            <p className="text-sm text-[#A3A3A3] max-w-md mx-auto mb-8">
              To keep FireFindFox campus-exclusive, only verified TSU students can
              browse and message. Sign in with your @student.tsu.edu.ph email to see
              what's for sale near your building.
            </p>
            <button
              onClick={() => setPage('login')}
              className="bg-white text-[#0A0A0A] text-sm px-6 py-3 hover:bg-[#E5E5E5] transition-colors"
            >
              Sign in to browse →
            </button>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="border-t border-[#E5E5E5] bg-[#F5F5F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-xl font-bold text-[#0A0A0A] tracking-tight mb-6" style={{ fontFamily: MONO }}>
            Browse by Category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIES.map(({ name, Icon }) => (
              <button
                key={name}
                onClick={() => setPage('browse')}
                className="border border-[#E5E5E5] bg-white p-4 text-left hover:border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-colors group"
              >
                <Icon size={18} className="text-[#737373] group-hover:text-[#E5E5E5] mb-2" />
                <div className="text-sm font-semibold text-[#0A0A0A] group-hover:text-white">
                  {name}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid sm:grid-cols-3 gap-px bg-[#E5E5E5]">
            {[
              { step: '01', Icon: ShieldCheck, title: 'Verify with school email', body: 'Sign up using your @student.tsu.edu.ph email. Domain is validated — no exceptions.' },
              { step: '02', Icon: MapPin, title: 'Post with campus location', body: 'Tag your listing to a building, dorm, or safe exchange zone. Buyers know exactly where to meet.' },
              { step: '03', Icon: ThumbsUp, title: "Bump, don't repost", body: 'Refresh your listing in the feed with one tap. Our duplicate detector blocks actual reposts.' },
            ].map(({ step, Icon, title, body }) => (
              <div key={step} className="bg-white p-5 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Icon size={22} className="text-[#0A0A0A]" strokeWidth={1.5} />
                  <span className="text-2xl font-bold text-[#E5E5E5]" style={{ fontFamily: MONO }}>{step}</span>
                </div>
                <h3 className="text-base font-bold text-[#0A0A0A] mb-2">{title}</h3>
                <p className="text-sm text-[#737373]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E5] bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold tracking-tighter mb-1" style={{ fontFamily: MONO }}>
              <img src={logo} alt="FireFindFox" className="w-6 h-6 object-contain invert" />
              firefindfox
            </div>
            <div className="text-xs text-[#737373]">Built by Angel Bitangcol · BSIT 4 · CCS · TSU · 2026</div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#737373]" style={{ fontFamily: MONO }}>
            <ShieldCheck size={12} />
            campus-exclusive · @student.tsu only
          </div>
        </div>
      </footer>
    </main>
  )
}
