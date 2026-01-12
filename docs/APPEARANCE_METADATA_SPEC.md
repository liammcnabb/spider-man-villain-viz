# Appearance Metadata Specification

**Feature**: Extract and store appearance metadata from character listings  
**Status**: Specification Phase  
**Created**: 2026-01-12  
**Related Features**: Story Arc/Saga Tracking

---

## Overview

Marvel Fandom character listings often include parenthetical metadata after character names that provide important context about their appearance in that issue. This specification defines how to extract, store, and utilize this metadata for enhanced visualization.

### Examples from Marvel Fandom

```
Lucky Lobo ⏵ (First appearance chronologically)
Mutantmen (First appearance) (Destroyed)
Burglar (Final appearance; dies) (Appears in flashback)
Green Goblin (Mentioned only)
Doctor Octopus (Behind the scenes) (Voice only)
```

---

## Phase 1: Priority Metadata (Initial Implementation)

### Metadata Types to Capture

| Category              | Patterns to Match                                   | Priority | Notes                                      |
| --------------------- | --------------------------------------------------- | -------- | ------------------------------------------ |
| **First Appearance**  | `First appearance`, `Debut`, `1st appearance`       | HIGH     | Most valuable for timeline visualization   |
| **Death/Killed**      | `dies`, `killed`, `death`, `deceased`               | HIGH     | Major story event                          |
| **Final Appearance**  | `Final appearance`, `Last appearance`, `Last seen`  | HIGH     | Character arc completion                   |
| **Mentioned Only**    | `Mentioned`, `Mentioned only`, `Referenced`         | MEDIUM   | Distinguishes physical vs. verbal presence |
| **Behind the Scenes** | `Behind the scenes`, `Off-panel`, `Off-screen`      | MEDIUM   | Indicates unseen presence                  |
| **Flashback**         | `Flashback`, `In flashback`, `Appears in flashback` | MEDIUM   | Non-chronological appearance               |
| **Cameo**             | `Cameo`, `Cameo appearance`                         | MEDIUM   | Brief/minor appearance                     |
| **Voice Only**        | `Voice only`, `Voice`, `Heard only`                 | MEDIUM   | Audio-only presence                        |

### Metadata Not Captured (Phase 1)

All other parenthetical metadata should be:

1. **Logged** to a separate file for review (`logs/uncaptured-metadata.json`)
2. **Preserved** in raw data for future enhancement
3. **Documented** with issue number and character name for analysis

Example uncaptured metadata:

- Chronological qualifiers: `(First appearance chronologically)`
- Status: `(Destroyed)`, `(Deceased)`, `(Resurrected)`
- Identity: `(Unmasked)`, `(In disguise as X)`
- Reality: `(Vision)`, `(Illusion)`, `(Simulation)`

---

## Data Structure Changes

### 1. Enhanced `Antagonist` Interface

**File**: `src/types.ts`

```typescript
export interface AppearanceMetadata {
  firstAppearance?: boolean; // "First appearance"
  firstAppearanceChronological?: boolean; // "First appearance chronologically"
  finalAppearance?: boolean; // "Final appearance"
  death?: boolean; // "dies", "killed"
  mentionedOnly?: boolean; // "Mentioned only"
  behindTheScenes?: boolean; // "Behind the scenes"
  flashback?: boolean; // "Appears in flashback"
  cameo?: boolean; // "Cameo appearance"
  voiceOnly?: boolean; // "Voice only"

  // Store raw metadata text for future processing
  rawMetadata?: string[]; // All parenthetical strings
  uncategorized?: string[]; // Metadata not matching known patterns
}

export interface Antagonist {
  name: string;
  url?: string;
  imageUrl?: string;
  kind?: EntityKind;
  metadata?: AppearanceMetadata; // NEW: appearance metadata
}
```

### 2. Enhanced `ProcessedVillain` Interface

```typescript
export interface ProcessedVillain {
  id: string;
  name: string;
  names: string[];
  url?: string;
  imageUrl?: string;
  identitySource: "url" | "name";
  firstAppearance: number;
  appearances: number[];
  frequency: number;
  kind?: EntityKind;

  // NEW: Appearance-level metadata indexed by issue number
  appearanceMetadata?: {
    [issueNumber: number]: AppearanceMetadata;
  };
}
```

### 3. Enhanced Timeline Data

```typescript
export interface TimelineData {
  issue: number;
  releaseDate?: string;
  series?: string;
  chronologicalPosition?: number;
  chronologicalPlacementHint?: string;
  villains: ProcessedVillain[];
  villainCount: number;
  groups?: GroupAppearance[];

  // NEW: Aggregate metadata for quick access
  notableEvents?: {
    firstAppearances: string[]; // Villain names/IDs with first appearance
    deaths: string[]; // Villain names/IDs who die
    finalAppearances: string[]; // Villain names/IDs with final appearance
  };
}
```

---

## Scraping Implementation

### Location

**File**: `src/scraper/marvelScraper.ts`

### Changes to `parseAntagonistsFromHtml()`

**Current Logic** (lines 430-470):

```typescript
// Extract character name and URL
let name = "";
let url = "";

if (links.length === 1) {
  const link = links.first();
  name = link.text().trim();
  url = link.attr("href") || "";
}
```

**Enhanced Logic**:

```typescript
// Extract character name, URL, and metadata
let name = "";
let url = "";
let rawText = $li.text().trim(); // Full text including metadata

// ... existing link extraction logic ...

// Extract metadata from parenthetical expressions
const metadata = this.extractAppearanceMetadata(rawText, name);

// Add to antagonists with metadata
if (
  name &&
  name.length > 1 &&
  url &&
  !isUnnamedOrInvalidAntagonist(name) &&
  !isCharacterIndexPage
) {
  antagonists.push({
    name,
    url,
    metadata: metadata.metadata,
  });

  // Log uncaptured metadata for future review
  if (metadata.uncaptured.length > 0) {
    this.logUncapturedMetadata(issueNumber, name, metadata.uncaptured);
  }
}
```

### New Helper Method: `extractAppearanceMetadata()`

```typescript
/**
 * Extracts appearance metadata from parenthetical text
 *
 * @param fullText - Complete text from <li> element (includes character name and parenthetical metadata)
 * @param characterName - Extracted character name (to remove from text)
 * @returns Object with parsed metadata and uncaptured strings
 *
 * @example
 * Input: "Burglar (Final appearance; dies) (Appears in flashback)"
 * Output: {
 *   metadata: { finalAppearance: true, death: true, flashback: true },
 *   uncaptured: []
 * }
 */
private extractAppearanceMetadata(
  fullText: string,
  characterName: string
): {
  metadata: AppearanceMetadata;
  uncaptured: string[];
} {
  const metadata: AppearanceMetadata = {
    rawMetadata: []
  };
  const uncaptured: string[] = [];

  // Remove character name to isolate metadata
  let metadataText = fullText.replace(characterName, '').trim();

  // Remove navigation symbols (⏵, arrows, etc.)
  metadataText = metadataText.replace(/[⏴⏵◀▶→←↑↓]/g, '').trim();

  // Extract all parenthetical expressions
  const parentheticalRegex = /\(([^)]+)\)/g;
  const matches = [...metadataText.matchAll(parentheticalRegex)];

  for (const match of matches) {
    const content = match[1].trim();
    metadata.rawMetadata!.push(content);

    // Check against known patterns (case-insensitive)
    const lowerContent = content.toLowerCase();
    let categorized = false;

    // First appearance patterns
    if (lowerContent.includes('first appearance')) {
      if (lowerContent.includes('chronologically')) {
        metadata.firstAppearanceChronological = true;
      } else {
        metadata.firstAppearance = true;
      }
      categorized = true;
    }

    // Final appearance patterns
    if (lowerContent.includes('final appearance') || lowerContent.includes('last appearance')) {
      metadata.finalAppearance = true;
      categorized = true;
    }

    // Death patterns
    if (lowerContent.match(/\b(dies|killed|death)\b/)) {
      metadata.death = true;
      categorized = true;
    }

    // Mentioned only
    if (lowerContent.includes('mentioned')) {
      metadata.mentionedOnly = true;
      categorized = true;
    }

    // Behind the scenes
    if (lowerContent.includes('behind the scenes') || lowerContent.includes('off-panel')) {
      metadata.behindTheScenes = true;
      categorized = true;
    }

    // Flashback
    if (lowerContent.includes('flashback')) {
      metadata.flashback = true;
      categorized = true;
    }

    // Cameo
    if (lowerContent.includes('cameo')) {
      metadata.cameo = true;
      categorized = true;
    }

    // Voice only
    if (lowerContent.includes('voice only') || lowerContent.includes('voice')) {
      metadata.voiceOnly = true;
      categorized = true;
    }

    // If not categorized, mark as uncaptured
    if (!categorized) {
      uncaptured.push(content);
    }
  }

  // Store uncategorized metadata
  if (uncaptured.length > 0) {
    metadata.uncategorized = uncaptured;
  }

  // Clean up if no metadata found
  if (metadata.rawMetadata!.length === 0) {
    delete metadata.rawMetadata;
  }

  return { metadata, uncaptured };
}
```

### Uncaptured Metadata Logging

```typescript
/**
 * Logs uncaptured metadata for future analysis
 * Creates/appends to logs/uncaptured-metadata.json
 */
private logUncapturedMetadata(
  issueNumber: number,
  characterName: string,
  uncapturedStrings: string[]
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    series: this.currentSeries.titlePrefix,
    issue: issueNumber,
    character: characterName,
    uncaptured: uncapturedStrings
  };

  const logDir = path.join(process.cwd(), 'logs');
  const logFile = path.join(logDir, 'uncaptured-metadata.json');

  // Ensure logs directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Read existing logs
  let logs: any[] = [];
  if (fs.existsSync(logFile)) {
    try {
      const content = fs.readFileSync(logFile, 'utf-8');
      logs = JSON.parse(content);
    } catch (error) {
      console.warn('Failed to read uncaptured metadata log, starting fresh');
    }
  }

  // Append new entry
  logs.push(logEntry);

  // Write back
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
}
```

---

## Processing Changes

### Location

**File**: `src/utils/processVillainData.ts`

### Update `processVillainData()` Function

When merging antagonist appearances into `ProcessedVillain` objects:

```typescript
// Add appearance to villain's appearances array
if (!appearanceMap.has(villainId)) {
  appearanceMap.set(villainId, {
    appearances: [],
    metadata: {}, // NEW: Track metadata by issue
  });
}

const villainData = appearanceMap.get(villainId)!;
villainData.appearances.push(issue.issueNumber);

// NEW: Store metadata for this appearance
if (antagonist.metadata) {
  villainData.metadata[issue.issueNumber] = antagonist.metadata;
}
```

When creating final `ProcessedVillain` objects:

```typescript
const villain: ProcessedVillain = {
  id: villainId,
  name: preferredName,
  names: Array.from(nameSet),
  url: villainInfo.url,
  imageUrl: villainInfo.imageUrl,
  identitySource: villainInfo.identitySource,
  firstAppearance: Math.min(...villainInfo.appearances),
  appearances: villainInfo.appearances.sort((a, b) => a - b),
  frequency: villainInfo.appearances.length,

  // NEW: Include appearance metadata if present
  ...(Object.keys(villainInfo.metadata).length > 0 && {
    appearanceMetadata: villainInfo.metadata,
  }),
};
```

### Update Timeline Data Generation

```typescript
// Build TimelineData with notable events
const timelineEntry: TimelineData = {
  issue: issueNumber,
  releaseDate: issue.releaseDate,
  chronologicalPlacementHint: issue.chronologicalPlacementHint,
  villains: villainsInIssue,
  villainCount: villainsInIssue.length,

  // NEW: Aggregate notable events for this issue
  notableEvents: {
    firstAppearances: villainsInIssue
      .filter((v) => v.appearanceMetadata?.[issueNumber]?.firstAppearance)
      .map((v) => v.id),
    deaths: villainsInIssue
      .filter((v) => v.appearanceMetadata?.[issueNumber]?.death)
      .map((v) => v.id),
    finalAppearances: villainsInIssue
      .filter((v) => v.appearanceMetadata?.[issueNumber]?.finalAppearance)
      .map((v) => v.id),
  },
};

// Remove notableEvents if all arrays are empty
if (
  timelineEntry.notableEvents!.firstAppearances.length === 0 &&
  timelineEntry.notableEvents!.deaths.length === 0 &&
  timelineEntry.notableEvents!.finalAppearances.length === 0
) {
  delete timelineEntry.notableEvents;
}
```

---

## Testing Strategy

### Unit Tests

**File**: `src/__tests__/appearanceMetadata.test.ts`

```typescript
describe("extractAppearanceMetadata", () => {
  test("parses first appearance", () => {
    const result = extractMetadata(
      "Lucky Lobo (First appearance)",
      "Lucky Lobo",
    );
    expect(result.metadata.firstAppearance).toBe(true);
  });

  test("parses chronological first appearance", () => {
    const result = extractMetadata(
      "Lucky Lobo (First appearance chronologically)",
      "Lucky Lobo",
    );
    expect(result.metadata.firstAppearanceChronological).toBe(true);
  });

  test("parses multiple metadata items", () => {
    const result = extractMetadata(
      "Burglar (Final appearance; dies) (Appears in flashback)",
      "Burglar",
    );
    expect(result.metadata.finalAppearance).toBe(true);
    expect(result.metadata.death).toBe(true);
    expect(result.metadata.flashback).toBe(true);
  });

  test("logs uncaptured metadata", () => {
    const result = extractMetadata(
      "Mutantmen (First appearance) (Destroyed)",
      "Mutantmen",
    );
    expect(result.metadata.firstAppearance).toBe(true);
    expect(result.uncaptured).toContain("Destroyed");
  });

  test("handles navigation symbols", () => {
    const result = extractMetadata(
      "Green Goblin ⏵ (Mentioned only)",
      "Green Goblin",
    );
    expect(result.metadata.mentionedOnly).toBe(true);
  });
});
```

### Integration Tests

**File**: `src/__tests__/integration/metadataScraping.test.ts`

```typescript
describe("Metadata Scraping Integration", () => {
  test("scrapes and processes metadata through full pipeline", async () => {
    // Use test HTML with known metadata
    const testHtml = createTestHtml({
      antagonists: [
        "Lucky Lobo (First appearance)",
        "Burglar (Final appearance; dies)",
      ],
    });

    const scraper = new MarvelScraper();
    const result = await scraper.parseAntagonistsFromHtml(testHtml, 1);

    expect(result[0].metadata?.firstAppearance).toBe(true);
    expect(result[1].metadata?.finalAppearance).toBe(true);
    expect(result[1].metadata?.death).toBe(true);
  });
});
```

---

## Future Visualization Integration

### Grid/Elastic Timeline Enhancements (Phase 2)

1. **Visual Indicators**
   - First appearance: Star icon (⭐)
   - Death: Skull icon (💀) or red marker
   - Final appearance: End marker (▪)
   - Mentioned only: Ghost/transparent styling
   - Flashback: Dashed border/italics

2. **Tooltips**
   - Show metadata on hover
   - Example: "Green Goblin (Mentioned only, Behind the scenes)"

3. **Filtering**
   - Filter by metadata type
   - "Show only first appearances"
   - "Hide mentioned-only appearances"

4. **Statistics**
   - Count first appearances per issue
   - Track character deaths
   - Analyze flashback frequency

---

## Data Migration

**Not Required**: This is new data. Existing data structures remain valid.

- No migration of existing `villains.json` files needed
- New scrapes will include metadata
- Old data remains functional without metadata fields

---

## Implementation Checklist

- [ ] Update `Antagonist` interface in `types.ts`
- [ ] Update `ProcessedVillain` interface in `types.ts`
- [ ] Update `TimelineData` interface in `types.ts`
- [ ] Add `extractAppearanceMetadata()` to `marvelScraper.ts`
- [ ] Add `logUncapturedMetadata()` to `marvelScraper.ts`
- [ ] Update `parseAntagonistsFromHtml()` in `marvelScraper.ts`
- [ ] Update `processVillainData()` in `processVillainData.ts`
- [ ] Create `appearanceMetadata.test.ts` unit tests
- [ ] Create integration test for metadata scraping
- [ ] Create `logs/` directory structure
- [ ] Update `.gitignore` to include `logs/` (review-only, not tracked)
- [ ] Test scraping with known metadata examples
- [ ] Review uncaptured metadata logs
- [ ] Update documentation with examples

---

## Success Criteria

1. ✅ All Phase 1 metadata types are correctly extracted
2. ✅ Uncaptured metadata is logged for review
3. ✅ Data structures support metadata at appearance level
4. ✅ Existing functionality remains unaffected
5. ✅ Tests achieve >90% coverage for new code
6. ✅ No performance degradation in scraping (< 5% overhead)
7. ✅ Documentation is complete and examples are clear

---

## Timeline Estimate

- **Specification**: ✅ Complete
- **Implementation**: 8-12 hours
  - Type definitions: 1 hour
  - Scraping logic: 3-4 hours
  - Processing logic: 2-3 hours
  - Testing: 2-3 hours
  - Documentation: 1 hour
- **Testing & Refinement**: 2-4 hours

**Total**: 10-16 hours

---

## Related Documentation

- [Story Arc/Saga Specification](./STORY_ARC_SPEC.md)
- [Types Documentation](./FUNCTIONAL_DOCUMENTATION.md#type-definitions)
- [Scraper Documentation](./FUNCTIONAL_DOCUMENTATION.md#marvel-scraper)
