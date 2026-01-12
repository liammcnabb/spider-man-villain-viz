# Story Arc & Saga Tracking Specification

**Feature**: Extract and visualize story arcs and sagas from Marvel Fandom issue pages  
**Status**: Specification Phase  
**Created**: 2026-01-12  
**Related Features**: Appearance Metadata Tracking

---

## Overview

Marvel comic issues are often part of larger narrative structures (story arcs, crossovers, sagas). Marvel Fandom documents these relationships using category tags. This specification defines how to extract, store, and visualize story arc information to enhance timeline understanding.

### Examples from Marvel Fandom

**Amazing Spider-Man Vol 1 #19**  
URL: https://marvel.fandom.com/wiki/Amazing_Spider-Man_Vol_1_19

Categories include:

- `End of Spider-Man` (story arc)

**Web of Spider-Man Vol 1 #117**  
URL: https://marvel.fandom.com/wiki/Web_of_Spider-Man_Vol_1_117

Categories include:

- `Power and Responsibility` (story arc)
- `Clone Saga` (major storyline/event)

---

## Story Arc Identity Policy

### URL as Primary Key

Following the project's established identity pattern (matching character handling):

- **Primary Key**: Marvel Fandom category URL (e.g., `https://marvel.fandom.com/wiki/Category:Clone_Saga`)
- **Secondary ID**: URL-safe derived name (e.g., `clone-saga`)
- **Display Name**: Human-readable arc name (e.g., `Clone Saga`)

This ensures:

- ✅ Unique identification across all data sources
- ✅ No reconciliation issues with different naming conventions
- ✅ Direct linking to official Marvel Fandom documentation
- ✅ Consistency with character identity handling

---

## Story Arc Taxonomy

### Arc Types (Based on Marvel Fandom Patterns)

| Type             | Description                              | Examples                                | Typical Duration |
| ---------------- | ---------------------------------------- | --------------------------------------- | ---------------- |
| **Story Arc**    | Self-contained narrative within a series | "Kraven's Last Hunt", "Maximum Carnage" | 2-6 issues       |
| **Crossover**    | Story spanning multiple series           | "Inferno", "Acts of Vengeance"          | 5-20+ issues     |
| **Event**        | Major universe-wide storyline            | "Secret Wars", "Civil War"              | 10-100+ issues   |
| **Saga**         | Extended narrative thread                | "Clone Saga", "Alien Costume Saga"      | 20-100+ issues   |
| **Double Issue** | Two-part story                           | "Power and Responsibility"              | 2 issues         |

### Marvel Fandom Category Patterns

Story arcs appear in page categories with these patterns:

- Category Link: `href="/wiki/Category:Clone_Saga"` ← **Captures URL**
- Display Name: `Clone Saga` ← **Derives display name**
- Format: `[Story Name]` or `Part of [Story Name]`

**Category URLs are the authoritative source for arc identity.**

---

## Data Structure Changes

### 1. New `StoryArc` Interface

**File**: `src/types.ts`

```typescript
/**
 * Represents a story arc or saga that spans multiple issues
 *
 * Identity Policy:
 * - url: Marvel Fandom category URL (primary key)
 * - id: Derived from URL slug (secondary identifier)
 * - name: Display name from category page
 */
export interface StoryArc {
  url: string; // Primary key: Marvel Fandom category URL
  // e.g., "https://marvel.fandom.com/wiki/Category:Clone_Saga"
  id: string; // Derived URL-safe identifier (e.g., "clone-saga")
  name: string; // Display name (e.g., "Clone Saga")
  type?: ArcType; // Classification (optional, can be inferred later)
  issues: number[]; // Issue numbers that are part of this arc
  series?: string[]; // Series involved (for multi-series arcs)
  startIssue?: number; // First issue (chronologically)
  endIssue?: number; // Last issue (chronologically)
  issueCount: number; // Total issues in this arc
}

export type ArcType =
  | "arc"
  | "crossover"
  | "event"
  | "saga"
  | "double"
  | "unknown";
```

### 2. Enhanced `IssueData` Interface

```typescript
export interface IssueData {
  issueNumber: number;
  title: string;
  publicationDate?: string;
  releaseDate?: string;
  chronologicalPlacementHint?: string;
  antagonists: Antagonist[];

  // NEW: Story arcs this issue is part of (URL-based)
  storyArcs?: Array<{
    url: string; // Marvel Fandom category URL (primary key)
    id: string; // Derived identifier
    name: string; // Display name
  }>;
  rawArcData?: {
    categories: string[];
    arcCategories: string[];
  };
}
```

### 3. Enhanced `ProcessedData` Interface

```typescript
export interface ProcessedData {
  series: string;
  processedAt: string;
  villains: ProcessedVillain[];
  timeline: TimelineData[];
  stats: VillainStats;
  groups?: ProcessedGroup[];

  // NEW: Story arc information
  storyArcs?: StoryArc[]; // All story arcs in this series
  arcStats?: {
    totalArcs: number;
    longestArc: string; // Arc ID with most issues
    multiSeriesArcs: string[]; // Arcs spanning multiple series
  };
}
```

### 4. Enhanced `TimelineData` Interface

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
  notableEvents?: {
    firstAppearances: string[];
    deaths: string[];
    finalAppearances: string[];
  };

  // NEW: Story arcs for this issue (URL-based references)
  storyArcs?: Array<{
    url: string; // Marvel Fandom category URL (primary key)
    id: string; // Derived identifier
    name: string; // Display name
  }>;
}
```

### 5. Enhanced D3 Config for Visualization

```typescript
export interface D3DataPoint {
  issueNumber: number;
  chronologicalPosition?: number;
  series?: string;
  releaseDate?: string;
  villainsInIssue: string[];
  villainCount: number;

  // NEW: Story arc information for visualization (URL-based)
  storyArcs?: Array<{
    url: string;
    id: string;
    name: string;
  }>;
  arcHighlight?: boolean; // If true, this issue is part of an active arc
}

export interface D3Config {
  data: D3DataPoint[];
  scales: {
    x: D3Scale;
    y: D3Scale;
  };
  colors: Map<string, string>;

  // NEW: Arc visualization data (indexed by URL)
  arcs?: Array<{
    url: string; // Primary key: Marvel Fandom category URL
    id: string; // Derived identifier
    name: string; // Display name
    startIssue: number;
    endIssue: number;
    color?: string; // Assigned color for arc visualization
  }>;
}
```

---

## Scraping Implementation

### Location

**File**: `src/scraper/marvelScraper.ts`

### New Method: `parseStoryArcs()`

```typescript
/**
 * Parses story arc information from Marvel Fandom page categories
 *
 * Marvel Fandom uses category tags to indicate story arcs.
 * Categories appear in the page footer as links like:
 * - href="/wiki/Category:Clone_Saga"  → url, id, name extraction
 * - href="/wiki/Category:Maximum_Carnage"
 *
 * @param html - HTML content of the issue page
 * @param issueNumber - The issue number (for logging)
 * @returns Object with story arc data (url-based) and raw categories
 *
 * @example
 * // From Web of Spider-Man Vol 1 #117
 * {
 *   storyArcs: [
 *     {
 *       url: "https://marvel.fandom.com/wiki/Category:Power_and_Responsibility",
 *       id: "power-and-responsibility",
 *       name: "Power and Responsibility"
 *     },
 *     {
 *       url: "https://marvel.fandom.com/wiki/Category:Clone_Saga",
 *       id: "clone-saga",
 *       name: "Clone Saga"
 *     }
 *   ],
 *   rawArcData: {
 *     categories: [...],
 *     arcCategories: [...]
 *   }
 * }
 */
private parseStoryArcs(
  html: string,
  issueNumber: number
): {
  storyArcs: Array<{ url: string; id: string; name: string }>;
  rawArcData: {
    categories: string[];
    arcCategories: string[];
  };
} | undefined {
  try {
    const $ = cheerio.load(html);
    const categories: string[] = [];
    const arcCategories: Array<{ url: string; name: string }> = [];

    // Categories appear in two possible locations:
    // 1. Page footer: <div id="catlinks"> or <div class="page-footer__categories">
    // 2. Below content: Look for "Categories:" heading

    // Try modern Marvel Fandom layout first
    const categoryContainer = $('#catlinks, .page-footer__categories');

    if (categoryContainer.length > 0) {
      categoryContainer.find('a').each((_, link) => {
        const $link = $(link);
        const categoryName = $link.text().trim();
        const href = $link.attr('href') || '';

        // Only process Category: links (not other links in footer)
        if (href.includes('/wiki/Category:') && categoryName) {
          categories.push(categoryName);

          // Check if this is a story arc (filter applied below)
          arcCategories.push({
            url: `${MARVEL_FANDOM_BASE}${href}`,  // Full URL with base
            name: categoryName
          });
        }
      });
    } else {
      // Fallback: look for "Categories:" text and following links
      const categoriesLabel = $('h2, h3, div').filter((_, el) => {
        return $(el).text().toLowerCase().includes('categories');
      }).first();

      if (categoriesLabel.length > 0) {
        categoriesLabel.nextAll('ul, div').first().find('a').each((_, link) => {
          const $link = $(link);
          const categoryName = $link.text().trim();
          const href = $link.attr('href') || '';

          if (href.includes('/wiki/Category:') && categoryName) {
            categories.push(categoryName);
            arcCategories.push({
              url: `${MARVEL_FANDOM_BASE}${href}`,
              name: categoryName
            });
          }
        });
      }
    }

    // Filter categories to identify story arcs
    // Story arcs typically:
    // - Are NOT meta categories (Comics, Issues, Years, Months, Series names)
    // - Are NOT character categories (unless part of named arc)
    // - ARE narrative/story descriptors

    const excludePatterns = [
      /^\d{4}$/,                    // Years (1994, 2023)
      /^(January|February|March|April|May|June|July|August|September|October|November|December)$/i,  // Months
      /^Comics$/i,
      /^Issues$/i,
      /Vol \d+/,                    // Volume indicators
      /^Amazing Spider-Man/i,       // Series names
      /^Spider-Man/i,
      /^Web of Spider-Man/i,
      /^Peter Parker/i,
      /^Sensational/i,
      /^Spectacular/i,
      /^Untold Tales/i,
      /^Unlimited$/i,
      /^Annual$/i,
      /Cover by/i,
      /Written by/i,
      /Penciler/i,
      /Inker/i,
      /Letterer/i,
      /Colorist/i,
      /Editor/i,
      /^Marvel/i,
      /^Earth-616$/i               // Reality designation
    ];

    const filteredArcs = arcCategories.filter(arc => {
      const isExcluded = excludePatterns.some(pattern => pattern.test(arc.name));
      return !isExcluded && arc.name.length > 3;
    });

    // Convert to arc objects with URL-based identity
    const storyArcs = filteredArcs.map(arc => ({
      url: arc.url,
      id: this.createArcId(arc.name),  // Derive ID from name (consistent)
      name: arc.name
    }));

    // Only return if we found story arcs
    if (storyArcs.length > 0) {
      return {
        storyArcs,
        rawArcData: {
          categories,
          arcCategories: filteredArcs.map(a => a.name)
        }
      };
    }

    return undefined;
  } catch (error) {
    console.error(
      `Error parsing story arcs for issue ${issueNumber}: ${error}`
    );
    return undefined;
  }
}

/**
 * Creates a URL-safe ID from story arc name
 *
 * @param arcName - Display name of the story arc
 * @returns URL-safe identifier
 *
 * @example
 * createArcId("Clone Saga") => "clone-saga"
 * createArcId("Power and Responsibility") => "power-and-responsibility"
 * createArcId("Maximum Carnage!") => "maximum-carnage"
 */
private createArcId(arcName: string): string {
  return arcName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special characters
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens
}
```

### Update `scrapeIssue()` Method

**Current** (lines 230-280):

```typescript
private async scrapeIssue(issueNumber: number): Promise<IssueData> {
  const url = this.getIssueUrl(issueNumber);

  try {
    const response = await this.axiosClient.get(url);

    if (!response.data) {
      throw new Error('No response data received');
    }

    const antagonists = this.parseAntagonistsFromHtml(
      response.data,
      issueNumber
    );

    const releaseDate = this.parseReleaseDate(
      response.data,
      issueNumber
    );

    const chronologicalPlacementHint = this.parseChronologicalPlacement(
      response.data,
      issueNumber
    );

    await this.scrapeVillainImages(antagonists);

    return {
      issueNumber,
      title: `${this.currentSeries.titlePrefix} #${issueNumber}`,
      releaseDate,
      chronologicalPlacementHint,
      antagonists
    };
  } catch (error) {
    // ... error handling
  }
}
```

**Enhanced**:

```typescript
private async scrapeIssue(issueNumber: number): Promise<IssueData> {
  const url = this.getIssueUrl(issueNumber);

  try {
    const response = await this.axiosClient.get(url);

    if (!response.data) {
      throw new Error('No response data received');
    }

    const antagonists = this.parseAntagonistsFromHtml(
      response.data,
      issueNumber
    );

    const releaseDate = this.parseReleaseDate(
      response.data,
      issueNumber
    );

    const chronologicalPlacementHint = this.parseChronologicalPlacement(
      response.data,
      issueNumber
    );

    // NEW: Parse story arc information
    const arcData = this.parseStoryArcs(
      response.data,
      issueNumber
    );

    await this.scrapeVillainImages(antagonists);

    return {
      issueNumber,
      title: `${this.currentSeries.titlePrefix} #${issueNumber}`,
      releaseDate,
      chronologicalPlacementHint,
      antagonists,
      // NEW: Include story arc data if present
      ...(arcData && {
        storyArcs: arcData.storyArcs,
        rawArcData: arcData.rawArcData
      })
    };
  } catch (error) {
    // ... error handling
  }
}
```

---

## Processing Changes

### Location

**File**: `src/utils/processVillainData.ts`

### New Function: `buildStoryArcs()`

```typescript
/**
 * Builds StoryArc objects from issue data
 *
 * Aggregates all story arc appearances across issues to create
 * comprehensive arc objects with metadata. Uses URLs as primary key.
 *
 * @param issues - Array of issue data
 * @param seriesName - Name of the series
 * @returns Array of StoryArc objects (indexed by URL)
 */
function buildStoryArcs(issues: IssueData[], seriesName: string): StoryArc[] {
  const arcMap = new Map<
    string,
    {
      url: string;
      name: string;
      issues: number[];
    }
  >();

  // First pass: collect all arc appearances (indexed by URL)
  for (const issue of issues) {
    if (!issue.storyArcs || issue.storyArcs.length === 0) {
      continue;
    }

    for (const arc of issue.storyArcs) {
      if (!arcMap.has(arc.url)) {
        arcMap.set(arc.url, {
          url: arc.url,
          name: arc.name,
          issues: [],
        });
      }

      arcMap.get(arc.url)!.issues.push(issue.issueNumber);
    }
  }

  // Second pass: create StoryArc objects
  const storyArcs: StoryArc[] = [];

  for (const [arcUrl, arcData] of arcMap.entries()) {
    const sortedIssues = arcData.issues.sort((a, b) => a - b);

    storyArcs.push({
      url: arcUrl, // Primary key
      id: createArcIdFromUrl(arcUrl), // Derive from URL
      name: arcData.name,
      issues: sortedIssues,
      series: [seriesName],
      startIssue: sortedIssues[0],
      endIssue: sortedIssues[sortedIssues.length - 1],
      issueCount: sortedIssues.length,
    });
  }

  return storyArcs.sort((a, b) => a.startIssue! - b.startIssue!);
}

/**
 * Extracts ID from Marvel Fandom category URL
 *
 * @param url - Full URL like "https://marvel.fandom.com/wiki/Category:Clone_Saga"
 * @returns ID like "clone-saga"
 */
function createArcIdFromUrl(url: string): string {
  // Extract slug from URL
  const match = url.match(/\/wiki\/Category:(.+)$/);
  const slug = match ? match[1] : url;

  return slug
    .replace(/_/g, "-") // Replace underscores with hyphens
    .toLowerCase();
}
```

### Update `processVillainData()` Function

```typescript
export function processVillainData(
  rawData: RawVillainData,
  config?: ProcessingConfig,
): ProcessedData {
  // ... existing villain processing ...

  // NEW: Build story arcs
  const storyArcs = buildStoryArcs(rawData.issues, rawData.series);

  // NEW: Calculate arc statistics
  const arcStats =
    storyArcs.length > 0
      ? {
          totalArcs: storyArcs.length,
          longestArc: storyArcs.reduce((longest, arc) =>
            arc.issueCount > longest.issueCount ? arc : longest,
          ).id,
          multiSeriesArcs: [], // Single series for now, updated in merge phase
        }
      : undefined;

  // ... existing timeline building ...

  // NEW: Add story arcs to timeline entries
  const timeline: TimelineData[] = sortedIssues.map((issueNumber) => {
    const issue = issuesByNumber.get(issueNumber)!;
    const villainsInIssue = villainsByIssue.get(issueNumber) || [];

    return {
      issue: issueNumber,
      releaseDate: issue.releaseDate,
      chronologicalPlacementHint: issue.chronologicalPlacementHint,
      villains: villainsInIssue,
      villainCount: villainsInIssue.length,
      // ... existing fields ...

      // NEW: Include story arcs if present
      ...(issue.storyArcs &&
        issue.storyArcs.length > 0 && {
          storyArcs: issue.storyArcs,
        }),
    };
  });

  return {
    series: rawData.series,
    processedAt: new Date().toISOString(),
    villains,
    timeline,
    stats,
    groups,
    // NEW: Include story arcs and stats
    ...(storyArcs.length > 0 && {
      storyArcs,
      arcStats,
    }),
  };
}
```

---

## Multi-Series Arc Merging

### Location

**File**: `src/utils/mergeSeriesData.ts` (new file or add to existing merge logic)

```typescript
/**
 * Merges story arcs from multiple series
 *
 * Identifies arcs that span multiple series (crossovers, events)
 * and combines them into unified StoryArc objects. Uses URLs as primary key.
 *
 * @param seriesData - Array of processed data from different series
 * @returns Merged story arcs with multi-series information
 */
export function mergeStoryArcs(seriesData: ProcessedData[]): StoryArc[] {
  const arcMap = new Map<
    string,
    {
      url: string;
      name: string;
      issues: number[];
      series: Set<string>;
    }
  >();

  // Collect all arcs from all series (indexed by URL)
  for (const data of seriesData) {
    if (!data.storyArcs) continue;

    for (const arc of data.storyArcs) {
      if (!arcMap.has(arc.url)) {
        arcMap.set(arc.url, {
          url: arc.url,
          name: arc.name,
          issues: [],
          series: new Set(),
        });
      }

      const existing = arcMap.get(arc.url)!;
      existing.issues.push(...arc.issues);
      existing.series.add(data.series);
    }
  }

  // Build merged arcs
  const mergedArcs: StoryArc[] = [];

  for (const [arcUrl, arcData] of arcMap.entries()) {
    const sortedIssues = [...new Set(arcData.issues)].sort((a, b) => a - b);
    const seriesArray = Array.from(arcData.series).sort();

    mergedArcs.push({
      url: arcUrl, // Primary key
      id: createArcIdFromUrl(arcUrl), // Derive from URL
      name: arcData.name,
      issues: sortedIssues,
      series: seriesArray,
      startIssue: sortedIssues[0],
      endIssue: sortedIssues[sortedIssues.length - 1],
      issueCount: sortedIssues.length,
      // Infer type based on patterns
      type: inferArcType(arcData.name, seriesArray.length, sortedIssues.length),
    });
  }

  return mergedArcs.sort((a, b) => a.startIssue! - b.startIssue!);
}

/**
 * Infers arc type from characteristics
 */
function inferArcType(
  name: string,
  seriesCount: number,
  issueCount: number,
): ArcType {
  const lowerName = name.toLowerCase();

  // Events are usually multi-series
  if (seriesCount > 2) {
    return "event";
  }

  // Sagas are long-running
  if (lowerName.includes("saga") || issueCount > 20) {
    return "saga";
  }

  // Crossovers span 2 series
  if (seriesCount === 2) {
    return "crossover";
  }

  // Short arcs
  if (issueCount <= 2) {
    return "double";
  }

  // Default
  return "arc";
}
```

---

## D3 Config Generation

### Location

**File**: `src/utils/d3ConfigGenerator.ts`

### Update Config Generation

```typescript
export function generateD3Config(processedData: ProcessedData): D3Config {
  // ... existing data point generation ...

  // NEW: Generate arc visualization data (URL-based)
  const arcs =
    processedData.storyArcs?.map((arc) => ({
      url: arc.url, // Primary key
      id: arc.id,
      name: arc.name,
      startIssue: arc.startIssue!,
      endIssue: arc.endIssue!,
      color: assignArcColor(arc.url), // Use URL for consistent color
    })) || [];

  return {
    data: dataPoints,
    scales,
    colors,
    // NEW: Include arc data
    ...(arcs.length > 0 && { arcs }),
  };
}

/**
 * Assigns consistent colors to story arcs based on URL
 * Uses hash of URL for deterministic color generation
 */
function assignArcColor(arcUrl: string): string {
  // Hash the URL to get a consistent number
  let hash = 0;
  for (let i = 0; i < arcUrl.length; i++) {
    hash = arcUrl.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  const saturation = 60 + (Math.abs(hash >> 8) % 20);
  const lightness = 50 + (Math.abs(hash >> 16) % 15);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
```

---

## Testing Strategy

### Unit Tests

**File**: `src/__tests__/storyArcs.test.ts`

```typescript
describe("parseStoryArcs", () => {
  test("extracts story arc from categories", () => {
    const html = createTestHtmlWithCategories([
      "Comics",
      "Clone Saga",
      "1994",
      "May",
    ]);

    const result = parseStoryArcs(html, 117);
    expect(result?.storyArcs).toContain("clone-saga");
    expect(result?.rawArcData.categories).toContain("Clone Saga");
  });

  test("filters out non-arc categories", () => {
    const html = createTestHtmlWithCategories([
      "Comics",
      "Spider-Man Vol 1",
      "Maximum Carnage",
      "1993",
    ]);

    const result = parseStoryArcs(html, 1);
    expect(result?.storyArcs).toEqual(["maximum-carnage"]);
  });

  test("handles multiple arcs in same issue", () => {
    const html = createTestHtmlWithCategories([
      "Power and Responsibility",
      "Clone Saga",
    ]);

    const result = parseStoryArcs(html, 117);
    expect(result?.storyArcs).toHaveLength(2);
    expect(result?.storyArcs).toContain("power-and-responsibility");
    expect(result?.storyArcs).toContain("clone-saga");
  });
});

describe("buildStoryArcs", () => {
  test("aggregates arc appearances", () => {
    const issues: IssueData[] = [
      { issueNumber: 1, storyArcs: ["test-arc"] /* ... */ },
      { issueNumber: 2, storyArcs: ["test-arc"] /* ... */ },
      { issueNumber: 3, storyArcs: ["other-arc"] /* ... */ },
    ];

    const arcs = buildStoryArcs(issues, "Amazing Spider-Man Vol 1");

    expect(arcs).toHaveLength(2);
    const testArc = arcs.find((a) => a.id === "test-arc");
    expect(testArc?.issues).toEqual([1, 2]);
    expect(testArc?.issueCount).toBe(2);
  });
});

describe("mergeStoryArcs", () => {
  test("identifies cross-series arcs", () => {
    const series1: ProcessedData = {
      series: "Amazing Spider-Man Vol 1",
      storyArcs: [
        { id: "clone-saga", name: "Clone Saga", issues: [394, 395] /* ... */ },
      ],
      /* ... */
    };

    const series2: ProcessedData = {
      series: "Web of Spider-Man Vol 1",
      storyArcs: [
        { id: "clone-saga", name: "Clone Saga", issues: [117, 118] /* ... */ },
      ],
      /* ... */
    };

    const merged = mergeStoryArcs([series1, series2]);
    const cloneSaga = merged.find((a) => a.id === "clone-saga");

    expect(cloneSaga?.series).toEqual([
      "Amazing Spider-Man Vol 1",
      "Web of Spider-Man Vol 1",
    ]);
    expect(cloneSaga?.type).toBe("crossover");
  });
});
```

### Integration Tests

**File**: `src/__tests__/integration/storyArcScraping.test.ts`

```typescript
describe("Story Arc Scraping Integration", () => {
  test("scrapes arcs from real issue page", async () => {
    // Use cached HTML from known issue with arcs
    const html = fs.readFileSync(
      "src/__tests__/fixtures/web-of-spider-man-117.html",
      "utf-8",
    );

    const scraper = new MarvelScraper();
    const result = scraper.parseStoryArcs(html, 117);

    expect(result?.storyArcs).toContain("clone-saga");
    expect(result?.storyArcs).toContain("power-and-responsibility");
  });

  test("full pipeline: scrape → process → visualize", async () => {
    // Test complete flow with story arcs
    const scraper = new MarvelScraper();
    const rawData = await scraper.scrapeIssues(
      [19],
      "Amazing Spider-Man Vol 1",
    );

    const processed = processVillainData(rawData);
    expect(processed.storyArcs).toBeDefined();

    const d3Config = generateD3Config(processed);
    expect(d3Config.arcs).toBeDefined();
  });
});
```

---

## Future Visualization Integration

### Grid/Elastic Timeline Enhancements (Phase 2)

1. **Arc Bands**
   - Horizontal colored bands spanning arc duration
   - Semi-transparent background highlighting
   - Label at start/end of arc

2. **Arc Indicators**
   - Icon/badge on issues that are part of arcs
   - Different colors per arc (consistent hashing)
   - Tooltip showing arc name and duration

3. **Arc Filtering**
   - Toggle arc visibility
   - Filter timeline to show only issues in specific arcs
   - "Show all Clone Saga issues"

4. **Arc Navigation**
   - Click arc band to highlight all issues in arc
   - Jump to arc start/end
   - Arc timeline overview

5. **Multi-Series Visualization**
   - Show arcs spanning multiple series
   - Crossover indicators
   - Event timelines

### Example Visual Design

```
Issue #1  #2  #3  #4  #5  #6  #7  #8  #9  #10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ┌─── Test Arc ───┐
          │  (issues 3-6)  │
          └────────────────┘
                    ┌────── Another Arc ──────┐
                    │    (issues 5-10)        │
                    └─────────────────────────┘
```

---

## Data Migration

**Not Required**: This is new data. Existing data structures remain valid.

- No migration of existing files needed
- New scrapes will include story arc data
- Old data remains functional without arc fields

---

## Performance Considerations

### Scraping Impact

- **Additional parsing**: ~50-100ms per issue (categories extraction)
- **Total overhead**: < 5% increase in scrape time
- **Mitigation**: Parallel parsing, no additional HTTP requests

### Storage Impact

- **Per issue**: +50-200 bytes (arc IDs and metadata)
- **Per series**: +1-5 KB (arc summaries)
- **Total**: Negligible (< 1% increase)

---

## Implementation Checklist

- [ ] Create `StoryArc` interface in `types.ts`
- [ ] Create `ArcType` type in `types.ts`
- [ ] Update `IssueData` interface in `types.ts`
- [ ] Update `ProcessedData` interface in `types.ts`
- [ ] Update `TimelineData` interface in `types.ts`
- [ ] Update `D3DataPoint` and `D3Config` interfaces in `types.ts`
- [ ] Add `parseStoryArcs()` to `marvelScraper.ts`
- [ ] Add `createArcId()` helper to `marvelScraper.ts`
- [ ] Update `scrapeIssue()` in `marvelScraper.ts`
- [ ] Add `buildStoryArcs()` to `processVillainData.ts`
- [ ] Update `processVillainData()` in `processVillainData.ts`
- [ ] Create `mergeStoryArcs()` in `mergeSeriesData.ts`
- [ ] Update D3 config generation with arc data
- [ ] Add `assignArcColor()` helper for arc visualization
- [ ] Create `storyArcs.test.ts` unit tests
- [ ] Create integration test for arc scraping
- [ ] Create test fixtures with arc HTML
- [ ] Test with known arc examples (Clone Saga, etc.)
- [ ] Update documentation with examples
- [ ] Create visualization mockups/designs

---

## Success Criteria

1. ✅ Story arcs are correctly extracted from Marvel Fandom categories
2. ✅ Arc data is properly aggregated across issues
3. ✅ Multi-series arcs are identified and merged
4. ✅ Arc type inference works for common patterns
5. ✅ Data structures support arc visualization
6. ✅ Existing functionality remains unaffected
7. ✅ Tests achieve >90% coverage for new code
8. ✅ No performance degradation in scraping (< 5% overhead)
9. ✅ Documentation is complete with real examples

---

## Known Edge Cases

### Category Ambiguity

- Some categories may be both character names AND arc names
- **Solution**: Use exclude patterns and manual review of uncategorized

### Arc Name Variations

- "Clone Saga" vs "Clone Saga Part 1" vs "The Clone Saga"
- **Solution**: Normalize names, use ID-based matching

### Retroactive Arcs

- Modern Marvel Fandom may retroactively apply arc names to old issues
- **Solution**: Accept current categorization, note in documentation

### Incomplete Arcs

- Some arcs may span issues we haven't scraped yet
- **Solution**: Track partial arcs, update as more issues are scraped

---

## Timeline Estimate

- **Specification**: ✅ Complete
- **Implementation**: 10-14 hours
  - Type definitions: 1 hour
  - Scraping logic: 3-4 hours
  - Processing logic: 3-4 hours
  - Merge logic: 2-3 hours
  - Testing: 2-3 hours
  - Documentation: 1 hour
- **Testing & Refinement**: 2-4 hours
- **Visualization Design**: 4-6 hours (separate phase)

**Total (without visualization)**: 12-18 hours  
**Total (with visualization)**: 16-24 hours

---

## Related Documentation

- [Appearance Metadata Specification](./APPEARANCE_METADATA_SPEC.md)
- [Types Documentation](./FUNCTIONAL_DOCUMENTATION.md#type-definitions)
- [Scraper Documentation](./FUNCTIONAL_DOCUMENTATION.md#marvel-scraper)
- [Merge Logic Documentation](./DATA_FLOW_DIAGRAM.md)

---

## Example Output

### Scraped Issue Data

```json
{
  "issueNumber": 117,
  "title": "Web of Spider-Man #117",
  "releaseDate": "1994-05-01",
  "antagonists": [...],
  "storyArcs": [
    {
      "url": "https://marvel.fandom.com/wiki/Category:Power_and_Responsibility",
      "id": "power-and-responsibility",
      "name": "Power and Responsibility"
    },
    {
      "url": "https://marvel.fandom.com/wiki/Category:Clone_Saga",
      "id": "clone-saga",
      "name": "Clone Saga"
    }
  ],
  "rawArcData": {
    "categories": [
      "Comics",
      "Web of Spider-Man Vol 1",
      "Power and Responsibility",
      "Clone Saga",
      "1994",
      "May"
    ],
    "arcCategories": [
      "Power and Responsibility",
      "Clone Saga"
    ]
  }
}
```

### Processed Story Arc

```json
{
  "url": "https://marvel.fandom.com/wiki/Category:Clone_Saga",
  "id": "clone-saga",
  "name": "Clone Saga",
  "type": "saga",
  "issues": [117, 118, 119, 120, 394, 395, 396],
  "series": ["Web of Spider-Man Vol 1", "Amazing Spider-Man Vol 1"],
  "startIssue": 117,
  "endIssue": 396,
  "issueCount": 7
}
```

### D3 Config with Arcs

```json
{
  "data": [...],
  "scales": {...},
  "colors": {...},
  "arcs": [
    {
      "url": "https://marvel.fandom.com/wiki/Category:Clone_Saga",
      "id": "clone-saga",
      "name": "Clone Saga",
      "startIssue": 117,
      "endIssue": 396,
      "color": "hsl(240, 65%, 55%)"
    }
  ]
}
```
