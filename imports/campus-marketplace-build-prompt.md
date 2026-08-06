# Build Prompt: Campus Marketplace Web App

Use this as the master prompt/spec when building with an AI coding assistant (Claude Code, Cursor, etc.) or as your own reference doc.

---

## 1. Project Overview

Build a **university-exclusive marketplace web app** (like a campus-only Facebook Bentahan, but structured). Students/faculty verified via school email can post, browse, and message about items for sale. Core differentiators vs a Facebook group:
- Campus location tagging per listing (building/college/dorm)
- Anti-repost system — a "bump" mechanic replaces reposting, backed by content/image duplicate detection
- University email domain verification only

**Stack:** React 18 + TypeScript + Tailwind CSS + Supabase (Postgres, Auth, Storage, Edge Functions)

---

## 2. Folder Structure

```
campus-marketplace/
├── public/
│   └── favicon.ico
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css                     # Tailwind directives + design tokens
│   │
│   ├── lib/
│   │   ├── supabase.ts                # Supabase client init
│   │   ├── hash.ts                    # content hash / SimHash helpers
│   │   ├── phash.ts                   # perceptual image hash helpers
│   │   └── utils.ts
│   │
│   ├── types/
│   │   ├── database.types.ts          # generated via `supabase gen types typescript`
│   │   └── index.ts                   # shared app-level types
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useListings.ts
│   │   ├── useConversations.ts
│   │   └── useDuplicateCheck.ts
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── listings/
│   │   │   ├── ListingCard.tsx
│   │   │   ├── ListingForm.tsx
│   │   │   ├── ListingGrid.tsx
│   │   │   ├── ListingDetail.tsx
│   │   │   ├── BumpButton.tsx
│   │   │   └── DuplicateWarningModal.tsx
│   │   ├── messaging/
│   │   │   ├── ConversationList.tsx
│   │   │   ├── ChatWindow.tsx
│   │   │   └── MessageBubble.tsx
│   │   ├── map/
│   │   │   ├── CampusMap.tsx
│   │   │   └── LocationPicker.tsx
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── ReportsQueue.tsx
│   │   │   └── DuplicateFlagsQueue.tsx
│   │   └── ui/                        # buttons, inputs, modal, toast, etc.
│   │
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   ├── ListingDetailPage.tsx
│   │   ├── CreateListingPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── MessagesPage.tsx
│   │   ├── SavedPage.tsx
│   │   └── AdminPage.tsx
│   │
│   └── router.tsx
│
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init_schema.sql
│   │   ├── 0002_rls_policies.sql
│   │   └── 0003_functions_triggers.sql
│   ├── functions/
│   │   ├── auto-archive-listings/     # scheduled edge function
│   │   │   └── index.ts
│   │   └── check-duplicate-image/     # optional server-side pHash
│   │       └── index.ts
│   └── config.toml
│
├── .env.local                         # SUPABASE_URL, SUPABASE_ANON_KEY (never commit)
├── .env.example
├── .gitignore
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
├── package.json
└── README.md
```

---

## 3. Database Schema

```sql
-- =========================
-- PROFILES (extends auth.users)
-- =========================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  school_email text unique not null,
  is_verified boolean default false,
  college text,
  campus_zone text,
  avatar_url text,
  rating_avg numeric default 0,
  rating_count int default 0,
  is_banned boolean default false,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- =========================
-- CATEGORIES
-- =========================
create table categories (
  id serial primary key,
  name text unique not null
);

-- =========================
-- CAMPUS LOCATIONS
-- =========================
create table campus_locations (
  id serial primary key,
  name text not null,
  latitude numeric,
  longitude numeric,
  is_safe_zone boolean default false
);

-- =========================
-- LISTINGS
-- =========================
create table listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references profiles(id) on delete cascade,
  category_id int references categories(id),
  title text not null,
  description text not null,
  price numeric not null,
  condition text check (condition in ('new','like_new','used','for_parts')),
  status text check (status in ('active','reserved','sold','archived')) default 'active',
  location_id int references campus_locations(id),
  content_hash text not null,
  bump_count int default 0,
  last_bumped_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================
-- LISTING IMAGES
-- =========================
create table listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  image_url text not null,
  image_hash text not null,
  position int default 0
);

-- =========================
-- CONVERSATIONS & MESSAGES
-- =========================
create table conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  buyer_id uuid references profiles(id),
  seller_id uuid references profiles(id),
  created_at timestamptz default now(),
  unique (listing_id, buyer_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id),
  content text not null,
  created_at timestamptz default now()
);

-- =========================
-- SAVED LISTINGS
-- =========================
create table saved_listings (
  user_id uuid references profiles(id) on delete cascade,
  listing_id uuid references listings(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, listing_id)
);

-- =========================
-- REPORTS
-- =========================
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id),
  listing_id uuid references listings(id),
  reported_user_id uuid references profiles(id),
  reason text not null,
  status text check (status in ('pending','reviewed','dismissed')) default 'pending',
  created_at timestamptz default now()
);

-- =========================
-- RATINGS
-- =========================
create table ratings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id),
  rater_id uuid references profiles(id),
  rated_id uuid references profiles(id),
  score int check (score between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

-- =========================
-- DUPLICATE FLAGS
-- =========================
create table duplicate_flags (
  id uuid primary key default gen_random_uuid(),
  original_listing_id uuid references listings(id),
  duplicate_listing_id uuid references listings(id),
  similarity_score numeric,
  method text,
  resolved boolean default false,
  created_at timestamptz default now()
);

-- =========================
-- INDEXES
-- =========================
create index idx_listings_seller on listings(seller_id);
create index idx_listings_status on listings(status);
create index idx_listings_content_hash on listings(content_hash);
create index idx_images_hash on listing_images(image_hash);
create index idx_messages_conversation on messages(conversation_id);
```

---

## 4. Security

### 4.1 Auth & Email Domain Verification
- Use Supabase Auth (email/password or magic link) restricted at signup by a **Postgres trigger** that checks `new.email` against the university domain regex (e.g. `%@xxx.edu.ph`) before allowing a `profiles` row to be created. Reject/delete the auth user if domain doesn't match.
- Never trust client-side domain checks alone — always re-validate server-side via trigger or edge function.

### 4.2 Row-Level Security (RLS) — enable on every table

```sql
alter table profiles enable row level security;
alter table listings enable row level security;
alter table listing_images enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table saved_listings enable row level security;
alter table reports enable row level security;
alter table ratings enable row level security;
alter table duplicate_flags enable row level security;

-- PROFILES: users can read all verified profiles, update only their own
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- LISTINGS: anyone verified can read; only owner can insert/update/delete their own
create policy "listings_select" on listings for select using (true);
create policy "listings_insert_own" on listings for insert with check (auth.uid() = seller_id);
create policy "listings_update_own" on listings for update using (auth.uid() = seller_id);
create policy "listings_delete_own" on listings for delete using (auth.uid() = seller_id);

-- LISTING IMAGES: tied to listing ownership
create policy "images_select" on listing_images for select using (true);
create policy "images_insert_own" on listing_images for insert
  with check (exists (select 1 from listings where listings.id = listing_id and listings.seller_id = auth.uid()));

-- CONVERSATIONS: only buyer or seller involved can see
create policy "conversations_select" on conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "conversations_insert" on conversations for insert
  with check (auth.uid() = buyer_id);

-- MESSAGES: only participants of the conversation
create policy "messages_select" on messages for select
  using (exists (
    select 1 from conversations c
    where c.id = conversation_id
    and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  ));
create policy "messages_insert" on messages for insert
  with check (auth.uid() = sender_id and exists (
    select 1 from conversations c
    where c.id = conversation_id
    and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  ));

-- SAVED LISTINGS: only own
create policy "saved_select_own" on saved_listings for select using (auth.uid() = user_id);
create policy "saved_insert_own" on saved_listings for insert with check (auth.uid() = user_id);
create policy "saved_delete_own" on saved_listings for delete using (auth.uid() = user_id);

-- REPORTS: any authenticated user can insert; only admins can read/update
create policy "reports_insert" on reports for insert with check (auth.uid() = reporter_id);
create policy "reports_select_admin" on reports for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
create policy "reports_update_admin" on reports for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- RATINGS: readable by all, insertable only by participants of a completed transaction
create policy "ratings_select" on ratings for select using (true);
create policy "ratings_insert_own" on ratings for insert with check (auth.uid() = rater_id);

-- DUPLICATE FLAGS: admin only
create policy "dupflags_admin_only" on duplicate_flags for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
```

### 4.3 Storage Security (listing images)
- Use a Supabase Storage bucket (`listing-images`), **not public by default**
- Bucket policy: insert only by authenticated users; images served via signed URLs or public read if you're OK with anyone viewing item photos (typical for marketplaces)
- Validate file type/size client-side AND server-side (edge function) before accepting uploads — block non-image mimetypes

### 4.4 Rate limiting / abuse prevention
- Server-side cooldown check for bump (`last_bumped_at`) — never trust client timer
- Rate-limit listing creation per user (e.g. max 10 active listings, enforced via a Postgres check function or trigger)
- Sanitize all text inputs (title/description/messages) against XSS before rendering — use a sanitizer lib client-side even though React escapes by default, extra caution for any `dangerouslySetInnerHTML` usage (avoid it entirely if possible)

### 4.5 Environment & secrets
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env.local`, never committed (`.gitignore` includes `.env.local`)
- Service role key **only** used inside edge functions (auto-archive, admin operations), never shipped to the client
- `.env.example` committed with placeholder values so teammates know what's needed

---

## 5. Anti-Repost / Duplicate Detection Logic Summary
(See full detail in the earlier system design — implement in this order)

1. **Content hash check** on submit — normalize title+description, hash, compare against seller's own active listings → block + suggest bump
2. **Bump mechanic** — replaces reposting; 24h server-side cooldown; feed sorts by `last_bumped_at`
3. **Image pHash check** — perceptual hash on upload, compare against seller's own recent images
4. **Auto-archive** — scheduled edge function sweeps `expires_at`
5. **Admin duplicate queue** — `duplicate_flags` table surfaces suspected reposts for manual review

---

## 6. Build Order (suggested milestones)

1. Supabase project setup + migrations (schema + RLS)
2. Auth flow with school email domain trigger
3. Listing CRUD + categories + campus_locations seed data
4. Feed page with filters (category, location, price) sorted by `last_bumped_at`
5. Content-hash duplicate check + bump button (highest impact, do this early)
6. Messaging (conversations + messages, realtime via Supabase Realtime)
7. Image upload + pHash duplicate check
8. Saved listings + ratings
9. Admin dashboard (reports + duplicate flags queue)
10. Auto-archive edge function (scheduled via `pg_cron` or Supabase Scheduled Functions)

---

## 7. Design System

**Palette:** black & white, no color accents — pure functional contrast.
- `--bg`: #FFFFFF
- `--fg`: #0A0A0A
- `--border`: #E5E5E5
- `--muted`: #737373 (secondary text, timestamps, labels)
- `--surface`: #F5F5F5 (cards, input backgrounds)
- Status colors kept grayscale too — use weight/underline/icon to distinguish "sold" vs "active" rather than color, so the palette stays strictly b/w.

**Typography:**
- Headings: monospace (e.g. `'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace`) — gives listings/prices a receipt/ledger feel, fitting a marketplace
- Body: Google Sans — note: Google Sans itself isn't distributed on Google Fonts (it's proprietary to Google products), so self-host the `.woff2` files if you have them, or use the close public equivalent **Google Sans Text** / **Product Sans** if you have access, otherwise fall back to **Roboto** or **Inter**, which share its metrics closely
- Tailwind config:
```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      fontFamily: {
        heading: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        body: ['"Google Sans"', '"Roboto"', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        bg: '#FFFFFF',
        fg: '#0A0A0A',
        border: '#E5E5E5',
        muted: '#737373',
        surface: '#F5F5F5',
      },
    },
  },
}
```
```css
/* index.css */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
/* Google Sans: self-host if licensed, else swap the family name below to Roboto */
@font-face {
  font-family: 'Google Sans';
  src: url('/fonts/GoogleSans-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```
- Prices, listing IDs, timestamps, and category tags in heading/mono font (numeric/tabular content reads well in mono); everything else (descriptions, chat messages, nav labels) in body font

## 8. Notes for the AI Coding Assistant
- Generate TypeScript types from the schema via `supabase gen types typescript --local > src/types/database.types.ts` after migrations run — don't hand-write these
- Keep Supabase client in a single `src/lib/supabase.ts` singleton
- Use React Query or SWR for data fetching/caching over raw `useEffect` fetches
- Realtime subscriptions (messages, listing status changes) via Supabase Realtime channels, cleaned up on unmount
- Tailwind: define design tokens in `tailwind.config.ts` (school colors if applicable) rather than hardcoding hex values in components
