import type { Fact } from '../types/place';

const WIKI_API = 'https://en.wikipedia.org/w/api.php';

type GeoSearchEntry = {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  dist: number;
};

type PageData = {
  pageid: number;
  title: string;
  extract?: string;
  thumbnail?: { source: string };
  coordinates?: Array<{ lat: number; lon: number }>;
};

const RADIUS_STEPS = [3000, 8000, 20000];

const factCache = new Map<string, { facts: Fact[]; ts: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Spread results evenly across 4 distance bands so dense cities (Paris, Tokyo)
// don't return all articles within the nearest 500m.
function diverseSample(entries: GeoSearchEntry[], radius: number, limit = 30): GeoSearchEntry[] {
  const bandSize = radius / 4;
  const buckets: GeoSearchEntry[][] = [[], [], [], []];
  for (const e of entries) {
    const bi = Math.min(3, Math.floor(e.dist / bandSize));
    buckets[bi].push(e);
  }
  const perBand = Math.ceil(limit / 4);
  return buckets.flatMap((b) => b.slice(0, perBand)).slice(0, limit);
}

async function geoSearch(lat: number, lon: number, radius: number): Promise<GeoSearchEntry[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'geosearch',
    gscoord: `${lat}|${lon}`,
    gsradius: String(radius),
    gslimit: '200',
    format: 'json',
    origin: '*',
  });
  const res = await fetch(`${WIKI_API}?${params}`);
  if (!res.ok) throw new Error(`GeoSearch failed: ${res.status}`);
  const data = await res.json();
  return data.query?.geosearch ?? [];
}

async function nominatimFallback(lat: number, lon: number): Promise<GeoSearchEntry[]> {
  const revRes = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
    { headers: { 'User-Agent': 'Geolore/1.0' } }
  );
  if (!revRes.ok) return [];
  const revData = await revRes.json();
  const addr = revData.address ?? {};
  const areaName =
    addr.city ?? addr.town ?? addr.village ?? addr.county ?? addr.state ?? '';
  if (!areaName) return [];

  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: areaName,
    srlimit: '10',
    format: 'json',
    origin: '*',
  });
  const searchRes = await fetch(`${WIKI_API}?${params}`);
  if (!searchRes.ok) return [];
  const searchData = await searchRes.json();
  const results: Array<{ pageid: number; title: string }> =
    searchData.query?.search ?? [];

  return results.map((r) => ({
    pageid: r.pageid,
    title: r.title,
    lat,
    lon,
    dist: 0,
  }));
}

async function fetchPageDetails(pageIds: number[]): Promise<Record<number, PageData>> {
  const chunks: number[][] = [];
  for (let i = 0; i < pageIds.length; i += 20) {
    chunks.push(pageIds.slice(i, i + 20));
  }

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const params = new URLSearchParams({
        action: 'query',
        pageids: chunk.join('|'),
        prop: 'extracts|pageimages|coordinates',
        exintro: 'true',
        explaintext: 'true',
        exsentences: '10',
        pithumbsize: '200',
        format: 'json',
        origin: '*',
      });
      const res = await fetch(`${WIKI_API}?${params}`);
      if (!res.ok) return {} as Record<string, PageData>;
      const data = await res.json();
      return (data.query?.pages ?? {}) as Record<string, PageData>;
    })
  );

  const allPages: Record<number, PageData> = {};
  for (const pages of results) {
    for (const page of Object.values(pages)) {
      allPages[page.pageid] = page;
    }
  }
  return allPages;
}

export async function fetchNearbyFacts(lat: number, lon: number): Promise<Fact[]> {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = factCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    console.log(`[cache] hit for ${cacheKey}`);
    return cached.facts;
  }

  let geoEntries: GeoSearchEntry[] = [];
  let usedRadius = RADIUS_STEPS[0];
  for (const r of RADIUS_STEPS) {
    geoEntries = await geoSearch(lat, lon, r);
    usedRadius = r;
    if (geoEntries.length >= 5) break;
  }

  const sampledGeo = diverseSample(geoEntries, usedRadius, 50);

  let fallbackEntries: GeoSearchEntry[] = [];
  if (sampledGeo.length < 3) {
    fallbackEntries = await nominatimFallback(lat, lon);
  }

  const seen = new Set<number>();
  const entries = [...sampledGeo, ...fallbackEntries].filter((e) => {
    if (seen.has(e.pageid)) return false;
    seen.add(e.pageid);
    return true;
  });
  if (entries.length === 0) return [];

  const geoPageIds = new Set(sampledGeo.map((e) => e.pageid));
  const pageIds = entries.map((e) => e.pageid);
  const pageDetails = await fetchPageDetails(pageIds);

  const facts = entries.map((entry, idx) => {
    const page = pageDetails[entry.pageid];
    const wikiCoords = !geoPageIds.has(entry.pageid) ? page?.coordinates?.[0] : undefined;
    return {
      id: idx,
      pageId: entry.pageid,
      title: page?.title ?? entry.title,
      extract: page?.extract ?? '',
      distance: entry.dist,
      lat: wikiCoords?.lat ?? entry.lat,
      lon: wikiCoords?.lon ?? entry.lon,
      hasGeoData: geoPageIds.has(entry.pageid) || !!wikiCoords,
      sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page?.title ?? entry.title)}`,
      thumbnail: page?.thumbnail?.source,
    };
  });

  factCache.set(cacheKey, { facts, ts: Date.now() });
  return facts;
}

export async function reverseGeocodeLabel(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
      { headers: { 'User-Agent': 'Geolore/1.0' } }
    );
    if (!res.ok) return '';
    const data = await res.json();
    const addr = data.address ?? {};
    const sub = addr.neighbourhood ?? addr.suburb ?? '';
    const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? '';
    const region = addr.state ?? '';
    if (sub && city) return `${sub}, ${city}`;
    if (city && region) return `${city}, ${region}`;
    return city || region || '';
  } catch {
    return '';
  }
}
