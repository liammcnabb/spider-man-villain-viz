# Issue #20 Fix: Remove Character Index Links

## Problem

Characters like "Charlie" were being linked to generic Marvel Character Index pages (e.g., `https://marvel.fandom.com/wiki/Character_Index/C`) instead of specific character pages. These index pages are disambiguation pages that don't contain actual character information.

## Root Cause

The web scraper was extracting all links from Marvel Fandom antagonist lists without filtering out Character_Index URLs. When Marvel Fandom pages listed unnamed or minor characters, they would link to a character index entry with an anchor (e.g., `Character_Index/C#Charlie`), and these were being treated as valid character pages.

## Solution

Added a filter in the scraper to exclude any antagonist links that point to Character_Index pages.

### Changes Made

**File: `src/scraper/marvelScraper.ts`**

- Added a check to detect Character_Index URLs: `const isCharacterIndexPage = url && url.includes('/Character_Index/');`
- Modified the antagonist validation logic to exclude these entries
- The filter catches both plain Character_Index links (`/Character_Index/C`) and anchored ones (`/Character_Index/C#CharacterName`)

### Implementation Details

```typescript
// Filter out Character_Index URLs (generic disambiguation pages, not specific characters)
const isCharacterIndexPage = url && url.includes("/Character_Index/");

// Add to antagonists if valid and has a URL (named character)
// Exclude unnamed/unidentified/unknown characters and Character_Index pages
if (
  name &&
  name.length > 1 &&
  url &&
  !isUnnamedOrInvalidAntagonist(name) &&
  !isCharacterIndexPage
) {
  antagonists.push({ name, url });
}
```

## Verification

✅ **Before Fix:**

- "Charlie" linked to: `https://marvel.fandom.com/wiki/Character_Index/C`
- Multiple minor characters linked to generic character index pages

✅ **After Fix:**

- "Charlie" now links to: `https://marvel.fandom.com/wiki/Charles_Buchanan_(Earth-616)`
- All Character_Index references removed from villain data
- No Character_Index entries remain in processed data files

## Testing

- ✅ All existing tests pass (377 tests)
- ✅ TypeScript compilation successful
- ✅ Data re-scraped with new filter applied
- ✅ Pipeline completed successfully (scrape → process → merge → publish)
- ✅ Verified no Character_Index URLs in final villain data files

## Data Confirmation

- **Files processed:** Amazing Spider-Man Vol 1 (441 issues)
- **Total villains extracted:** 427 issues successfully scraped
- **Final data:** Published to `public/data/villains.json` and series-specific files
- **Character_Index entries:** 0 (none found in processed data)

## Impact

- Improved data quality by removing generic disambiguation links
- Character information is now more actionable with direct links to specific character pages
- Extends the pattern to handle all minor characters that might appear with Character_Index links

## Files Modified

- `src/scraper/marvelScraper.ts` - Added Character_Index filter
- `dist/src/scraper/marvelScraper.js` - Compiled JavaScript includes the fix

## Files Generated

- `data/raw.Amazing_Spider-Man_Vol_1.json` - Fresh raw scrape (without Character_Index links)
- `data/villains.Amazing_Spider-Man_Vol_1.json` - Processed villain data
- `data/villains.json` - Merged combined villain data
- `data/d3-config.*.json` - D3.js visualization configs
- `public/data/*` - Published data files
