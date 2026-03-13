# Geolore

A personal, iPhone-first location-aware lore app. Point your phone at the world and receive punchy, lore-driven facts about nearby places — battles fought here, who lived here, what was invented here — delivered as notifications and displayed in a scrollable feed.

## Stack
- React Native + Expo SDK 54 (TypeScript)
- Wikipedia GeoSearch API (free, no key required)
- Claude Haiku (`claude-haiku-4-5-20251001`) for lore synthesis
- AsyncStorage for settings and API key persistence
- `expo-notifications` + `expo-task-manager` for background walk-around mode

## Repo Structure
```
/docs        — product spec, architecture, changelog
/app/mobile  — Expo React Native app
/data        — sample test coordinates
/prompts     — AI prompt templates (reference)
```

## Status
Phase 1 — Core pipeline live. Wikipedia → ranking → Claude synthesis → lore cards working end-to-end.

See [docs/CHANGELOG.md](docs/CHANGELOG.md) for full feature and architecture log.

## Quick Start
```bash
cd app/mobile
npm install
npx expo start
```

Set your Anthropic API key in the app's onboarding flow (stored locally, never transmitted except to Anthropic's API).

## Key Architecture

```
GPS coords
  → Wikipedia GeoSearch (3km radius, 200 results)
  → geographic diversity sampling (30 articles, 4 distance bands)
  → notability ranking + boring-POI filter (top 20)
  → Claude Haiku synthesis (lore-guide persona, per-category lenses)
  → fact cards with 30-min cache
```

See [docs/CHANGELOG.md](docs/CHANGELOG.md) for constants, tuning decisions, and architecture notes.
