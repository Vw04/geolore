import type { Fact } from '../types/place';
import { getApiKey } from './keystore';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are a local lore guide — like a brilliant local friend who knows the hidden stories, drama, and surprising history behind nearby places.
Given Wikipedia articles, return ONLY a JSON array with one sub-array per article (same order), each with 2-3 facts.
Each fact must be a punchy talking point someone can say out loud to friends while walking past:
- Lead with the most dramatic or unexpected angle: battles, deaths, scandals, record-breaking feats, famous residents, pivotal discoveries, or bizarre coincidences
- Be specific: names, numbers, dates, outcomes, and why it matters
- Prefer the lesser-known story over the obvious summary
- Do NOT restate the place name — the card already shows it
- Do NOT open with "It is...", "Located in...", or generic description
- Correct capitalization and punctuation, no filler`;

const CATEGORY_LORE: Record<string, string> = {
  'History':            'For History: battles fought here, who won and lost, casualties, treaties signed, kingdoms that rose or fell.',
  'Science & Tech':     'For Science & Tech: discoveries or inventions made here, who made them, what changed as a result.',
  'Arts & Culture':     'For Arts & Culture: artists, writers, or architects who lived/worked here, masterpieces created, movements born.',
  'Music':              'For Music: musicians who lived, performed, or recorded here, famous concerts, cultural significance.',
  'Society & Politics': 'For Society & Politics: assassinations, protests, laws enacted, scandals, pivotal political events.',
  'Nature & Geography': 'For Nature & Geography: size, age, geological origin, records (highest, oldest, largest), ecological rarities.',
  'Trivia & Quirky':    'For Trivia & Quirky: bizarre coincidences, unexpected records, local legends, surprising historical connections.',
};

const synthesisCache = new Map<string, { facts: Fact[]; ts: number }>();
const SYNTHESIS_CACHE_TTL_MS = 30 * 60 * 1000;

export async function synthesizeFacts(facts: Fact[], interests: string[] = ['All']): Promise<Fact[]> {
  const API_KEY =
    (await getApiKey()) ?? process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
  if (!API_KEY) {
    console.log('[synthesis] No API key — skipping synthesis');
    return facts;
  }
  if (facts.length === 0) return facts;

  const cacheKey = [...facts.map((f) => f.pageId)].sort().join(',') +
    '|' + [...interests].sort().join(',');
  const hit = synthesisCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < SYNTHESIS_CACHE_TTL_MS) {
    console.log('[synthesis] cache hit');
    return hit.facts;
  }

  const interestClause =
    interests.length > 0 && !interests.includes('All')
      ? `\nFocus only on facts related to: ${interests.join(', ')}. If an article has no matching facts, return [] for that entry.\n` +
        interests.filter((i) => CATEGORY_LORE[i]).map((i) => CATEGORY_LORE[i]).join(' ')
      : '';
  const systemPrompt = SYSTEM_PROMPT + interestClause;

  const userContent = facts
    .map((f, i) => `Article ${i + 1} title: ${f.title}\nArticle ${i + 1} excerpt:\n${f.extract.slice(0, 300)}`)
    .join('\n\n---\n\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!res.ok) {
      console.log(`[synthesis] API error ${res.status} — using extracts`);
      return facts;
    }

    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? '';
    console.log('[synthesis] raw response:', text.slice(0, 200));

    // Claude sometimes wraps JSON in prose — extract the outermost array
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      console.log('[synthesis] No JSON array found in response — using extracts');
      return facts;
    }
    const parsed: unknown = JSON.parse(match[0]);

    if (!Array.isArray(parsed)) {
      console.log('[synthesis] Unexpected response shape — using extracts');
      return facts;
    }

    const hasInterestFilter = interests.length > 0 && !interests.includes('All');
    const synthesized = facts.flatMap((fact, i) => {
      const entry = parsed[i];
      if (Array.isArray(entry) && entry.length === 0 && hasInterestFilter) {
        console.log(`[synthesis] "${fact.title}" → filtered (no matching interests)`);
        return [];
      }
      if (!Array.isArray(entry) || entry.length === 0) return [fact];
      const synthesizedFacts = (entry as unknown[])
        .filter((s): s is string => typeof s === 'string')
        .slice(0, 5);
      console.log(`[synthesis] "${fact.title}" → ${synthesizedFacts.length} facts`);
      return [{ ...fact, synthesizedFacts }];
    });
    synthesisCache.set(cacheKey, { facts: synthesized, ts: Date.now() });
    return synthesized;
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[synthesis] ${isAbort ? 'timeout' : 'error'}: ${msg} — using extracts`);
    return facts;
  } finally {
    clearTimeout(timeout);
  }
}
