export type Condition = 'new' | 'like_new' | 'used' | 'for_parts'
export type Status = 'active' | 'reserved' | 'sold'
export type Page = 'home' | 'browse' | 'listing' | 'messages' | 'create' | 'login' | 'profile' | 'edit-listing'

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  rating_avg: number
  rating_count: number
  created_at: string
}

export interface Listing {
  id: string
  title: string
  price: number
  condition: Condition
  status: Status
  category: string
  location: string
  seller: string
  seller_id: string
  sellerRating: number
  sellerRatingCount: number
  bumps: number
  image: string    // primary image (first of images[])
  images: string[] // all images
  postedAt: string
  description: string
}

export interface Conversation {
  id: string
  listing_id: string
  listing_title: string
  listing_price: number
  buyer_id: string
  seller_id: string
  other_name: string   // the other participant's display name
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

export const CONDITION_LABELS: Record<Condition, string> = {
  new: 'Brand New',
  like_new: 'Like New',
  used: 'Used',
  for_parts: 'For Parts',
}

export const STATUS_LABELS: Record<Status, string> = {
  active: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
}

export const MONO = "'JetBrains Mono', monospace"

// Map a raw Supabase listings row (with joined profile) to our Listing shape
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=600&h=500&fit=crop&auto=format'

export function mapListing(row: any): Listing {
  const imageUrls: string[] = Array.isArray(row.image_urls) && row.image_urls.length > 0
    ? row.image_urls
    : row.image_url
      ? [row.image_url]
      : [FALLBACK_IMG]
  return {
    id: row.id,
    title: row.title,
    price: Number(row.price),
    condition: row.condition as Condition,
    status: row.status as Status,
    category: row.category,
    location: row.location,
    seller: row.profiles?.full_name || row.profiles?.email || 'TSU Student',
    seller_id: row.seller_id,
    sellerRating: Number(row.profiles?.rating_avg ?? 0),
    sellerRatingCount: Number(row.profiles?.rating_count ?? 0),
    bumps: row.bump_count ?? 0,
    image: imageUrls[0],
    images: imageUrls,
    postedAt: row.created_at ? row.created_at.split('T')[0] : '',
    description: row.description,
  }
}
