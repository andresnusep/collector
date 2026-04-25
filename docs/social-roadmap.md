# Social / public-profile roadmap

Paused mid-plan, no code written yet. This is the resumable spec.

## Vision

Turn Kollector Studio into a public-facing portfolio for DJs. Each user gets
a public profile (Instagram-style) with three sections: DJ info, calendar,
and sets. Bookers and friends can view it without an account. DJs can
follow each other to keep tabs on what people are playing.

## Locked-in decisions

| Decision | Choice |
|---|---|
| Anon (signed-out) read of public content | **Yes** — bookers shouldn't have to sign up to view a profile |
| Default privacy for new + existing users | **Private** — opt-in to share, never auto-publish |
| Visibility tiers | **Two** (public / private), defer three-tier "followers-only" |
| Vanity URL slugs (`/u/andresdj`) | **Defer** — start with UUIDs (`/u/{user_id}`) |
| Different booker view vs friend view | **Defer** — one unified profile for v1 |
| Follow vs friend (mutual) model | **Follow** — asymmetric, no approval, like SoundCloud |

## Schema changes (one SQL block to paste into Supabase)

### New tables

**`gigs`** — calendar entity, decoupled from sets
```
id           uuid primary key
user_id      uuid references auth.users (not null)
played_at    timestamptz       — actual or planned date
venue        text
location     text              — city, country
set_id       uuid              — optional FK to saved_sets.id
notes        text
status       text              — 'upcoming' | 'played'
is_public    boolean default false
created_at   timestamptz default now()
updated_at   timestamptz default now()
```

**`follows`**
```
follower_id   uuid references auth.users
followed_id   uuid references auth.users
created_at    timestamptz default now()
primary key (follower_id, followed_id)
```

### Changes to existing tables

- `saved_sets.data` JSONB gets new field: `is_public: boolean` (default false)
- `profiles.data` JSONB gets new fields:
  - `is_discoverable: boolean` (controls user search)
  - `dj_name: string` (public display name, falls back to existing name)
  - `bio: string`
  - `links: { instagram, soundcloud, mixcloud, website }`

### RLS policies

For each public-readable table, ADD a policy alongside the existing
`user_id = auth.uid()` one:

```sql
-- Anyone (including anon) can read public sets
CREATE POLICY "public sets readable by all"
  ON saved_sets FOR SELECT
  USING ((data->>'is_public')::boolean = true);

-- Anyone can read public gigs
CREATE POLICY "public gigs readable by all"
  ON gigs FOR SELECT
  USING (is_public = true);

-- Anyone can read discoverable profiles
CREATE POLICY "discoverable profiles readable by all"
  ON profiles FOR SELECT
  USING ((data->>'is_discoverable')::boolean = true);

-- Anyone signed in can read follows (needed to render counts and lists)
CREATE POLICY "follows readable by authenticated"
  ON follows FOR SELECT TO authenticated
  USING (true);

-- A user can follow/unfollow only on their own behalf
CREATE POLICY "users manage their own follows"
  ON follows FOR ALL TO authenticated
  USING (follower_id = auth.uid())
  WITH CHECK (follower_id = auth.uid());
```

**Critical verification step:** before each phase ships, open the public
profile URL in a logged-out browser and confirm only `is_public = true`
content surfaces. The biggest risk in this whole project is a leaky policy.

## One-time migration

Existing users (just you and any beta testers) have a `gigs` array nested
inside each `saved_sets.data`. Migrate them to the new gigs table:

```sql
-- Pseudocode — actual migration goes through the client because gigs are
-- inside JSONB and need to be exploded. Easier path: write a one-shot
-- React effect that runs once per user (gated by a localStorage flag),
-- reads their saved_sets, inserts into gigs, then sets a "migrated" flag
-- on the profile to never run again.
```

## Phases

### Phase 1 — Schema + privacy plumbing
- Create `gigs` and `follows` tables in Supabase
- Add new fields to `saved_sets` and `profiles` JSONB
- Write all RLS policies with the dual public/private pattern
- Add migration code that backfills `gigs` from `saved_sets.gigs[]`
- Update `components/sync.jsx` with helpers for the new tables
- **Verify:** signed-out browser test of every policy

### Phase 2 — Calendar tab
- New "Calendar" item in the desktop sidebar workspace menu
- Mobile: new tab in the bottom nav (or merge into Sets — TBD)
- List view: upcoming gigs at top, past gigs below
- Add/edit gig modal: date, venue, location, optional set link, notes,
  public toggle
- Show calendar entries on the existing set detail (linked gigs)

### Phase 3 — Profile rebuild (Instagram-style)
- The current profile page becomes the **public-facing view**:
  - Header: photo, DJ name, bio, follower/following counts, social links
  - Three tabs: **DJ info / Calendar / Sets** (each filtered to public-only
    when viewed by someone other than the owner)
- "Edit profile" button (only visible on your own profile) opens a modal
  containing the current editable fields
- New public route: `/u/{user_id}` works for both signed-in and signed-out
- Hash-based routing or 404.html trick to make GitHub Pages handle it

### Phase 4 — Follow graph + discovery
- Follow / Unfollow button on other profiles
- "Following" feed in the sidebar showing recent gigs and sets from
  people you follow
- User search over `is_discoverable = true` profiles only
- Notifications later (deferred)

## Deferred (don't build until demand emerges)

- Three-tier visibility (public / followers-only / private) — only if
  users ask for "warm-up set" or "behind-the-scenes" sharing
- Vanity URL slugs — only when people start sharing profiles a lot
- Differentiated booker vs friend views (rate cards, available dates)
- Notifications (someone followed you, friend posted a gig)
- Blocking
- iCal / RSS feed of a DJ's calendar (great for promoter integration —
  could be a Phase 5 with low effort)
- Embeddable widget for a DJ's own website
- Custom avatar upload (currently relying on Google OAuth photo)

## Starting point next session

When we resume:
1. Re-read this file end to end
2. Confirm decisions still hold (especially anon read access)
3. Write Phase 1 schema + RLS + migration as a single SQL block + small
   client diff for new fields
4. User runs the SQL in Supabase, confirms RLS by opening a logged-out
   browser and checking `select * from saved_sets;` returns only public
   rows
5. Move to Phase 2 once Phase 1 is verified
