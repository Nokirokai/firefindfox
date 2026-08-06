import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import ListingCard from '../components/ListingCard'
import { CATEGORIES } from '../data/listings'
import { useAllListings } from '../hooks/useListings'
import type { Page, Listing } from '../types'
import { MONO } from '../types'

export default function BrowsePage({
  setPage,
  setSelectedListing,
}: {
  setPage: (p: Page) => void
  setSelectedListing: (l: Listing) => void
}) {
  const { listings, loading } = useAllListings()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'recent' | 'price_asc' | 'price_desc' | 'bumps'>('recent')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return listings
      .filter((l) => {
        if (activeCategory && l.category !== activeCategory) return false
        if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price
        if (sortBy === 'price_desc') return b.price - a.price
        if (sortBy === 'bumps') return b.bumps - a.bumps
        return 0
      })
  }, [listings, activeCategory, sortBy, search])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Search + Sort row */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
            <input
              type="text"
              placeholder="Search listings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-[#E5E5E5] bg-[#F5F5F5] pl-9 pr-4 py-2 text-sm text-[#0A0A0A] placeholder:text-[#737373] focus:outline-none focus:border-[#0A0A0A] w-full"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="border border-[#E5E5E5] text-xs text-[#0A0A0A] px-2 py-2 bg-white focus:outline-none focus:border-[#0A0A0A] shrink-0"
            style={{ fontFamily: MONO }}
          >
            <option value="recent">Recent</option>
            <option value="bumps">Bumped</option>
            <option value="price_asc">↑ Price</option>
            <option value="price_desc">↓ Price</option>
          </select>
        </div>
        {/* Category chips */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.slice(0, 5).map((c) => (
            <button
              key={c.name}
              onClick={() => setActiveCategory(activeCategory === c.name ? null : c.name)}
              className={`text-xs px-3 py-1.5 border transition-colors ${
                activeCategory === c.name
                  ? 'bg-[#0A0A0A] border-[#0A0A0A] text-white'
                  : 'border-[#E5E5E5] text-[#737373] hover:border-[#0A0A0A]'
              }`}
              style={{ fontFamily: MONO }}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-[#737373] mb-4" style={{ fontFamily: MONO }}>
        {loading ? 'Loading...' : `${filtered.length} listing${filtered.length !== 1 ? 's' : ''} found`}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-[#E5E5E5]">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white aspect-[3/4] animate-pulse bg-[#F5F5F5]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-[#737373] text-sm">
          No listings match your search.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-[#E5E5E5]">
          {filtered.map((l) => (
            <div key={l.id} className="bg-white">
              <ListingCard
                listing={l}
                onClick={() => { setSelectedListing(l); setPage('listing') }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
