# Changelog

All notable changes to Locartefact are documented here.
Format: `[date] type: summary` — types: `feat`, `fix`, `perf`, `refactor`, `docs`

---

## [2026-03-12] — Ranking, filtering, and synthesis performance overhaul

### feat: Geographic diversity sampling
- Added `diverseSample()` in `wikipedia.ts`: bins Wikipedia geoSearch results into 4 distance quartiles and samples proportionally (up to 30 total)
- Prevents results from clustering near the user's exact coordinate in dense cities (Paris, Tokyo, HK)
- Adaptive: sparse rural areas naturally use all available results; dense cities get spread across the full radius

### perf: Reduced Wikipedia fetch volume
- `diverseSample` limit: 50 → 30 articles (saves one parallel fetch chunk, ~200ms)
- `RANK_POOL`: 30 → 20 — fewer article details fetched; top-20 quality unchanged
- `fetchPageDetails` already uses `Promise.all` for parallel chunk fetching (implemented prior session)

### perf: Full synthesis coverage on first load
- Now synthesizes entire `RANK_POOL` (20 items) upfront instead of just `maxFacts` (5–10)
- All facts at every radius slider position show synthesized lore — no raw extracts ever shown
- `max_tokens` increased 1024 → 2048 to accommodate 20-item synthesis payloads

### perf: Synthesis caching
- `synthesisCache` in `synthesis.ts`: keyed on sorted pageIds + sorted interests, 30-min TTL
- Repeat refreshes at same location = instant return, zero Claude API credits used

### feat: Expanded boring/irrelevant POI filter (`ranking.ts`)
- Added patterns for: elementary/middle/high/secondary/prep schools, city hall, courthouse, fire/police stations, post offices, government buildings, car parks, commercial buildings, colleges
- `/\bcollege\b/i` catches HK-style secondary schools ("Wah Yan College") without blocking universities ("University of Hong Kong")

### feat: City/region article detection (`ranking.ts`)
- `isCityOrRegion()` checks the extract's opening sentence for "X is a city/town/municipality/country/region/..." patterns
- Filters out geographic overview articles (e.g. "Los Angeles", "Paris") that aren't useful as walking-tour POIs

### feat: Default radius 1km
- Changed from 2km to 1km — focuses on genuinely immediate surroundings

### feat: Display settings — sort order + max facts
- Settings screen: sort by "Closest Distance" or "Most Notable"
- Max facts slider: 1–10 (default 5)
- `DisplaySettings` type added to `keystore.ts`, persisted via AsyncStorage

---

## [2026-03-11] — Core pipeline, UI, and onboarding

### feat: Wikipedia fact pipeline
- `fetchNearbyFacts()`: geoSearch → fetchPageDetails (parallel) → `Fact[]`
- `RADIUS_STEPS = [3000, 8000, 20000]`: progressive fallback for sparse areas
- `gslimit: 200` for broad geographic coverage (Wikipedia max is 500)
- `nominatimFallback()` for coordinates with very few nearby Wikipedia articles

### feat: Claude Haiku synthesis
- `synthesizeFacts()` in `synthesis.ts`: transforms raw Wikipedia extracts into lore-driven talking points
- System prompt: "local lore guide" persona — battles, scandals, records, surprising history
- Per-category lore lenses via `CATEGORY_LORE` map (History, Science & Tech, Arts & Culture, Music, Society & Politics, Nature & Geography, Trivia & Quirky)
- Interest filtering: passes only relevant category lenses when user has non-All interests

### feat: Notability ranking
- `rankFacts()` in `ranking.ts`: scores by extract length (proxy for Wikipedia coverage depth)
- Filters: extract < 200 chars, disambiguation pages, `BORING_PATTERNS` (stations, hotels, highways, etc.)

### feat: Onboarding flow
- WelcomeScreen → ApiKeyScreen → InterestsScreen
- API key stored in AsyncStorage via `keystore.ts`
- Interest selection persisted; passed to synthesis filter

### feat: Walk-around mode (background notifications)
- `walkAround.ts`: periodic background task using `expo-task-manager`
- Configurable frequency (1/5/10/30 min) and bullet count (1–3 facts per notification)
- Notification tap brings user to main feed

### feat: Brand design system
- Dark forest palette: `#0D2218` background, `#2A9D8F` teal accent, `#FFFFF0` cream text
- SVG `BrandLogo` component with responsive size prop
- Full settings modal with hamburger trigger
- Dev bar: sample coordinates for Tokyo, Paris, Moscow, Los Angeles, Miami, Hong Kong

---

## Architecture Notes

### Data flow (every refresh)
```
GPS / dev tap
  → fetchNearbyFacts(lat, lon)           [wikipedia.ts]
      geoSearch (radius 3km, gslimit 200)
      → diverseSample (30 geographically spread)
      → fetchPageDetails (parallel, 2 chunks)
      → Fact[]
  → rankFacts(rawFacts, 20)              [ranking.ts]
      filter: boring patterns, city/region detect, extract length
      score: extract.length / 2000
      return top 20
  → synthesizeFacts(ranked, interests)   [synthesis.ts]
      synthesisCache check (30-min TTL)
      → Claude Haiku (claude-haiku-4-5-20251001)
         system: lore guide persona + category lenses
         max_tokens: 2048
      return Fact[] with synthesizedFacts[]
  → setFacts(merged)                     [App.tsx]
  → displayedFacts: filter by radius → sort → slice(maxFacts)
```

### Key constants
| Constant | Value | Location |
|---|---|---|
| `RADIUS_STEPS` | `[3000, 8000, 20000]` | wikipedia.ts |
| `gslimit` | `200` | wikipedia.ts |
| `diverseSample limit` | `30` | wikipedia.ts |
| `RANK_POOL` | `20` | App.tsx |
| `CACHE_TTL_MS` | `30 min` | wikipedia.ts, synthesis.ts |
| `max_tokens` | `2048` | synthesis.ts |
| Default radius | `1000m` | App.tsx |
| Default maxFacts | `5` | keystore.ts |
