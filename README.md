# Geolore

A personal, iPhone-first location-aware fact app. Turn on tracking and receive short, educational facts about nearby places delivered through notifications and stored in a feed.

## Stack
- React Native + Expo (TypeScript)
- Supabase (Postgres)
- Wikipedia GeoSearch / Wikidata / OSM

## Repo Structure
```
/docs        — product spec, architecture, policies
/app/mobile  — Expo React Native app
/supabase    — migrations and edge functions
/data        — categories, test locations, source config
/prompts     — AI prompt templates for fact rewriting
/scripts     — dev/test utilities
```

## Status
Phase 0 — Project setup and scaffolding.

## Quick Start
```bash
cd app/mobile
npm install
npx expo start
```
