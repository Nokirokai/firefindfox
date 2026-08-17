import { useState } from 'react'
import { ChevronLeft, AlertCircle, CheckCircle, Star, ThumbsUp } from 'lucide-react'
import type { Page } from '../types'
import { MONO, CONDITION_LABELS } from '../types'
import { CATEGORIES } from '../data/listings'
import { useAuth } from '../contexts/AuthContext'
import { createListing } from '../hooks/useListings'
import LocationPicker from '../components/LocationPicker'
import MultiImageUpload, { type ImageItem } from '../components/MultiImageUpload'
import { DEFAULT_LOCATION } from '../data/locations'

const CONDITIONS = [
  { value: 'new', label: 'Brand New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'used', label: 'Used' },
  { value: 'for_parts', label: 'For Parts' },
]

const FALLBACK = 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=600&h=500&fit=crop&auto=format'

export default function CreateListingPage({ setPage }: { setPage: (p: Page) => void }) {
  const { user, profile } = useAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState('used')
  const [category, setCategory] = useState(CATEGORIES[0].name)
  const [location, setLocation] = useState(DEFAULT_LOCATION)
  const [images, setImages] = useState<ImageItem[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-20 text-center">
        <p className="text-sm text-[#737373]">You must be signed in to post a listing.</p>
        <button onClick={() => setPage('login')} className="mt-4 bg-[#0A0A0A] text-white text-sm px-6 py-2 hover:bg-[#737373] transition-colors" style={{ fontFamily: MONO }}>
          Sign in
        </button>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!title.trim() || !description.trim() || !price) {
      setError('Please fill in all required fields.')
      return
    }
    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum <= 0) { setError('Enter a valid price.'); return }

    setLoading(true)
    const imageFiles = images.map((img) => img.file).filter(Boolean) as File[]
    const result = await createListing({
      title: title.trim(), description: description.trim(),
      price: priceNum, condition, category, location,
      imageFiles, sellerId: user!.id,
    })
    setLoading(false)
    if ('error' in result) { setError(result.error) }
    else { setSuccess(true); setTimeout(() => setPage('browse'), 1800) }
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-20 text-center">
        <CheckCircle size={40} className="mx-auto text-[#0A0A0A] mb-4" />
        <h2 className="text-lg font-bold text-[#0A0A0A] mb-2" style={{ fontFamily: MONO }}>Listing posted!</h2>
        <p className="text-sm text-[#737373]">Redirecting to Browse...</p>
      </div>
    )
  }

  const sellerName = profile?.full_name || user.email?.split('@')[0] || 'You'
  const displayPrice = parseFloat(price) || 0
  const previewImage = images[0]?.preview ?? FALLBACK

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => setPage('browse')} className="flex items-center gap-1.5 text-xs text-[#737373] hover:text-[#0A0A0A] transition-colors mb-6" style={{ fontFamily: MONO }}>
        <ChevronLeft size={13} /> Back
      </button>
      <h1 className="text-2xl font-bold text-[#0A0A0A] mb-6" style={{ fontFamily: MONO }}>Post a Listing</h1>

      {error && (
        <div className="flex items-center gap-2 border border-red-300 bg-red-50 text-red-700 text-xs p-3 mb-4">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_300px] gap-10 items-start">
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs text-[#737373] mb-2" style={{ fontFamily: MONO }}>PHOTOS (up to 5)</label>
            <MultiImageUpload images={images} onChange={setImages} max={5} />
          </div>

          <div>
            <label className="block text-xs text-[#737373] mb-1" style={{ fontFamily: MONO }}>TITLE *</label>
            <input type="text" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Casio fx-991EX Scientific Calculator"
              className="w-full border border-[#E5E5E5] bg-[#F5F5F5] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#737373] focus:outline-none focus:border-[#0A0A0A]" />
          </div>

          <div>
            <label className="block text-xs text-[#737373] mb-1" style={{ fontFamily: MONO }}>DESCRIPTION *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the item — condition details, why you're selling, what's included..."
              rows={4}
              className="w-full border border-[#E5E5E5] bg-[#F5F5F5] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#737373] focus:outline-none focus:border-[#0A0A0A] resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#737373] mb-1" style={{ fontFamily: MONO }}>PRICE (₱) *</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                placeholder="0" min="1"
                className="w-full border border-[#E5E5E5] bg-[#F5F5F5] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#737373] focus:outline-none focus:border-[#0A0A0A]"
                style={{ fontFamily: MONO }} />
            </div>
            <div>
              <label className="block text-xs text-[#737373] mb-1" style={{ fontFamily: MONO }}>CONDITION *</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value)}
                className="w-full border border-[#E5E5E5] bg-[#F5F5F5] px-4 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A]" style={{ fontFamily: MONO }}>
                {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#737373] mb-1" style={{ fontFamily: MONO }}>CATEGORY *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-[#E5E5E5] bg-[#F5F5F5] px-4 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A]" style={{ fontFamily: MONO }}>
                {CATEGORIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="meetup-location" className="block text-xs text-[#737373] mb-1" style={{ fontFamily: MONO }}>MEET-UP POINT *</label>
              <LocationPicker id="meetup-location" value={location} onChange={setLocation} />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="bg-[#0A0A0A] text-white text-sm py-3 hover:bg-[#737373] transition-colors disabled:opacity-50 mt-2"
            style={{ fontFamily: MONO }}>
            {loading ? 'Posting...' : 'Post Listing →'}
          </button>
        </form>

        {/* Live preview — hidden on mobile, sticky on desktop */}
        <div className="hidden lg:block lg:sticky lg:top-20">
          <p className="text-xs text-[#737373] mb-3 tracking-widest uppercase" style={{ fontFamily: MONO }}>Preview</p>
          <article className="border border-[#0A0A0A] bg-white">
            <div className="relative overflow-hidden bg-[#F5F5F5] aspect-[4/3]">
              <img src={previewImage} alt="preview" className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2">
                <span className="bg-white border border-[#E5E5E5] text-[#737373] text-xs px-2 py-0.5" style={{ fontFamily: MONO }}>{category}</span>
              </div>
              {images.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5" style={{ fontFamily: MONO }}>
                  1 / {images.length}
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-sm font-semibold text-[#0A0A0A] leading-snug line-clamp-2">{title || 'Your listing title'}</h3>
                <span className="text-base font-bold text-[#0A0A0A] shrink-0 mt-0.5" style={{ fontFamily: MONO }}>
                  ₱{displayPrice > 0 ? displayPrice.toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-[#737373] border border-[#E5E5E5] px-1.5 py-0.5" style={{ fontFamily: MONO }}>
                  {CONDITION_LABELS[condition as keyof typeof CONDITION_LABELS]}
                </span>
                <span className="text-xs text-[#737373]">· {location.split(',')[0]}</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F5F5F5]">
                <span className="flex items-center gap-1 text-xs text-[#737373]">
                  {sellerName}
                  <Star size={10} className="text-[#0A0A0A] ml-1" fill="#0A0A0A" />
                  <span className="text-[#0A0A0A]">0.0</span>
                </span>
                <span className="flex items-center gap-1 text-xs px-2 py-1 border border-[#E5E5E5] text-[#737373]" style={{ fontFamily: MONO }}>
                  <ThumbsUp size={11} /> 0
                </span>
              </div>
            </div>
          </article>
          <p className="text-xs text-[#737373] mt-3 text-center" style={{ fontFamily: MONO }}>
            Exactly how it appears in Browse.
          </p>
        </div>
      </div>
    </div>
  )
}
