/**
 * Story Arc Extraction Utility
 * 
 * Extracts story arc information from Marvel Fandom page categories
 * Example category: href="/wiki/Category:Clone_Saga" → Clone Saga
 */

import type { StoryArc } from '../types';

const MARVEL_FANDOM_BASE = 'https://marvel.fandom.com';

/**
 * Category patterns to filter out (these are NOT story arcs)
 */
const EXCLUDED_CATEGORIES = new Set([
  'Comics',
  'Marvel Database',
  'Images',
  'Pages',
  'Articles',
  'Characters',
  'Items',
  'Locations',
  'Organizations',
  'Races',
  'Vehicles',
  'Weapons',
  'Events',
  'Earth-616',
  'Spider-Man',
  'Peter Parker',
  'Published in',
  'Cover by',
  'Written by',
  'Art by',
  'Penciled by',
  'Inked by',
  'Colored by',
  'Lettered by',
  'Edited by',
  'Humans',
  'Earth',
  'North America',
  'United States of America',
  'New York',
  'New York City',
  'Manhattan',
  'Queens',
  'Pigeons',
  'Cats',
  'Amoebas'
]);

/**
 * Checks if a category name should be excluded from story arc extraction
 * 
 * @param categoryName - The category display name
 * @returns true if category should be excluded
 */
function shouldExcludeCategory(categoryName: string): boolean {
  // Check exact matches
  if (EXCLUDED_CATEGORIES.has(categoryName)) {
    return true;
  }
  
  // Check patterns (starts with, contains, etc.)
  if (categoryName.startsWith('Published in ')) return true;
  if (categoryName.includes('Cover by ')) return true;
  if (categoryName.includes('Written by ')) return true;
  if (categoryName.includes('Art by ')) return true;
  if (categoryName.includes('Penciled by ')) return true;
  if (categoryName.includes('Inked by ')) return true;
  if (categoryName.includes('Colored by ')) return true;
  if (categoryName.includes('Lettered by ')) return true;
  if (categoryName.includes('Edited by ')) return true;
  if (categoryName.includes('/Appearances')) return true;
  if (categoryName.includes('/Mentions')) return true;
  if (categoryName.includes('/Quotes')) return true;
  if (categoryName.includes('/Images')) return true;
  if (categoryName.includes('/Reprints')) return true;
  if (categoryName.includes('Editor-in-Chief')) return true;
  if (categoryName.includes('Cover Artist')) return true;
  if (categoryName.includes('Released in ')) return true;
  if (categoryName.includes('Cover Date')) return true;
  if (categoryName.includes('Week ')) return true;
  if (categoryName.includes('Street')) return true;
  if (categoryName.includes('Avenue')) return true;
  if (categoryName.includes('Building')) return true;
  if (categoryName.includes('High School')) return true;
  if (categoryName.includes("'s Suit")) return true;
  if (categoryName.includes("'s House")) return true;
  if (categoryName.includes('%27s ')) return true; // URL-encoded apostrophe for possessives
  if (categoryName.endsWith(' Comics')) return true;
  if (categoryName.endsWith(' Images')) return true;
  if (categoryName.match(/Vol \d+$/)) return true; // Series volumes
  if (categoryName.match(/Vol \d+ \d+$/)) return true; // Issue pages
  if (categoryName.match(/\(Earth-\d+\)/)) return true; // Character-specific
  if (categoryName.match(/\(Homo \w+\)/)) return true; // Species
  if (categoryName.match(/\.jpg$/i)) return true; // Image files
  if (categoryName.includes(' (State)')) return true; // US States
  
  // Filter creator names when they appear as categories
  const creatorKeywords = ['Lee', 'Ditko', 'Romita', 'Conway', 'Kane', 'Andru', 'Rosen'];
  if (creatorKeywords.some(creator => categoryName.includes(creator))) return true;
  
  // Filter generic location/item categories
  const genericKeywords = ['Bank', 'Hill', 'House', 'Suit', 'Shooters', 'Signal'];
  if (genericKeywords.some(keyword => categoryName.includes(keyword))) return true;
  
  return false;
}

/**
 * Derives URL-safe ID from arc display name or URL
 * Example: "Clone Saga (Event)" → "clone-saga-event"
 * Example: "Power and Responsibility" → "power-and-responsibility"
 * 
 * @param input - Display name or URL
 * @returns URL-safe identifier
 */
export function deriveArcIdFromUrl(input: string): string {
  let categoryName = input;
  
  // If it's a URL, extract the article/page name
  if (input.includes('/wiki/')) {
    const match = input.match(/\/wiki\/([^/#?]+)/);
    if (match) {
      categoryName = match[1];
    }
  }
  
  // Convert to lowercase and replace underscores/spaces/parentheses with hyphens
  return categoryName
    .replace(/[\s_()]/g, '-') // Replace spaces, underscores, parentheses with hyphens
    .toLowerCase()
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
}

/**
 * Converts category name to display name
 * Example: "Clone_Saga" → "Clone Saga"
 * 
 * @param categoryName - Category name from URL
 * @returns Human-readable display name
 */
export function categoryNameToDisplayName(categoryName: string): string {
  return categoryName.replace(/_/g, ' ');
}

/**
 * Normalizes category URL to full absolute URL
 * 
 * @param categoryUrl - Category URL (relative or absolute)
 * @returns Full absolute URL
 */
export function normalizeArcUrl(categoryUrl: string): string {
  if (categoryUrl.startsWith('http')) {
    return categoryUrl;
  }
  
  if (categoryUrl.startsWith('/')) {
    return `${MARVEL_FANDOM_BASE}${categoryUrl}`;
  }
  
  return `${MARVEL_FANDOM_BASE}/wiki/${categoryUrl}`;
}

/**
 * Extracts story arcs from Marvel Fandom infobox section
 * Targets the specific infobox div with story arc references (not category links throughout page)
 * 
 * @param html - HTML content of the issue page
 * @param _issueNumber - Issue number (for logging, currently unused)
 * @returns Array of StoryArc objects
 */
export function extractStoryArcsFromHtml(html: string, _issueNumber: number): StoryArc[] {
  const storyArcs: StoryArc[] = [];
  const seenUrls = new Set<string>();
  
  // Find the infobox section (portable-infobox)
  const infoboxMatch = html.match(
    /<aside[^>]*class="[^"]*portable-infobox[^"]*"[^>]*>([\s\S]*?)<\/aside>/
  );
  
  if (!infoboxMatch) {
    return storyArcs;
  }
  
  const infoboxHtml = infoboxMatch[1];
  
  // Within the infobox, find data blocks and extract arcs from those that contain "Part of the"
  const dataBlockRegex = /<div[^>]*class="[^"]*pi-item\s+pi-data\s+pi-item-spacing\s+pi-border-color[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = dataBlockRegex.exec(infoboxHtml)) !== null) {
    const blockHtml = blockMatch[1];
    const valueMatch = blockHtml.match(/<div[^>]*class="[^"]*pi-data-value[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (!valueMatch) continue;

    const valueHtml = valueMatch[1];
    if (!/Part of the/i.test(valueHtml)) continue;

      const linkPattern = /<a[^>]+href=\"([^\"]*\/wiki\/[^\"]+)\"[^>]*>(.*?)<\/a>/g;
    let match: RegExpExecArray | null;
    while ((match = linkPattern.exec(valueHtml)) !== null) {
      const href = match[1];

      if (!/\/wiki\//.test(href)) continue;
      if (/\/wiki\/Category:/.test(href)) continue;

      const fullUrl = normalizeArcUrl(href);
      if (seenUrls.has(fullUrl)) continue;
      seenUrls.add(fullUrl);

        let displayName = (match[2] || '').trim();
        if (!displayName) {
          const urlName = href.split('/').pop() || '';
          displayName = urlName.replace(/_/g, ' ').replace(/\([^)]*\)/, '').trim();
        }

      if (shouldExcludeCategory(displayName)) continue;

      const arcId = deriveArcIdFromUrl(displayName.includes('/wiki/') ? href : displayName);
      if (arcId) {
        storyArcs.push({ url: fullUrl, id: arcId, name: displayName });
      }
    }
  }

  // Fallback/Complement: Some pages (especially older issues) render a top-of-page banner
  // like: "Part of the <a ...>End of Spider-Man</a> arc" outside the infobox.
  // Capture arcs from the first such banner occurrence if present.
  try {
    const bannerMatch = html.match(/Part of the[\s\S]{0,600}?(?:storyline|arc)/i);
    if (bannerMatch) {
      const snippet = bannerMatch[0];
      const linkPattern = /<a[^>]+href=\"([^\"]*\/wiki\/[^\"]+)\"[^>]*>(.*?)<\/a>/g;
      let lm: RegExpExecArray | null;
      while ((lm = linkPattern.exec(snippet)) !== null) {
        const href = lm[1];
        const anchorText = lm[2] || '';
        if (!/\/wiki\//.test(href)) continue;
        if (/\/wiki\/Category:/.test(href)) continue; // ignore category links here

        const fullUrl = normalizeArcUrl(href);
        if (seenUrls.has(fullUrl)) continue;
        seenUrls.add(fullUrl);

        let displayName = anchorText.trim();
        if (!displayName) {
          const urlName = href.split('/').pop() || '';
          displayName = urlName.replace(/_/g, ' ').replace(/\([^)]*\)/, '').trim();
        }

        if (shouldExcludeCategory(displayName)) continue;
        const arcId = deriveArcIdFromUrl(displayName.includes('/wiki/') ? href : displayName);
        if (arcId) {
          storyArcs.push({ url: fullUrl, id: arcId, name: displayName });
        }
      }
    }
  } catch {
    // ignore banner parsing errors; infobox extraction remains primary source
  }
  
  return storyArcs;
}

/**
 * Infers arc type based on name patterns and metadata
 * This is a heuristic approach; accurate type requires manual categorization
 * 
 * @param arc - Story arc object
 * @returns Inferred arc type
 */
export function inferArcType(arc: StoryArc): StoryArc['type'] {
  const nameLower = arc.name.toLowerCase();
  
  // Saga indicators
  if (nameLower.includes('saga')) {
    return 'saga';
  }
  
  // Event indicators (major crossovers)
  const eventKeywords = ['war', 'crisis', 'invasion', 'infinity', 'secret wars', 'civil war'];
  if (eventKeywords.some(keyword => nameLower.includes(keyword))) {
    return 'event';
  }
  
  // Crossover indicators
  if (nameLower.includes('crossover')) {
    return 'crossover';
  }
  
  // Double issue indicators
  if (nameLower.includes('part') && (nameLower.includes('1') || nameLower.includes('2'))) {
    return 'double';
  }
  
  // Default to arc
  return 'arc';
}
