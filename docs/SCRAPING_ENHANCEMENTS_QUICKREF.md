# Scraping Enhancements - Quick Reference Card

**📋 For rapid consultation during implementation**

---

## Feature 1: Appearance Metadata

### What to Scrape

```
Character listing text: "Lucky Lobo ⏵ (First appearance) (Destroyed)"
                                       ↓ Extract ↓
Metadata object: { firstAppearance: true, uncategorized: ["Destroyed"] }
```

### Priority Patterns (Phase 1)

| Pattern                   | Field             | Priority |
| ------------------------- | ----------------- | -------- |
| `First appearance`        | `firstAppearance` | HIGH     |
| `dies`, `killed`, `death` | `death`           | HIGH     |
| `Final appearance`        | `finalAppearance` | HIGH     |
| `Mentioned only`          | `mentionedOnly`   | MEDIUM   |
| `Behind the scenes`       | `behindTheScenes` | MEDIUM   |
| `flashback`               | `flashback`       | MEDIUM   |
| `Cameo`                   | `cameo`           | MEDIUM   |
| `Voice only`              | `voiceOnly`       | MEDIUM   |

### Key Functions

```typescript
// Main extraction function
extractAppearanceMetadata(fullText: string, characterName: string)
  → { metadata: AppearanceMetadata, uncaptured: string[] }

// Logging unknown metadata
logUncapturedMetadata(issueNumber, characterName, uncaptured)
  → writes to logs/uncaptured-metadata.json
```

### New Types

```typescript
interface AppearanceMetadata {
  firstAppearance?: boolean;
  death?: boolean;
  finalAppearance?: boolean;
  mentionedOnly?: boolean;
  behindTheScenes?: boolean;
  flashback?: boolean;
  cameo?: boolean;
  voiceOnly?: boolean;
  rawMetadata?: string[];
  uncategorized?: string[];
}

interface Antagonist {
  name: string;
  url?: string;
  imageUrl?: string;
  kind?: EntityKind;
  metadata?: AppearanceMetadata; // ← NEW
}
```

### Testing Checklist

- [ ] Single metadata: `(First appearance)`
- [ ] Multiple metadata: `(Final appearance; dies) (Appears in flashback)`
- [ ] With navigation: `Green Goblin ⏵ (Mentioned only)`
- [ ] Uncaptured logged: `(Destroyed)` → logs/
- [ ] Case insensitive: `(DIES)` → `death: true`

---

## Feature 2: Story Arc Tracking

### What to Scrape

```
Marvel Fandom Categories (page footer):
• Comics               ← Filtered out
• Clone Saga           ← EXTRACTED with URL
  (href="/wiki/Category:Clone_Saga")

                 ↓ Extract URL + ID + Name ↓

storyArcs: [
  {
    url: "https://marvel.fandom.com/wiki/Category:Clone_Saga",
    id: "clone-saga",
    name: "Clone Saga"
  }
]
```

### Identity Policy

- **Primary Key**: Marvel Fandom category URL (like characters)
- **Secondary ID**: Derived from URL slug
- **Display Name**: Category page title

### Category Filters (What to Exclude)

```typescript
// Years, months, meta-categories, series names
/^\d{4}$/                    // 1994, 2023
/^(January|February|...)$/   // Month names
/^Comics$/
/Vol \d+/                    // Volume indicators
/^Amazing Spider-Man/        // Series names
/^Earth-616$/                // Reality designations
/Cover by|Written by/        // Credits
```

### Key Functions

```typescript
// Parse categories → arc IDs
parseStoryArcs(html: string, issueNumber: number)
  → { storyArcs: string[], rawArcData: {...} } | undefined

// Arc name → URL-safe ID
createArcId(arcName: string)
  → "clone-saga"  (from "Clone Saga")

// Aggregate arcs across issues
buildStoryArcs(issues: IssueData[], seriesName: string)
  → StoryArc[]

// Merge multi-series arcs
mergeStoryArcs(seriesData: ProcessedData[])
  → StoryArc[]
```

### New Types

```typescript
interface StoryArc {
  url: string; // Primary key: Marvel Fandom category URL
  id: string; // Derived identifier: "clone-saga"
  name: string; // Display name: "Clone Saga"
  type?: ArcType; // "saga" | "arc" | "crossover" | "event"
  issues: number[]; // [117, 118, 394, ...]
  series?: string[]; // For multi-series arcs
  startIssue?: number; // First issue
  endIssue?: number; // Last issue
  issueCount: number; // Total issues
}

type ArcType = "arc" | "crossover" | "event" | "saga" | "double" | "unknown";

interface IssueData {
  // ... existing fields ...
  storyArcs?: Array<{
    // ← NEW (URL-based)
    url: string;
    id: string;
    name: string;
  }>;
  rawArcData?: {
    categories: string[];
    arcCategories: string[];
  };
}
```

### Arc Type Inference

| Conditions                     | Type        |
| ------------------------------ | ----------- |
| 3+ series                      | `event`     |
| `"saga"` in name OR 20+ issues | `saga`      |
| 2 series                       | `crossover` |
| ≤2 issues                      | `double`    |
| Default                        | `arc`       |

### Testing Checklist

- [ ] Single arc: `Clone Saga` → `["clone-saga"]`
- [ ] Multiple arcs: `Power and Responsibility`, `Clone Saga`
- [ ] Filtered correctly: `Comics`, `1994` excluded
- [ ] Multi-series merge: Same arc in 2+ series
- [ ] Arc aggregation: All issues collected
- [ ] Type inference: Correct arc type assigned

---

## Implementation Order

### Step 1: Types (2-3 hours)

```
1. AppearanceMetadata interface
2. Update Antagonist interface
3. Update ProcessedVillain interface
4. StoryArc interface + ArcType
5. Update IssueData interface
6. Update ProcessedData interface
7. Update D3Config interface
```

### Step 2: Scraping - Metadata (3-4 hours)

```
1. extractAppearanceMetadata()
2. logUncapturedMetadata()
3. Update parseAntagonistsFromHtml()
4. Test with known examples
```

### Step 3: Scraping - Arcs (3-4 hours)

```
1. parseStoryArcs()
2. createArcId()
3. Update scrapeIssue()
4. Test with known examples
```

### Step 4: Processing (5-7 hours)

```
1. Update processVillainData() for metadata
2. Add buildStoryArcs()
3. Add mergeStoryArcs()
4. Update timeline generation
5. Test full pipeline
```

### Step 5: Testing (4-6 hours)

```
1. Unit tests for all new functions
2. Integration tests for full pipeline
3. Test with real examples
4. Review uncaptured logs
```

### Step 6: Documentation (2 hours)

```
1. Update README examples
2. Add usage guides
3. Document data formats
```

**Total**: 19-26 hours

---

## Quick Test Commands

```powershell
# Run tests
npm test

# Test specific file
npm test -- appearanceMetadata.test.ts

# Run scraper with new features
npm run scrape -- --series "Amazing Spider-Man Vol 1" --issues 19

# Check compiled output
npm run build
Get-Content "public/script.js" -TotalCount 50 | Select-String "metadata|storyArc"

# Validate JSON data
Get-Content "data/villains.Amazing_Spider-Man_Vol_1.json" | ConvertFrom-Json
```

---

## Common Pitfalls

### ❌ DON'T

- Forget to handle missing metadata gracefully
- Hardcode arc names (use dynamic extraction)
- Skip uncaptured metadata logging
- Assume all pages have categories
- Forget to normalize arc IDs
- Scrape when data already exists

### ✅ DO

- Make metadata optional everywhere
- Filter category lists carefully
- Log all uncaptured patterns
- Handle missing/malformed HTML
- Use consistent ID generation
- Test with edge cases
- Verify compiled output after changes

---

## Key Files to Modify

```
src/types.ts                        ← Type definitions
src/scraper/marvelScraper.ts       ← Scraping logic
src/utils/processVillainData.ts   ← Processing logic
src/utils/mergeSeriesData.ts      ← Multi-series merge (new or existing)
src/utils/d3ConfigGenerator.ts    ← D3 config with arcs

src/__tests__/appearanceMetadata.test.ts      ← New tests
src/__tests__/storyArcs.test.ts               ← New tests
src/__tests__/integration/metadataScraping.test.ts  ← New tests
src/__tests__/integration/storyArcScraping.test.ts  ← New tests
```

---

## Success Validation

### Appearance Metadata

```typescript
// Check villains.json has metadata
const villain = data.villains.find((v) => v.name === "Burglar");
expect(villain.appearanceMetadata?.[200]?.death).toBe(true);

// Check uncaptured log created
expect(fs.existsSync("logs/uncaptured-metadata.json")).toBe(true);
```

### Story Arcs

```typescript
// Check arcs extracted with URLs
const issue = data.timeline.find((t) => t.issue === 117);
expect(issue.storyArcs?.[0]).toHaveProperty("url");
expect(issue.storyArcs?.[0]).toHaveProperty("id");
expect(issue.storyArcs?.[0]?.url).toContain("marvel.fandom.com");

// Check arc aggregation
const arc = data.storyArcs?.find(
  (a) => a.url === "https://marvel.fandom.com/wiki/Category:Clone_Saga",
);
expect(arc?.issueCount).toBeGreaterThan(0);
expect(arc?.series).toContain("Web of Spider-Man Vol 1");
```

### D3 Config

```typescript
// Check visualization data
expect(d3Config.arcs).toBeDefined();
expect(d3Config.arcs?.[0]).toHaveProperty("color");
```

---

## Performance Targets

| Operation                     | Current | Target    | Overhead |
| ----------------------------- | ------- | --------- | -------- |
| Parse single issue            | ~500ms  | ~550ms    | < 10%    |
| Extract metadata              | -       | +10-30ms  | -        |
| Parse arcs                    | -       | +50-100ms | -        |
| Process data                  | ~200ms  | ~220ms    | < 10%    |
| **Total scrape (100 issues)** | ~50s    | ~53s      | **< 5%** |

---

## Example Outputs

### Appearance Metadata

```json
{
  "name": "Burglar",
  "url": "https://marvel.fandom.com/wiki/Carradine_(Earth-616)",
  "metadata": {
    "finalAppearance": true,
    "death": true,
    "flashback": true,
    "rawMetadata": ["Final appearance; dies", "Appears in flashback"]
  }
}
```

### Story Arc (URL-Based)

```json
{
  "url": "https://marvel.fandom.com/wiki/Category:Clone_Saga",
  "id": "clone-saga",
  "name": "Clone Saga",
  "type": "saga",
  "issues": [117, 118, 119, 394, 395, 396],
  "series": ["Web of Spider-Man Vol 1", "Amazing Spider-Man Vol 1"],
  "startIssue": 117,
  "endIssue": 396,
  "issueCount": 6
}
```

### Timeline with Enhancements

```json
{
  "issue": 117,
  "villainCount": 3,
  "storyArcs": [
    {
      "url": "https://marvel.fandom.com/wiki/Category:Clone_Saga",
      "id": "clone-saga",
      "name": "Clone Saga"
    }
  ],
  "notableEvents": {
    "firstAppearances": ["lucky-lobo"],
    "deaths": ["burglar"],
    "finalAppearances": ["burglar"]
  }
}
```

---

**📚 Full Documentation**: See [SCRAPING_ENHANCEMENTS_SUMMARY.md](./SCRAPING_ENHANCEMENTS_SUMMARY.md) for complete details
