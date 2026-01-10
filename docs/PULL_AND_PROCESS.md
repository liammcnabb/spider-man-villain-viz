# Data Processing: Pull and Process Separately

## ⚠️ WHEN TO SCRAPE: ALMOST NEVER

**STOP!** Before running any scrape command, ask yourself:

❌ **DON'T scrape if:**
- Data files already exist in `data/` directory
- You're debugging villain positioning/ordering
- You're fixing first appearance calculations
- You're working on deduplication logic
- You're testing merge algorithms
- You're fixing UI/visualization issues

✅ **ONLY scrape if:**
- Data files are completely missing
- Data files are corrupted (malformed JSON)
- You need data from a NEW series not yet scraped
- Data structure fundamentally changed

**99% of issues are PROCESSING problems, not DATA problems.**

Use existing data and fix the logic:
```bash
# Fast testing without scraping:
npx ts-node test-merge-logic.ts

# Check existing data:
cat data/villains.Amazing_Spider-Man_Vol_1.json
cat data/villains.json
```

---

This guide explains how to **pull (scrape) and process data separately** in the Spider-Man Villain Timeline project.

## 🏗️ Architecture Overview

The data pipeline has three distinct phases:

```
┌─────────────────┐
│   Pull Phase    │  Marvel Fandom Web Scraping
│ (marvelScraper) │  → Series JSON files
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Process Phase   │  Data Merge & Transformation
│ (mergeDatasets) │  → Combined JSON file
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Publish Phase   │  Visualization & Output
│  (d3Graph, web) │  → D3 config & HTML
└─────────────────┘
```

## 🔌 Pull Phase: Scraping Data

Fetch data from Marvel Fandom and save series-specific JSON files.

### Command: Full Multi-Series Scrape
```bash
npm run scrape -- --all-series
```

**What happens:**
- Scrapes Amazing Spider-Man Vol 1 (issues 1-441)
- Scrapes Amazing Spider-Man Annual Vol 1 (issues 1-28)
- Scrapes Untold Tales of Spider-Man Vol 1 (issues 1-25)
- Saves to individual series JSON files:
  - `data/villains.Amazing_Spider-Man_Vol_1.json`
  - `data/villains.Amazing_Spider-Man_Annual_Vol_1.json`
  - `data/villains.Untold_Tales_of_Spider-Man_Vol_1.json`

### Command: Scrape Single Series
```bash
# Scrape just Vol 1
npm run scrape -- --series "Amazing Spider-Man Vol 1" --issues 1-100

# Scrape just Annual Vol 1
npm run scrape -- --series "Amazing Spider-Man Annual Vol 1"

# Scrape specific issues
npm run scrape -- --issues 1,5,10,20
```

### Files Created by Pull Phase
Each series scrape creates JSON files with structure:
```json
{
  "series": "Amazing Spider-Man Vol 1",
  "processedAt": "2026-01-08T...",
  "villains": [
    {
      "id": "doctor-octopus",
      "name": "Doctor Octopus",
      "url": "https://marvel.fandom.com/wiki/Otto_Octavius_(Earth-616)",
      "firstAppearance": 3,
      "appearances": [3, 6, 13, ...],
      "frequency": 8
    }
  ],
  "timeline": [
    {
      "issue": 1,
      "releaseDate": "April 9, 1963",
      "villains": ["Spider-Man's Foes"],
      "villainUrls": ["https://marvel.fandom.com/wiki/..."],
      ...
    }
  ],
  "groups": [...]
}
```

**⚠️ Important:** Each series file has **its own timeline with only that series' issues**. This is crucial for the merge phase.

---

## ⚙️ Process Phase: Merging Data

Transform multiple series JSON files into a single combined dataset with proper deduplication.

### Module: `src/utils/mergeDatasets.ts`

The `mergeDatasets()` function is a **pure function** - no I/O, no side effects:

```typescript
import { mergeDatasets } from './src/utils/mergeDatasets';

// Load your JSON files however you want
const datasets = [volJson, annualJson, untoldJson];

// Process them
const result = mergeDatasets(datasets);

// result contains:
// - result.villains      (merged villain array)
// - result.timeline      (sorted chronologically)
// - result.groups        (merged group data)
// - result.stats         (statistics)
```

### Key Features of Merge Logic

#### 1. **URL-Based Deduplication**
Villains are identified by their Marvel Fandom URL, not their name:

```
Doctor Octopus (Otto Octavius)
  URL: https://marvel.fandom.com/wiki/Otto_Octavius_(Earth-616)
  FirstAppearance: Issue #3
  
Doctor Octopus (Carolyn Trainer)
  URL: https://marvel.fandom.com/wiki/Carolyn_Trainer_(Earth-616)
  FirstAppearance: Issue #405
  
The Rose (Richard Fisk)
  URL: https://marvel.fandom.com/wiki/Richard_Fisk_(Earth-616)
  
The Rose (Jacob Conover)
  URL: https://marvel.fandom.com/wiki/Jacob_Conover_(Earth-616)
```

This prevents accidentally merging different characters with the same alias.

#### 2. **Chronological Sorting**
All issues from all series are sorted by release date:

```
Vol 1 #1 (April 1963)
Vol 1 #2 (May 1963)
Vol 1 #3 (June 1963)     ← Doctor Octopus first appears here
...
Annual #1 (June 1964)
...
```

This determines `firstAppearance` correctly across all series.

#### 3. **Villain-Specific Appearances**
Each villain's appearances are rebuilt using **URL matching**, so:
- Otto Octavius gets only appearances with his URL
- Carolyn Trainer gets only appearances with her URL
- They don't share appearance counts

### When to Use the Process Phase

**Without re-scraping:**
```bash
# Just rebuild the combined data from existing series files
npx ts-node test-merge-logic.ts
```

**After scraping:**
```bash
npm run scrape -- --all-series
# Automatically runs the process phase
```

---

## 🧪 Test the Merge Logic

Test data processing without scraping using the standalone test script:

### Command
```bash
npx ts-node test-merge-logic.ts
```

### What It Does
1. Loads existing JSON files from `data/` directory
2. Runs `mergeDatasets()` function
3. Displays results for Doctor Octopus and The Rose
4. Verifies URL-based deduplication works

### Example Output
```
Loading 3 series files...

✓ Loaded villains.Amazing_Spider-Man_Vol_1.json: 2 villains, 1 timeline entries
✓ Loaded villains.Amazing_Spider-Man_Annual_Vol_1.json: 113 villains, 28 timeline entries
✓ Loaded villains.Untold_Tales_of_Spider-Man_Vol_1.json: 44 villains, 25 timeline entries

=== PROCESSING MERGED DATA ===

Total villains merged: 140

=== DOCTOR OCTOPUS ENTRIES ===
Name: Doctor Octopus
URL: https://marvel.fandom.com/wiki/Otto_Octavius_(Earth-616)
First Appearance: Issue #3 (Amazing Spider-Man Vol 1)
Appearances: 3, 1, 3, 6, 13, 15, 23, 19
Frequency: 8
```

**Benefits:**
- ✅ Fast (no network requests)
- ✅ Verify merge logic without re-scraping
- ✅ Test data transformations locally
- ✅ Iterate on processing logic quickly

---

## 🔄 Complete Workflow: Pull → Process → Publish

### Scenario 1: Fresh Start
```bash
# 1. Pull: Scrape all series from Marvel Fandom
npm run scrape -- --all-series
# Automatically triggers Process and Publish phases

# 2. View results
npm run serve
```

### Scenario 2: Modify Processing Logic
```bash
# 1. Keep existing series JSON files (no scraping)

# 2. Edit src/utils/mergeDatasets.ts with your changes

# 3. Rebuild TypeScript
npm run build

# 4. Test the merge logic
npx ts-node test-merge-logic.ts

# 5. When satisfied, manually trigger publish:
npm run scrape -- --all-series
```

### Scenario 3: Add a New Series
```bash
# 1. Pull: Scrape new series (old series data unchanged)
npm run scrape -- --series "New Series Name" --issues 1-50
# Creates data/villains.New_Series_Name.json

# 2. Process & Publish: Rebuild combined data
npm run scrape -- --all-series
# Merges new series with existing series

# 3. View results
npm run serve
```

---

## 📝 Editing Processing Logic

The merge logic lives in `src/utils/mergeDatasets.ts`. To modify how data is merged:

### Edit the merge function
```typescript
export function mergeDatasets(datasets: any[]): MergedDataset {
  // Your changes here
}
```

### Test immediately (without scraping)
```bash
npx ts-node test-merge-logic.ts
```

### Then verify with full pipeline
```bash
npm run build
npm test
npm run scrape -- --all-series
npm run serve
```

---

## 🎯 Summary

| Task | Command | Time | Phase |
|------|---------|------|-------|
| Scrape all series | `npm run scrape -- --all-series` | 10-15 min | Pull |
| Test merge logic | `npx ts-node test-merge-logic.ts` | <1 sec | Process |
| Run full pipeline | `npm run build && npm test` | 5 sec | All |
| View in browser | `npm run serve` | instant | Publish |

**Key Benefit:** You can now develop and test the **process phase independently** without waiting for slow scraping operations!
