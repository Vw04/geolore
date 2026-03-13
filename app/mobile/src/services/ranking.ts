import type { Fact } from '../types/place';

const BORING_PATTERNS = [
  /\bstation\b/i,
  /\bline\b.*\b(railway|rail|metro|subway)\b/i,
  /\bexpressway\b/i,
  /\bhighway\b/i,
  /\bfreeway\b/i,
  /\btunnel\b/i,
  /\bhotel\b/i,
  /\bresort\b/i,
  /\bshopping (mall|centre|center|plaza)\b/i,
  /\bapartment\b/i,
  /\boffice (building|tower|complex)\b/i,
  // Schools (primary/secondary — universities stay if notable)
  /\belementary school\b/i,
  /\b(middle|junior high|junior secondary)\s+school\b/i,
  /\bhigh school\b/i,
  /\bsecondary school\b/i,
  /\bprep(aratory)?\s+school\b/i,
  // Government / municipal
  /\bcity hall\b/i,
  /\bcourthouse\b/i,
  /\b(fire|police)\s+station\b/i,
  /\bpost office\b/i,
  /\bgovernment\s+(building|office|complex|centre|center)\b/i,
  // Generic structures
  /\bcar park\b/i,
  /\bparking\s+(garage|lot|structure)\b/i,
  /\bcommercial\s+building\b/i,
  /\bcollege\b/i,
];

// Detect city/region/country articles (e.g. "Los Angeles", "Paris") via extract opening
const GEO_ENTITY_RE = /^[^.]{0,120}\bis\s+(a|an|the)\s+(city|town|village|municipality|county|state|province|country|region|district|borough|prefecture|ward|arrondissement|commune|capital)\b/i;

function isBoring(title: string): boolean {
  return BORING_PATTERNS.some((p) => p.test(title));
}

function isCityOrRegion(extract: string): boolean {
  return GEO_ENTITY_RE.test(extract.slice(0, 200));
}

export function rankFacts(facts: Fact[], maxResults = 10): Fact[] {
  const filtered = facts.filter(
    (f) =>
      f.extract.length >= 200 &&
      !f.title.includes('(disambiguation)') &&
      !isBoring(f.title) &&
      !isCityOrRegion(f.extract)
  );

  const scored = filtered.map((f) => {
    const notabilityScore = Math.min(1, f.extract.length / 2000);
    console.log(`[ranking] ${f.title}: notability=${notabilityScore.toFixed(3)}`);
    return { fact: f, score: notabilityScore };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, maxResults).map((s) => s.fact);
}
