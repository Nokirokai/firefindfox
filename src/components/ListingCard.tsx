import { Star, ThumbsUp } from 'lucide-react'
import type { Listing } from '../types'
import { CONDITION_LABELS, STATUS_LABELS, MONO } from '../types'

export default function ListingCard({
  listing,
  onClick,
}: {
  listing: Listing
  onClick: () => void
}) {
  return (
    <article
      className="border border-[#E5E5E5] bg-white hover:border-[#0A0A0A] transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative overflow-hidden bg-[#F5F5F5] aspect-[4/3]">
        <img
          src={listing.image}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {listing.status !== 'active' && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <span className="text-sm font-bold tracking-widest uppercase border border-[#0A0A0A] px-3 py-1" style={{ fontFamily: MONO }}>
              {STATUS_LABELS[listing.status]}
            </span>
          </div>
        )}
        <div className="absolute top-2 left-2 max-w-[calc(100%-16px)]">
          <span className="bg-white border border-[#E5E5E5] text-[#737373] text-xs px-2 py-0.5 block truncate" style={{ fontFamily: MONO }}>
            {listing.category}
          </span>
        </div>
      </div>

      <div className="p-2.5 sm:p-3">
        <div className="flex items-start justify-between gap-1.5 mb-1">
          <h3 className="text-xs sm:text-sm font-semibold text-[#0A0A0A] leading-snug line-clamp-2 min-w-0 flex-1">
            {listing.title}
          </h3>
          <span className="text-sm font-bold text-[#0A0A0A] shrink-0 mt-0.5" style={{ fontFamily: MONO }}>
            ₱{listing.price.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-1.5 min-w-0 overflow-hidden">
          <span className="text-xs text-[#737373] border border-[#E5E5E5] px-1.5 py-0.5 shrink-0" style={{ fontFamily: MONO }}>
            {CONDITION_LABELS[listing.condition]}
          </span>
          <span className="text-xs text-[#737373] truncate">· {listing.location.split(',')[0]}</span>
        </div>

        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#F5F5F5] gap-1 min-w-0">
          <span className="flex items-center gap-1 text-xs text-[#737373] min-w-0 overflow-hidden">
            <span className="truncate">{listing.seller}</span>
            {listing.sellerRatingCount > 0 ? (
              <>
                <Star size={10} className="text-[#0A0A0A] shrink-0 ml-0.5" fill="#0A0A0A" />
                <span className="text-[#0A0A0A] shrink-0">{listing.sellerRating.toFixed(1)}</span>
                <span className="shrink-0">({listing.sellerRatingCount})</span>
              </>
            ) : (
              <span className="shrink-0 ml-0.5">· new</span>
            )}
          </span>
          <span className="flex items-center gap-1 text-xs px-1.5 py-1 border border-[#E5E5E5] text-[#737373] shrink-0" style={{ fontFamily: MONO }}>
            <ThumbsUp size={10} />
            {listing.bumps}
          </span>
        </div>
      </div>
    </article>
  )
}
