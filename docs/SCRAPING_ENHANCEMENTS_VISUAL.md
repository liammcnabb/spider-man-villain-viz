# Scraping Enhancements - Visual Overview

**Status**: ✅ **IMPLEMENTED AND TESTED** (January 12, 2026)  
**Test Coverage**: 436 tests passing | Live validated on ASM Vol 1 #19

## Current vs. Enhanced Data Flow

### Current State (Basic Character Tracking)

```
Marvel Fandom Page
━━━━━━━━━━━━━━━━━
Antagonists:
• Burglar ⏵

            ↓ SCRAPE

Raw Data
━━━━━━━━
{
  name: "Burglar",
  url: "..."
}

            ↓ PROCESS

Timeline
━━━━━━━━
Issue #1: Burglar appears
Issue #5: Burglar appears
```

---

### Enhanced State (Rich Context Tracking)

```
Marvel Fandom Page
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Antagonists:
• Burglar ⏵ (Final appearance; dies) (Appears in flashback)
• Green Goblin ⏵ (Mentioned only)
• Lucky Lobo ⏵ (First appearance)

Categories:
• Comics
• Clone Saga                    ← Story Arc!
• Power and Responsibility      ← Story Arc!
• 1994

            ↓ SCRAPE (with enhancements)

Raw Data with Metadata
━━━━━━━━━━━━━━━━━━━━━
{
  issueNumber: 117,
  storyArcs: ["clone-saga", "power-and-responsibility"],
  antagonists: [
    {
      name: "Burglar",
      url: "...",
      metadata: {
        finalAppearance: true,
        death: true,
        flashback: true
      }
    },
    {
      name: "Green Goblin",
      url: "...",
      metadata: {
        mentionedOnly: true
      }
    },
    {
      name: "Lucky Lobo",
      url: "...",
      metadata: {
        firstAppearance: true
      }
    }
  ]
}

            ↓ PROCESS (with aggregation)

Enhanced Timeline with Story Context
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue #1:   Burglar appears
            ...
Issue #117: Burglar dies (flashback) 💀
            Green Goblin mentioned
            Lucky Lobo debuts ⭐
            ┌─────────────────────────────┐
            │  Part of Clone Saga         │
            │  Part of Power & Resp.      │
            └─────────────────────────────┘
Issue #118: (continues Clone Saga)
            ┌─────────────────────────────┐
            │  Part of Clone Saga         │
            └─────────────────────────────┘
```

---

## Feature 1: Appearance Metadata

### What Gets Extracted

```
CHARACTER LISTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lucky Lobo (First appearance chronologically)
    │
    └──► firstAppearanceChronological: true

Mutantmen (First appearance) (Destroyed)
    │              │
    │              └──► uncategorized: ["Destroyed"]
    │                   (logged for review)
    └──► firstAppearance: true

Burglar (Final appearance; dies) (Appears in flashback)
    │              │                 │
    │              │                 └──► flashback: true
    │              └──► death: true
    └──► finalAppearance: true

Green Goblin (Mentioned only)
    │
    └──► mentionedOnly: true

Doctor Octopus (Behind the scenes) (Voice only)
    │                   │
    │                   └──► voiceOnly: true
    └──► behindTheScenes: true
```

### Priority Metadata Types

```
┌─────────────────────────────────────────────────┐
│  HIGH PRIORITY (Most Valuable)                  │
├─────────────────────────────────────────────────┤
│  • First Appearance     →  Timeline milestones  │
│  • Death/Killed         →  Major story events   │
│  • Final Appearance     →  Character arcs end   │
├─────────────────────────────────────────────────┤
│  MEDIUM PRIORITY (Context)                      │
├─────────────────────────────────────────────────┤
│  • Mentioned Only       →  vs. physical present │
│  • Behind the Scenes    →  off-panel presence   │
│  • Flashback            →  non-chronological    │
│  • Cameo                →  brief appearance     │
│  • Voice Only           →  audio presence       │
└─────────────────────────────────────────────────┘
```

---

## Feature 2: Story Arc Tracking

### What Gets Extracted

```
MARVEL FANDOM CATEGORIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Page Footer:
• Comics                          ← Filtered (meta)
• Web of Spider-Man Vol 1         ← Filtered (series)
• Clone Saga                      ← EXTRACTED ✅
  href="/wiki/Category:Clone_Saga"
• Power and Responsibility        ← EXTRACTED ✅
  href="/wiki/Category:Power_and_Responsibility"
• 1994                            ← Filtered (year)
• May                             ← Filtered (month)

            ↓ EXTRACT URL + ID + NAME

Story Arcs (URL-based):
• url: "https://marvel.fandom.com/wiki/Category:Clone_Saga"
  id: "clone-saga"
  name: "Clone Saga"

• url: "https://marvel.fandom.com/wiki/Category:Power_and_Responsibility"
  id: "power-and-responsibility"
  name: "Power and Responsibility"
```

### Arc Aggregation

```
SINGLE ISSUE (URL-based)
━━━━━━━━━━━━━━━━━━━━━━
Issue #117
storyArcs: [
  {
    url: "https://marvel.fandom.com/wiki/Category:Clone_Saga",
    id: "clone-saga",
    name: "Clone Saga"
  }
]

            +

Issue #118
storyArcs: [
  {
    url: "https://marvel.fandom.com/wiki/Category:Clone_Saga",
    id: "clone-saga",
    name: "Clone Saga"
  }
]

            +

Issue #394 (different series!)
storyArcs: [
  {
    url: "https://marvel.fandom.com/wiki/Category:Clone_Saga",
    id: "clone-saga",
    name: "Clone Saga"
  }
]

            ↓ AGGREGATE BY URL

COMPLETE ARC (URL-keyed)
━━━━━━━━━━━━━━━━━━━━━━━━
{
  url: "https://marvel.fandom.com/wiki/Category:Clone_Saga",
  id: "clone-saga",
  name: "Clone Saga",
  type: "saga",
  issues: [117, 118, 394, ...],
  series: [
    "Web of Spider-Man Vol 1",
    "Amazing Spider-Man Vol 1"
  ],
  startIssue: 117,
  endIssue: 394,
  issueCount: 50+
}
```

### Arc Types

```
┌────────────────────────────────────────────────────┐
│  TYPE         │ ISSUES │ SERIES │ EXAMPLE          │
├───────────────┼────────┼────────┼──────────────────┤
│  Story Arc    │  2-6   │   1    │ Kraven's Last    │
│               │        │        │ Hunt             │
├───────────────┼────────┼────────┼──────────────────┤
│  Double       │   2    │  1-2   │ Power and        │
│               │        │        │ Responsibility   │
├───────────────┼────────┼────────┼──────────────────┤
│  Crossover    │ 5-20   │   2    │ Maximum Carnage  │
├───────────────┼────────┼────────┼──────────────────┤
│  Saga         │ 20-100 │  1-3   │ Clone Saga       │
├───────────────┼────────┼────────┼──────────────────┤
│  Event        │ 10-100+│  3+    │ Secret Wars      │
└────────────────────────────────────────────────────┘
```

---

## Combined Visualization Potential

### Timeline with Arc Bands & Metadata Indicators

```
ENHANCED TIMELINE VISUALIZATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Issue:  #1    #2    #3    #4    #5    #6    #7    #8    #9   #10
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                      ┌────── Maximum Carnage ──────┐
                      │    (story arc, 6 issues)    │
                      └─────────────────────────────┘

Burglar         ●           ●                      💀
                                                (dies)

Green                           👻        ●        ●
Goblin                     (mentioned)

Carnage                     ⭐        ●        ●    ●
                        (debut)

Legend:
━━━━━━
●  Normal appearance
⭐ First appearance
💀 Death/Final appearance
👻 Mentioned only
▬  Story arc span
```

### Grid View with Metadata

```
CHARACTER GRID (Elastic Timeline)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────┬─────────────────────────────────────────┐
│ Burglar (12)    │ ●●●―――――――――💀―――――――――――――――――――――― │
│                 │ Issue 1-200 (Final app. #200, dies)     │
├─────────────────┼─────────────────────────────────────────┤
│ Green Goblin    │ ⭐―👻―👻―●●●●―――――――――――――――――――――― │
│ (45)            │ Debut #1, mentioned #2-3, active #4+    │
├─────────────────┼─────────────────────────────────────────┤
│ Carnage (8)     │ ―――――――⭐●●●●●●●●                     │
│                 │ ┌─ Max Carnage ─┐                       │
│                 │ Debuts #3, major arc #4-9               │
└─────────────────┴─────────────────────────────────────────┘

Filters:
☑ Show first appearances only
☐ Hide mentioned-only appearances
☐ Show deaths only
☐ Filter by arc: [Maximum Carnage ▼]
```

---

## Data Structure Comparison

### Before Enhancements

```typescript
// Simple antagonist
{
  name: "Burglar",
  url: "https://marvel.fandom.com/wiki/Carradine_(Earth-616)"
}

// Simple issue
{
  issueNumber: 1,
  title: "Amazing Spider-Man #1",
  antagonists: [...]
}

// Simple processed villain
{
  id: "carradine-earth-616",
  name: "Burglar",
  appearances: [1, 5, 10, 200],
  frequency: 4
}
```

### After Enhancements

```typescript
// Rich antagonist with metadata
{
  name: "Burglar",
  url: "https://marvel.fandom.com/wiki/Carradine_(Earth-616)",
  metadata: {
    finalAppearance: true,
    death: true,
    flashback: true,
    rawMetadata: ["Final appearance; dies", "Appears in flashback"]
  }
}

// Rich issue with story context
{
  issueNumber: 117,
  title: "Web of Spider-Man #117",
  antagonists: [...],
  storyArcs: [
    {
      url: "https://marvel.fandom.com/wiki/Category:Clone_Saga",
      id: "clone-saga",
      name: "Clone Saga"
    },
    {
      url: "https://marvel.fandom.com/wiki/Category:Power_and_Responsibility",
      id: "power-and-responsibility",
      name: "Power and Responsibility"
    }
  ],
  rawArcData: {
    categories: ["Comics", "Clone Saga", "Power and Responsibility", "1994"],
    arcCategories: ["Clone Saga", "Power and Responsibility"]
  }
}

// Rich processed villain with appearance-level metadata
{
  id: "carradine-earth-616",
  name: "Burglar",
  appearances: [1, 5, 10, 200],
  frequency: 4,
  appearanceMetadata: {
    1: { firstAppearance: true },
    200: { finalAppearance: true, death: true, flashback: true }
  }
}

// Story arc object (NEW! URL-based identity)
{
  url: "https://marvel.fandom.com/wiki/Category:Clone_Saga",
  id: "clone-saga",
  name: "Clone Saga",
  type: "saga",
  issues: [117, 118, 119, 394, 395, 396],
  series: ["Web of Spider-Man Vol 1", "Amazing Spider-Man Vol 1"],
  startIssue: 117,
  endIssue: 396,
  issueCount: 6
}
```

---

## Implementation Flow

### Phase 1: Appearance Metadata

```
┌──────────────────────────────────────────────────────┐
│  1. Update Types                                     │
│     • AppearanceMetadata interface                   │
│     • Enhanced Antagonist interface                  │
│     • Enhanced ProcessedVillain interface            │
├──────────────────────────────────────────────────────┤
│  2. Add Scraping Logic                               │
│     • extractAppearanceMetadata()                    │
│     • logUncapturedMetadata()                        │
│     • Update parseAntagonistsFromHtml()              │
├──────────────────────────────────────────────────────┤
│  3. Update Processing                                │
│     • Store metadata per appearance                  │
│     • Aggregate notable events per issue             │
├──────────────────────────────────────────────────────┤
│  4. Test & Validate                                  │
│     • Unit tests for parsing                         │
│     • Integration tests for pipeline                 │
│     • Review uncaptured metadata logs                │
└──────────────────────────────────────────────────────┘
```

### Phase 2: Story Arc Tracking

```
┌──────────────────────────────────────────────────────┐
│  1. Update Types                                     │
│     • StoryArc interface                             │
│     • ArcType type                                   │
│     • Enhanced IssueData with storyArcs              │
├──────────────────────────────────────────────────────┤
│  2. Add Scraping Logic                               │
│     • parseStoryArcs()                               │
│     • createArcId()                                  │
│     • Update scrapeIssue()                           │
├──────────────────────────────────────────────────────┤
│  3. Add Processing Logic                             │
│     • buildStoryArcs()                               │
│     • mergeStoryArcs() (multi-series)                │
│     • inferArcType()                                 │
├──────────────────────────────────────────────────────┤
│  4. Update D3 Config                                 │
│     • Add arcs to config                             │
│     • assignArcColor()                               │
├──────────────────────────────────────────────────────┤
│  5. Test & Validate                                  │
│     • Unit tests for parsing & aggregation           │
│     • Integration tests for multi-series             │
│     • Validate with Clone Saga, etc.                 │
└──────────────────────────────────────────────────────┘
```

### Phase 3: Visualization (Future)

```
┌──────────────────────────────────────────────────────┐
│  1. Metadata Indicators                              │
│     • Icon system (⭐💀👻)                           │
│     • Tooltip enhancements                           │
│     • Color-coded styling                            │
├──────────────────────────────────────────────────────┤
│  2. Arc Visualization                                │
│     • Arc band rendering                             │
│     • Arc highlighting                               │
│     • Arc navigation                                 │
├──────────────────────────────────────────────────────┤
│  3. Filtering & Analysis                             │
│     • Filter by metadata                             │
│     • Filter by arc                                  │
│     • Arc statistics                                 │
└──────────────────────────────────────────────────────┘
```

---

## Key Benefits Summary

```
┌────────────────────────────────────────────────────────┐
│  BEFORE                    │  AFTER                    │
├────────────────────────────┼───────────────────────────┤
│  • Character appeared      │  • Character appeared     │
│  • In which issues         │  • In which issues        │
│                            │  • How (debut, death,     │
│                            │    mention, flashback)    │
│                            │  • In which arcs          │
│                            │  • Arc spans & types      │
├────────────────────────────┼───────────────────────────┤
│  Basic tracking            │  Rich narrative context   │
└────────────────────────────────────────────────────────┘
```

### Use Cases Enabled

- ✅ **Track villain debuts**: "Show all first appearances"
- ✅ **Analyze deaths**: "Which villains die in which arcs?"
- ✅ **Understand arcs**: "What's the Clone Saga span?"
- ✅ **Filter by context**: "Hide mentioned-only appearances"
- ✅ **Navigate stories**: "Show me all Maximum Carnage issues"
- ✅ **Study patterns**: "How many flashbacks per arc?"
- ✅ **Crossover analysis**: "Which arcs span multiple series?"

---

## ✅ Implementation Results (January 12, 2026)

### Live Test: Amazing Spider-Man Vol 1 #19

**Metadata Extraction** ✅

```json
{
  "name": "Rock Gimpy",
  "url": "https://marvel.fandom.com/wiki/Rock_Gimpy_(Earth-616)",
  "metadata": {
    "rawMetadata": ["First appearance"],
    "firstAppearance": true
  }
}
```

**Story Arc Extraction** ✅

```json
{
  "storyArcs": [
    {
      "url": "https://marvel.fandom.com/wiki/Category:End_of_Spider-Man",
      "id": "end-of-spider-man",
      "name": "End of Spider-Man"
    }
  ]
}
```

**Uncaptured Metadata Logging** ✅

```
logs/uncaptured-metadata.json:
- Sandman (Flint Marko): ["Flint Marko"] (real name notation)
- Enforcers: ["Daniel Brito", "Raymond Bloch", "Jackson Brice"] (member names)
```

### Test Results

- **Unit Tests**: 22 new tests for metadata/arc extraction
- **Integration Tests**: All existing tests passing (436 total)
- **Type Safety**: Zero TypeScript compilation errors
- **Code Coverage**: Metadata and arc extractors fully covered

### Files Created

1. `src/utils/metadataExtractor.ts` - Metadata extraction logic
2. `src/utils/storyArcExtractor.ts` - Story arc extraction logic
3. `src/__tests__/metadataExtractor.test.ts` - 21 metadata tests
4. `src/__tests__/storyArcExtractor.test.ts` - 22 arc tests

### Files Modified

1. `src/types.ts` - Added AppearanceMetadata, StoryArc, ArcType types
2. `src/scraper/marvelScraper.ts` - Integrated extractors into scraping pipeline

---

For complete technical specifications, see:

- 📄 [APPEARANCE_METADATA_SPEC.md](./APPEARANCE_METADATA_SPEC.md)
- 📄 [STORY_ARC_SPEC.md](./STORY_ARC_SPEC.md)
- 📄 [SCRAPING_ENHANCEMENTS_SUMMARY.md](./SCRAPING_ENHANCEMENTS_SUMMARY.md)
