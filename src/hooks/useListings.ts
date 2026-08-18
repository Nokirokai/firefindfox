import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { mapListing } from '../types'
import type { Listing } from '../types'

const LISTINGS_BASE = `
  id, seller_id, title, description, price, condition, status,
  category, location, image_url, image_urls, bump_count, last_bumped_at, created_at
`

export interface SellerRating { avg: number; count: number }

/**
 * Ratings are computed from the reviews table rather than read from
 * profiles.rating_avg — a buyer usually cannot write to another user's profile
 * row (RLS), so that denormalized column is unreliable and often stale.
 */
export async function fetchSellerRatings(
  sellerIds: string[]
): Promise<Record<string, SellerRating>> {
  const out: Record<string, SellerRating> = {}
  const ids = [...new Set(sellerIds)].filter(Boolean)
  if (!ids.length) return out

  const { data, error } = await supabase
    .from('reviews')
    .select('seller_id, rating')
    .in('seller_id', ids)
  if (error) {
    // e.g. anon lacks SELECT on reviews before the grant is applied — degrade
    // to "no ratings" rather than logging an error and breaking the page.
    console.warn('ratings unavailable:', error.message)
    return out
  }

  const buckets: Record<string, number[]> = {}
  for (const r of data ?? []) {
    if (!buckets[r.seller_id]) buckets[r.seller_id] = []
    buckets[r.seller_id].push(Number(r.rating))
  }
  for (const [id, arr] of Object.entries(buckets)) {
    out[id] = { avg: arr.reduce((a, b) => a + b, 0) / arr.length, count: arr.length }
  }
  return out
}

export async function enrichWithProfiles(rows: any[]): Promise<any[]> {
  if (!rows.length) return []
  const sellerIds = [...new Set(rows.map((r) => r.seller_id))]
  const [{ data: profiles }, ratings] = await Promise.all([
    supabase.from('public_profiles').select('id, full_name').in('id', sellerIds),
    fetchSellerRatings(sellerIds),
  ])
  const profileMap: Record<string, any> = {}
  for (const p of profiles ?? []) profileMap[p.id] = p
  return rows.map((r) => {
    const rating = ratings[r.seller_id]
    return {
      ...r,
      profiles: {
        ...(profileMap[r.seller_id] ?? {}),
        rating_avg: rating?.avg ?? 0,
        rating_count: rating?.count ?? 0,
      },
    }
  })
}

/** Live seller rating, recomputed from reviews. */
export function useSellerRating(sellerId: string | null) {
  const [rating, setRating] = useState<SellerRating>({ avg: 0, count: 0 })

  const fetch = useCallback(async () => {
    if (!sellerId) { setRating({ avg: 0, count: 0 }); return }
    const map = await fetchSellerRatings([sellerId])
    setRating(map[sellerId] ?? { avg: 0, count: 0 })
  }, [sellerId])

  useEffect(() => {
    fetch()
    if (!sellerId) return
    const channel = supabase
      .channel(`reviews:${sellerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' },
        (payload) => {
          const row = (payload.new ?? payload.old) as any
          if (row?.seller_id === sellerId) fetch()
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sellerId, fetch])

  return { ...rating, refetch: fetch }
}

export function useListings(limit?: number) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('listings')
      .select(LISTINGS_BASE)
      .eq('status', 'active')
      .order('last_bumped_at', { ascending: false })
    if (limit) q = q.limit(limit)
    const { data, error: err } = await q
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    const enriched = await enrichWithProfiles(data ?? [])
    setListings(enriched.map(mapListing))
    setLoading(false)
  }, [limit])

  useEffect(() => { fetch() }, [fetch])

  return { listings, loading, error, refetch: fetch }
}

export function useAllListings() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('listings')
      .select(LISTINGS_BASE)
      .in('status', ['active', 'reserved'])
      .order('last_bumped_at', { ascending: false })
    if (err) {
      console.error('listings fetch error:', err.message)
      setLoading(false)
      return
    }
    const enriched = await enrichWithProfiles(data ?? [])
    setListings(enriched.map(mapListing))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    const channel = supabase
      .channel('all-listings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => { fetch() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  return { listings, loading, refetch: fetch }
}

export function useLiveStats() {
  const [stats, setStats] = useState({ listings: 0, students: 0, deals: 0 })

  useEffect(() => {
    async function fetch() {
      // A definer RPC returns real counts even to guests, who can't see sold
      // listings (or every profile) through row-level policies.
      const { data, error } = await supabase.rpc('get_home_stats').single<{
        listings: number
        students: number
        deals: number
      }>()
      if (error || !data) {
        console.warn('home stats unavailable:', error?.message)
        return
      }
      setStats({
        listings: Number(data.listings) || 0,
        students: Number(data.students) || 0,
        deals: Number(data.deals) || 0,
      })
    }
    fetch()
  }, [])

  return stats
}

export async function bumpListing(listingId: string): Promise<string | null> {
  // Cooldown + increment are enforced atomically server-side (see
  // supabase/validation_hardening.sql) so the client timer can't be bypassed.
  const { error } = await supabase.rpc('bump_listing', { p_listing_id: listingId })
  if (!error) return null
  if (error.code === 'P0001') return 'You can bump again in up to 24h.'
  if (error.code === '42501') return 'Only the seller can bump this listing.'
  return error.message
}

export async function markListingSold(listingId: string): Promise<string | null> {
  // Either party in the conversation may close the deal; the RPC verifies that.
  const { error } = await supabase.rpc('mark_listing_sold', { p_listing_id: listingId })
  if (!error) return null
  if (error.code === '42501') return 'Only someone in this deal can mark it sold.'
  return error.message
}

export async function updateListingStatus(
  listingId: string,
  status: 'active' | 'reserved' | 'sold'
): Promise<string | null> {
  const { error } = await supabase.from('listings').update({ status }).eq('id', listingId)
  return error?.message ?? null
}

export async function deleteListing(listingId: string): Promise<string | null> {
  const { error } = await supabase.from('listings').delete().eq('id', listingId)
  return error?.message ?? null
}

export async function saveListing(userId: string, listingId: string): Promise<void> {
  // Ignore the unique-violation if it's already saved (idempotent).
  await supabase
    .from('saved_listings')
    .upsert({ user_id: userId, listing_id: listingId }, { onConflict: 'user_id,listing_id', ignoreDuplicates: true })
}

export async function unsaveListing(userId: string, listingId: string): Promise<void> {
  await supabase.from('saved_listings').delete().eq('user_id', userId).eq('listing_id', listingId)
}

export async function isSaved(userId: string, listingId: string): Promise<boolean> {
  const { data } = await supabase
    .from('saved_listings')
    .select('listing_id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle()
  return !!data
}

export async function leaveReview(
  listingId: string,
  reviewerId: string,
  sellerId: string,
  rating: number,
  comment: string
): Promise<string | null> {
  if (reviewerId === sellerId) return 'You cannot review your own listing.'
  if (rating < 1 || rating > 5) return 'Please choose a rating from 1 to 5.'

  const { error } = await supabase
    .from('reviews')
    .insert({ listing_id: listingId, reviewer_id: reviewerId, seller_id: sellerId, rating, comment })
  if (error) {
    // Map the DB guards to friendly messages (see supabase/fix_reviews_rls.sql).
    if (error.code === '23505') return 'You have already reviewed this deal.'
    if (error.code === '23514') return 'That review is not allowed.'
    if (error.code === '42501') return 'Only the buyer of a completed deal can leave a review.'
    return error.message
  }

  // Recalculate seller's rating_avg
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('seller_id', sellerId)
  if (reviews && reviews.length > 0) {
    const avg = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
    // Best-effort cache refresh. RLS may forbid writing another user's profile
    // row; that is fine, every read path derives the rating from reviews.
    const { error: syncErr } = await supabase
      .from('profiles')
      .update({ rating_avg: avg, rating_count: reviews.length })
      .eq('id', sellerId)
    if (syncErr) console.warn('rating cache not updated:', syncErr.message)
  }
  return null
}

async function uploadImages(files: File[], sellerId: string): Promise<string[]> {
  const urls: string[] = []
  for (const file of files) {
    const ext = file.name.split('.').pop()
    const path = `${sellerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from('listing-images')
      .upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('listing-images').getPublicUrl(path)
      urls.push(data.publicUrl)
    }
  }
  return urls
}

export interface CreateListingInput {
  title: string
  description: string
  price: number
  condition: string
  category: string
  location: string
  imageFiles: File[]
  sellerId: string
}

export async function createListing(input: CreateListingInput): Promise<{ id: string } | { error: string }> {
  const imageUrls = await uploadImages(input.imageFiles, input.sellerId)

  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: input.sellerId,
      title: input.title,
      description: input.description,
      price: input.price,
      condition: input.condition,
      category: input.category,
      location: input.location,
      image_url: imageUrls[0] ?? null,
      image_urls: imageUrls,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { id: data.id }
}

export interface UpdateListingInput {
  title: string
  description: string
  price: number
  condition: string
  category: string
  location: string
  existingImageUrls: string[]  // already-uploaded URLs to keep
  newImageFiles: File[]        // new files to upload
  sellerId: string
}

export async function updateListing(
  listingId: string,
  input: UpdateListingInput
): Promise<{ error?: string }> {
  const newUrls = await uploadImages(input.newImageFiles, input.sellerId)
  const allUrls = [...input.existingImageUrls, ...newUrls]

  const { error } = await supabase
    .from('listings')
    .update({
      title: input.title,
      description: input.description,
      price: input.price,
      condition: input.condition,
      category: input.category,
      location: input.location,
      image_url: allUrls[0] ?? null,
      image_urls: allUrls,
      updated_at: new Date().toISOString(),
    })
    .eq('id', listingId)

  return { error: error?.message }
}
