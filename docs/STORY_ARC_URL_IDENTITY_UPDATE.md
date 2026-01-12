# Story Arc URL-Based Identity Update

**Date**: 2026-01-12  
**Status**: Specifications Updated  
**Related**: Both Scraping Enhancement Specifications

---

## What Changed

Story arcs now use **Marvel Fandom category URLs as the primary key**, following the project's established identity pattern for characters.

### Before

```typescript
storyArcs: ["clone-saga", "power-and-responsibility"]; // ID-only
```

### After

```typescript
storyArcs: [
  {
    url: "https://marvel.fandom.com/wiki/Category:Clone_Saga",
    id: "clone-saga",
    name: "Clone Saga",
  },
];
```

---

## Identity Structure

| Field  | Purpose                                      | Example                                              |
| ------ | -------------------------------------------- | ---------------------------------------------------- |
| `url`  | **Primary Key** - Marvel Fandom category URL | `https://marvel.fandom.com/wiki/Category:Clone_Saga` |
| `id`   | Derived identifier - URL-safe                | `clone-saga`                                         |
| `name` | Display name - Human readable                | `Clone Saga`                                         |

---

## Why URLs as Primary Keys?

1. **Uniqueness**: URLs uniquely identify story arcs across Marvel Fandom
2. **Authority**: Direct link to official source
3. **Consistency**: Matches character identity handling in project
4. **Reconciliation**: No ambiguity with naming variations
5. **Extensibility**: Enables direct linking to arc documentation

---

## Affected Interfaces

### StoryArc

```typescript
export interface StoryArc {
  url: string; // Primary key (required)
  id: string; // Derived from URL slug
  name: string; // Display name
  type?: ArcType;
  issues: number[];
  series?: string[];
  startIssue?: number;
  endIssue?: number;
  issueCount: number;
}
```

### IssueData.storyArcs

```typescript
storyArcs?: Array<{
  url: string;         // Primary key
  id: string;          // Derived
  name: string;        // Display
}>
```

### TimelineData.storyArcs

```typescript
storyArcs?: Array<{
  url: string;         // Primary key
  id: string;          // Derived
  name: string;        // Display
}>
```

### D3Config.arcs

```typescript
arcs?: Array<{
  url: string;         // Primary key
  id: string;
  name: string;
  startIssue: number;
  endIssue: number;
  color?: string;
}>
```

---

## Implementation Impact

### Scraping (`parseStoryArcs`)

- **Before**: Extracted category name, generated ID
- **After**: Extract full URL, derive ID from URL slug
- **Change**: Captures `href="/wiki/Category:X"` → full URL

### Processing (`buildStoryArcs`)

- **Before**: Keyed by arc ID
- **After**: Keyed by arc URL
- **Change**: Uses URL as Map key instead of generated ID

### Merging (`mergeStoryArcs`)

- **Before**: Merged arcs by matching IDs
- **After**: Merged arcs by matching URLs
- **Change**: URL-based deduplication across series

### Configuration (`generateD3Config`)

- **Before**: Arc indexed by ID
- **After**: Arc includes URL for direct linking
- **Change**: Uses URL for consistent color hashing

---

## Data Flow Example

### Scraping

```
Page HTML Categories:
━━━━━━━━━━━━━━━━━━━━
<a href="/wiki/Category:Clone_Saga">Clone Saga</a>

            ↓ Extract

Issue Data:
━━━━━━━━━━━
{
  url: "https://marvel.fandom.com/wiki/Category:Clone_Saga",
  id: "clone-saga",
  name: "Clone Saga"
}
```

### Processing

```
Issue Data (Multiple Issues):
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue #117: { url: "...Category:Clone_Saga", ... }
Issue #118: { url: "...Category:Clone_Saga", ... }
Issue #394: { url: "...Category:Clone_Saga", ... }

            ↓ Aggregate by URL

Story Arc:
━━━━━━━━━
{
  url: "https://marvel.fandom.com/wiki/Category:Clone_Saga",
  id: "clone-saga",
  name: "Clone Saga",
  issues: [117, 118, 394, ...],
  issueCount: 3
}
```

### Merging

```
Series 1: { url: "...Category:Clone_Saga", issues: [117, 118, ...] }
Series 2: { url: "...Category:Clone_Saga", issues: [394, 395, ...] }

            ↓ Merge by URL

Merged Arc:
━━━━━━━━━
{
  url: "https://marvel.fandom.com/wiki/Category:Clone_Saga",
  issues: [117, 118, 394, 395, ...],
  series: ["Web of Spider-Man Vol 1", "Amazing Spider-Man Vol 1"]
}
```

---

## Updated Specifications

All scraping enhancement specifications have been updated:

1. **[STORY_ARC_SPEC.md](./STORY_ARC_SPEC.md)** ✅
   - Updated StoryArc interface with URL primary key
   - Updated parseStoryArcs() to capture URLs
   - Updated buildStoryArcs() for URL-based keying
   - Updated mergeStoryArcs() for URL-based merging
   - Updated D3 config with URLs
   - Updated example outputs with URLs

2. **[APPEARANCE_METADATA_SPEC.md](./APPEARANCE_METADATA_SPEC.md)** ✅
   - Cross-references updated to reflect story arc URL changes
   - No changes to appearance metadata (separate feature)

3. **[SCRAPING_ENHANCEMENTS_SUMMARY.md](./SCRAPING_ENHANCEMENTS_SUMMARY.md)** ✅
   - Summary remains valid (implementation details in detailed specs)

4. **[SCRAPING_ENHANCEMENTS_VISUAL.md](./SCRAPING_ENHANCEMENTS_VISUAL.md)** ✅
   - Updated data flow diagrams with URL-based arcs
   - Updated example outputs with URLs
   - Updated data structure comparison

5. **[SCRAPING_ENHANCEMENTS_QUICKREF.md](./SCRAPING_ENHANCEMENTS_QUICKREF.md)** ✅
   - Updated arc types showing URL fields
   - Updated example outputs with URLs
   - Updated validation examples

---

## Key Files to Update During Implementation

```
src/types.ts
├── StoryArc interface
├── IssueData interface
├── TimelineData interface
├── D3DataPoint interface
└── D3Config interface

src/scraper/marvelScraper.ts
├── parseStoryArcs() - capture URLs
└── createArcIdFromUrl() - derive ID from URL

src/utils/processVillainData.ts
├── buildStoryArcs() - keyed by URL
└── Update timeline generation

src/utils/mergeSeriesData.ts
├── mergeStoryArcs() - URL-based deduplication

src/utils/d3ConfigGenerator.ts
├── generateD3Config() - include URLs
└── assignArcColor() - hash URLs consistently
```

---

## Testing Considerations

### Unit Tests

```typescript
// Verify URL extraction
expect(arc.url).toBe("https://marvel.fandom.com/wiki/Category:Clone_Saga");

// Verify ID derivation
expect(arc.id).toBe("clone-saga");

// Verify URL-based deduplication
const mergedArcs = mergeStoryArcs([series1, series2]);
expect(mergedArcs).toHaveLength(1); // Same URL → 1 arc
```

### Integration Tests

```typescript
// Verify URL persistence through pipeline
const scraped = await scraper.scrapeIssues([117]);
const processed = processVillainData(scraped);
const config = generateD3Config(processed);

expect(config.arcs?.[0]?.url).toBe(scraped.issues[0].storyArcs?.[0]?.url);
```

---

## Migration Notes

**No data migration required** - this is a specification-phase change.

When implementation begins:

- New code will generate URL-based story arcs
- Existing villain data is unaffected
- No breaking changes to processed villain data structures

---

## Related Documentation

- [STORY_ARC_SPEC.md](./STORY_ARC_SPEC.md) - Complete technical specification
- [APPEARANCE_METADATA_SPEC.md](./APPEARANCE_METADATA_SPEC.md) - Related feature
- [SCRAPING_ENHANCEMENTS_SUMMARY.md](./SCRAPING_ENHANCEMENTS_SUMMARY.md) - Implementation overview
- [SCRAPING_ENHANCEMENTS_VISUAL.md](./SCRAPING_ENHANCEMENTS_VISUAL.md) - Visual diagrams

---

## Summary

Story arcs now follow the project's established pattern: **URLs as primary identity keys**. This ensures consistency with character handling and provides direct links to official Marvel Fandom sources. All specifications have been updated to reflect this approach.

**Ready for implementation!** 🚀
