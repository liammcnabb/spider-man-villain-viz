# Spider-Man Villain Timeline - Architecture

## CHECKPOINT 2: Workflow Separation Architecture

The system now uses a **runner-based architecture** with clean separation between scraping, processing, merging, and publishing workflows. Each step can be run independently or composed into a complete pipeline.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ CLI Layer (src/index.ts + src/pipeline.ts)                      │
│ - parseCommandArgs() parses 6 commands                          │
│ - Delegates to appropriate runner                               │
│ - Handles user-facing IO and formatting                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        ▼              ▼              ▼              ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │ Scrape  │   │ Process │   │  Merge  │   │Publish  │
   │ Runner  │   │ Runner  │   │ Runner  │   │         │
   └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
   ┌─────────────────────────────────────────────────────┐
   │ Data Layer                                          │
   │ raw.{Series}.json → villains.{Series}.json ─────┐  │
   │                  → d3-config.{Series}.json ─────┼──┤
   │                                                  │  │
   │ villains.*.json ──→ villains.json ──────────────┼──┤
   │                  → d3-config.json ──────────────┘  │
   │                                                     │
   │ public/data/ ←── (Published Files)                  │
   └─────────────────────────────────────────────────────┘
        │
        ▼
   ┌─────────────────────────────────────────────────────┐
   │ Presentation Layer (Frontend)                       │
   │ - D3.js visualization                               │
   │ - Interactive timeline graph                        │
   │ - HTML5/CSS3 interface                              │
   └─────────────────────────────────────────────────────┘
```

## Workflow Runners

### 1. ScrapeRunner (`src/utils/ScrapeRunner.ts`)

**Responsibility**: Extract raw data from Marvel Fandom

**Input**: 
- Series name: `"Amazing Spider-Man Vol 1"`
- Issue numbers: `[1, 2, 3, ..., 20]`

**Output**: 
- File: `data/raw.{Series}.json`

**Process**:
1. Validates issue numbers
2. Uses MarvelScraper to fetch HTML for each issue
3. Respects 1-second delay between requests (rate limiting)
4. Saves raw issue data including:
   - Issue number and title
   - Release date
   - Antagonists (name, URL, image URL)

**Series Name Extraction**:
- The MarvelScraper now extracts the full series name from the URL template
- Example: URL template `https://marvel.fandom.com/wiki/Amazing_Spider-Man_Vol_1_{issue}` 
  extracts to `"Amazing Spider-Man Vol 1"` (not just `"Amazing"`)
- This ensures proper matching in placement hint resolution during merge process
- Private method: `extractSeriesSlugFromTemplate()` handles URL parsing

**Methods**:
```typescript
async run(options: ScrapeOptions): Promise<RawVillainData>
async runMultipleSeries(seriesConfigs: Array<...>): Promise<void>
```

### 2. ProcessRunner (`src/utils/ProcessRunner.ts`)

**Responsibility**: Process raw data into villain datasets

**Input**: 
- File: `data/raw.{Series}.json`
- Optional: Series name (derives input path)

**Output**:
- File: `data/villains.{Series}.json` (processed villain data)
- File: `data/d3-config.{Series}.json` (D3 visualization config)

**Process**:
1. Reads raw.{Series}.json
2. Normalizes villain names and aliases
3. Tracks appearances and frequencies
4. Validates data (optional)
5. Generates D3 configuration

**Methods**:
```typescript
async run(options: ProcessOptions): Promise<SerializedProcessedData>
async runMultipleSeries(seriesNames: string[]): Promise<void>
```

### SeriesName Utility (`src/utils/seriesName.ts`)

**Responsibility**: Handle series name format inconsistencies

**Problem Solved**: 
Before this utility, series names appeared in two formats throughout the codebase:
- Display format (spaces): `"Amazing Spider-Man Vol 1"` - human-readable
- Slug format (underscores): `"Amazing_Spider-Man_Vol_1"` - for filenames/URLs

This caused:
- ❌ Color mapping failures (map had spaces, data had underscores)
- ❌ Series comparison failures (different formats didn't match)
- ❌ Duplicate entries in configuration dictionaries
- ❌ Fragile string manipulation scattered throughout codebase

**Solution**:
The `SeriesName` class provides:
- ✅ Automatic normalization - accepts any format, normalizes internally
- ✅ Format conversion - `.toDisplay()` and `.toSlug()` methods
- ✅ Format-agnostic comparison - `.equals()` handles both formats
- ✅ Centralized logic - one place to maintain series name handling

**Key Methods**:
```typescript
// Create from any format
const series = new SeriesName('Amazing_Spider-Man_Vol_1');

// Format conversion
series.toDisplay()  // "Amazing Spider-Man Vol 1"
series.toSlug()     // "Amazing_Spider-Man_Vol_1"

// Format-agnostic comparison (case-insensitive)
series.equals('Amazing Spider-Man Vol 1')     // true
series.equals('Amazing_Spider-Man_Vol_1')     // true
series.equals('amazing spider-man vol 1')     // true

// Color lookup (format-agnostic)
getSeriesColor('Amazing_Spider-Man_Vol_1')    // '#e74c3c'
getSeriesColor('Amazing Spider-Man Vol 1')    // '#e74c3c' (same!)

// Static utilities
SeriesName.normalize('Amazing_Spider-Man_Vol_1')        // "Amazing Spider-Man Vol 1"
SeriesName.fromFilePath('data/villains.Amazing_Spider-Man_Vol_1.json')  // SeriesName instance
SeriesName.getSupportedSeries()                         // Array of all series
SeriesName.isSupported('Amazing Spider-Man Vol 1')      // true
```

**Integration Points**:
- `cliParser.ts` - Normalizes CLI arguments (accepts both formats)
- `ScrapeRunner.ts` - Uses `.toSlug()` for consistent file naming
- `ProcessRunner.ts` - Uses `.toSlug()` for consistent file naming
- `public/script.js` - Color map supports both formats

**Test Coverage**: 52 comprehensive tests covering normalization, comparison, format conversion, file path parsing, and integration scenarios.

**Documentation**: See [docs/SERIES_NAME_UTILITY.md](./SERIES_NAME_UTILITY.md) for complete API reference and integration guide.

### 3. MergeRunner (`src/utils/MergeRunner.ts`)

**Responsibility**: Combine series datasets into unified output

**Input**: 
- Files: `data/villains.*.json` (all series-specific files)

**Output**:
- File: `data/villains.json` (combined)
- File: `data/d3-config.json` (combined D3 config)

**Process**:
1. Discovers all `villains.{Series}.json` files
2. Loads each dataset
3. Merges villains (combines appearances, deduplicates)
4. Reconciles duplicate identities
5. Generates combined D3 config

**Methods**:
```typescript
async run(options: MergeOptions): Promise<SerializedProcessedData>
```

### 4. Publisher (`src/utils/Publisher.ts`)

**Responsibility**: Copy processed files to public directory

**Input**: 
- Source directory: `data/`
- Destination: `public/data/`

**Output**:
- Copies all `.json` files to public directory

**Process**:
1. Discovers all data files
2. Copies to `public/data/`
3. Handles directory creation
4. Logs success/failures

**Methods**:
```typescript
async run(options: PublishOptions): Promise<void>
async publishFiles(filenames: string[], ...): Promise<void>
```

## Data Flow

### Complete Pipeline

```
Step 1: SCRAPE
   npm run scrape -- --series "ASM Vol 1" --issues 1-20
   
   MarvelFandom → HTML → Parser → raw.Amazing_Spider-Man_Vol_1.json
   
Step 2: PROCESS
   npm run process -- --series "ASM Vol 1" --validate
   
   raw.{Series}.json → Normalize → Process → Validate
   ├─ villains.{Series}.json
   └─ d3-config.{Series}.json
   
Step 3: MERGE
   npm run merge
   
   villains.*.json → Deduplicate → Merge → Combine
   ├─ villains.json
   └─ d3-config.json
   
Step 4: PUBLISH
   npm run publish
   
   data/*.json → Copy → public/data/
   
Step 5: SERVE
   npm run serve
   
   Browser ← public/ ← HTTP Server (port 8000)
```

### One-Command Pipeline

```bash
npm run pipeline -- --series "ASM Vol 1" --issues 1-20

# Internally executes:
1. ScrapeRunner.run()
2. ProcessRunner.run()
3. MergeRunner.run()
4. Publisher.run()
```

## System Overview (Original)

The Spider-Man Villain Timeline project follows the Context Engineering Protocol and is structured as a three-layer system:

```
┌─────────────────────────────────────────────────────────┐
│ Presentation Layer (Frontend)                           │
│ - D3.js visualization                                   │
│ - Interactive timeline graph                            │
│ - HTML5/CSS3 interface                                  │
└────────────┬────────────────────────────────────────────┘
             │
             │ (reads from)
             │
┌────────────▼────────────────────────────────────────────┐
│ Data Layer                                              │
│ - villains.json (normalized data)                       │
│ - Issue/antagonist relationships                        │
│ - Static JSON API                                       │
└────────────┬────────────────────────────────────────────┘
             │
             │ (generated by)
             │
┌────────────▼────────────────────────────────────────────┐
│ Processing Layer (Node.js/TypeScript)                   │
│ - Scraper: Extracts from Marvel Fandom                  │
│ - Parser: Converts HTML to structured data              │
│ - Processor: Normalizes and validates                   │
└─────────────────────────────────────────────────────────┘
```

## Identity Policy

**Historical Entity Separation** (No Retroactive Reconciliation)

The system maintains distinct identities for the same entity when its identity basis changes:

- **URL-sourced identity**: Villain identified by Marvel Fandom URL (canonical, always preferred)
- **Name-sourced identity**: Villain identified only by name (fallback when no URL available)

**Key Principle**: Once an entity is stored as name-only, adding a URL in a later issue does **NOT** retroactively merge them. They remain separate historical records.

**Example**:
```
Issue 1: "The Rose" (name-only) → identitySource: 'name'
Issue 2: "The Rose" with URL → identitySource: 'url'

Result: TWO separate villain entries (not merged)
- Rose #1 (name-only): appears only in issue 1
- Rose #2 (URL-identified): appears only in issue 2
```

This preserves historical accuracy and prevents data conflicts when same names refer to different entities across different eras.

### Entity Identity Strategy
- **Primary key**: Marvel Fandom URL slug (when available)
- **Fallback key**: Normalized villain name (when no URL)
- **Identity immutability**: Once set, identity source never changes (no reconciliation)
- **Field tracking**: `identitySource: 'url' | 'name'` transparently shows basis of identity

## Component Architecture

### 1. Scraper Module (`src/scraper/`)

**Purpose**: Extract villain data from Marvel Fandom website

**Components**:

#### `marvelScraper.ts`
- Main scraper orchestrator
- Handles HTTP requests to Marvel Fandom
- Manages request rate limiting and error handling
- Coordinates issue-by-issue extraction

**Key Functions**:
```typescript
scrapeAmazingSpiderManVol1(startIssue: number, endIssue: number)
  → Promise<ScrapedData>

getIssueUrl(issueNumber: number) → string
```

**Data Flow**:
```
Issue Number → URL Generation
   ↓
HTTP Request → Marvel Fandom
   ↓
HTML Response → HTML Parser
   ↓
Parsed Structure → Villain Extractor
   ↓
Villain List → Normalization
```

#### `parser.ts`
- HTML parsing and extraction logic
- Uses Cheerio to select DOM elements
- Extracts antagonist section from issue pages
- Handles different HTML structures

**Key Functions**:
```typescript
parseAntagonistsFromHtml(html: string) → string[]

extractIssueInfo(html: string) → IssueInfo
```

### 2. Utilities Module (`src/utils/`)

#### `dataProcessor.ts`
- Normalizes villain names (removes duplicates, aliases)
- Structures data for D3.js consumption
- Validates data integrity
- Generates statistics

**Key Functions**:
```typescript
processVillainData(rawData: RawVillainData) → ProcessedData

normalizeVillainName(name: string) → string

generateVillainStats(data: ProcessedData) → VillainStats
```

**Normalization Rules**:
- Remove duplicate entries
- Standardize name formatting
- Handle aliases (e.g., "Green Goblin" / "Norman Osborn")
- Track first appearance

### 3. Visualization Module (`src/visualization/`)

#### `d3Graph.ts`
- Generates D3.js visualization configuration
- Creates data structure for graph rendering
- Exports visualization logic to frontend

**Key Functions**:
```typescript
generateD3Config(data: ProcessedData) → D3Config

formatDataForTimeline(data: ProcessedData) → TimelineData[]
```

### 4. Frontend (`public/`)

#### `index.html`
- Main HTML structure
- D3.js and utility script imports
- Visualization container

#### `script.js`
- Client-side D3.js rendering
- Interactive features (hover, filter, zoom)
- Event handling for user interactions

#### `style.css`
- Styling for timeline
- Responsive design
- Color scheme for villains

## Data Models

### Input Data Structure (from scraping)

```typescript
interface IssueData {
  issueNumber: number;
  title: string;
  publicationDate?: string;
  antagonists: string[];  // Raw villain names from page
}
```

### Processed Data Structure

```typescript
interface ProcessedVillain {
  id: string;                           // Unique identifier
  name: string;                         // Primary name (most frequent alias)
  names: string[];                      // All name variants/aliases
  url?: string;                         // Marvel Fandom URL (canonical identifier)
  imageUrl?: string;                    // Character portrait from Marvel Fandom
  identitySource: 'url' | 'name';       // Basis of identity (see Identity Policy)
  firstAppearance: number;              // Issue number of first appearance
  appearances: number[];                // All issues where villain appears
  frequency: number;                    // Total number of appearances
  kind?: EntityKind;                    // Classification: 'individual' or 'group'
}

interface TimelineData {
  issue: number;
  releaseDate?: string;                 // Publication date for chronology
  villains: ProcessedVillain[];
  villainCount: number;
  groups?: GroupAppearance[];           // Group appearances in this issue
}
```

**Identity Tracking**:
- `identitySource = 'url'`: Entity keyed by Marvel Fandom URL (primary key)
- `identitySource = 'name'`: Entity keyed by normalized name (fallback key)
- Entities with different `identitySource` values remain separate even if names match

### Serialized Data Structure

```typescript
interface SerializedProcessedData {
  series: string;
  processedAt: string;
  stats: {
    totalVillains: number;
    mostFrequent: string;
    mostFrequentCount: number;
    averageFrequency: number;
  };
  villains: Array<{
    id: string;
    name: string;
    aliases: string[];
    url?: string;
    imageUrl?: string;
    identitySource: 'url' | 'name';     // Preserved in serialization
    firstAppearance: number;
    appearances: number[];
    frequency: number;
  }>;
  timeline: Array<{...}>;
  groups?: Array<{...}>;
}
```

This is the JSON structure written to `villains.{Series}.json` files.

### D3 Visualization Data

```typescript
interface D3DataPoint {
  issueNumber: number;
  chronologicalPosition?: number;
  series?: string;
  releaseDate?: string;
  villainsInIssue: string[];          // Names of villains in this issue
  villainCount: number;
}

interface D3Config {
  data: D3DataPoint[];
  scales: {
    x: D3Scale;                        // Issue number scale
    y: D3Scale;                        // Villain frequency scale
  };
  colors: Map<string, string>;         // Villain ID -> color mapping
}
```

**Note**: D3 visualization receives `identitySource` information through villain IDs and URLs, allowing proper filtering and display of distinct entities even when names match.

## Group Classification & Registry

### GroupRegistry (`src/utils/groupRegistry.ts`)

**Purpose**: Single source of truth for identifying antagonist groups vs individuals

**Pattern**: Singleton registry with curated group definitions

**Architecture**:
```typescript
class GroupRegistry {
  private static instance: GroupRegistry;
  private groupMap: Map<string, GroupRegistryEntry>;
  private auditLog: AuditEntry[];

  // Methods:
  resolveGroup(name: string): { id, canonicalName } | null
  isKnownGroup(name: string): boolean
  getCanonicalName(name: string): string
  getAllGroups(): GroupRegistryEntry[]
  getAuditLog(eventType?): AuditEntry[]
}
```

**Registered Groups** (16 curated groups):
- Sinister Six (aliases: "The Sinister Six", "Sinister 6")
- Enforcers, Masters of Evil, Emissaries of Evil
- Nasty Boys, Kingpin's Henchmen, Maggia
- The Syndicate, Wild Pack, Thieves Guild
- Hydra, AIM, Roxxon Security
- Hammerhead Gang, Scorpion Gang
- Savage Land Mutates, Circus of Crime

**Features**:
- ✅ Case-insensitive alias resolution
- ✅ Whitespace normalization (single spaces, trimmed)
- ✅ Deterministic ID generation (lowercase, hyphens)
- ✅ Audit trail of all lookups and registrations
- ✅ Enable/disable audit logging for performance

### Classification Process (`src/utils/groupClassifier.ts`)

**Flow**:
```
classifyKind(name) 
  ├─ Check GroupRegistry.isKnownGroup(name)
  │  └─ If found → return 'group'
  │
  └─ Check fallback keyword patterns (Henchmen, Gang, Crew, Squad, etc.)
     └─ If matched → return 'group'
     └─ Else → return 'individual'
```

**Fallback Patterns** (dynamic group detection):
- Keyword-based: "Henchmen", "Gang", "Crew", "Squad", "Syndicate", "Enforcers", "Six"
- Structural: "Team", "Brigade", "Guard", "Force"
- Organization: "Thieves", "Association", "Society", "League", "Alliance"
- Plural groups: "Thugs", "Mercenaries", "Soldiers", "Minions"

### Member Derivation (Issue-Based)

**Principle**: Group members are derived from same-issue villains only

**Implementation** in `dataProcessor.ts` `generateTimeline()`:
```typescript
for each issue {
  villainsInIssue = villains appearing in this issue
  for each group appearing in this issue {
    members = villainsInIssue.map(v => v.name)
    
    // This creates a GroupAppearance with issue-specific roster
    groupAppearances.push({
      id: group.id,
      name: group.name,
      issue: issueNumber,
      members: members  // ISSUE-SPECIFIC ONLY
    })
  }
}
```

**Example**:
```
Issue 5: Sinister Six appears with [Electro, Kraven, Vulture]
Issue 50: Sinister Six appears with [Doctor Octopus, Mysterio, Sandman]

These are stored as TWO separate GroupAppearance objects:
- GroupAppearance { issue: 5, members: [...] }
- GroupAppearance { issue: 50, members: [...] }

Not reconciled into a combined roster!
```

## Data Flow Pipeline

```
1. SCRAPING PHASE
   Marvel Fandom URLs
        ↓
   HTTP Requests (Axios)
        ↓
   Raw HTML (per issue)
        ↓
   Cheerio Parsing
        ↓
   Extracted Antagonists List (name + optional URL)

2. PROCESSING PHASE (IDENTITY & GROUP CLASSIFICATION APPLIED HERE)
   Raw Villain Lists
        ↓
   For each antagonist:
   - Classify: classifyKind(name) → 'individual' or 'group'
   - If group: GroupRegistry.isKnownGroup(name) for canonical name
   - If individual: Key by URL (if available) or name
        ↓
   Normalization (deduplicate, standardize names)
        ↓
   Structure Building (create villain records, track appearances)
   [Individuals: separate entries for URL vs name keys]
   [Groups: tracked in groupMap with per-issue member lists]
        ↓
   Timeline Generation
   [Group appearances include issue-specific member rosters]
        ↓
   Validation (ensure data consistency)
        ↓
   Statistics Generation

3. OUTPUT PHASE
   ProcessedData (with identitySource field and groups array)
        ↓
   JSON Serialization (SerializedProcessedData)
        ↓
   villains.{Series}.json (includes group definitions)
   d3-config.{Series}.json (includes group timeline data)
        ↓
   Read by Merge & Frontend

4. MERGE PHASE
   Multiple series villains.{Series}.json files
        ↓
   Combine while respecting identity boundaries AND group separation
   [name-only entities stay separate from URL entities]
        ↓
   villains.json (combined dataset)

5. VISUALIZATION PHASE
   villains.json
        ↓
   D3 Data Transform
        ↓
   Scale Generation
        ↓
   SVG Rendering
        ↓
   Interactive Timeline
```

## Error Handling Strategy

### Scraping Layer
- Network errors → Retry with exponential backoff
- Parse errors → Log and skip issue
- Missing data → Mark as "antagonists not found"

### Processing Layer
- Invalid data → Log warning, attempt recovery
- Normalization conflicts → Manual review flag

### Visualization Layer
- Missing data files → Display error message
- Invalid JSON → Render error state
- Empty datasets → Display "no data" message

## Extension Points

### Add a New Series (e.g., Ultimate Spider-Man)

1. Create new scraper method in `marvelScraper.ts`:
```typescript
scrapeUltimateSpiderMan(startIssue: number, endIssue: number)
```

2. Add series selection to CLI

3. Update visualization to handle multiple series

### Add Analysis Features

1. Add functions to `dataProcessor.ts`:
```typescript
getVillainTrends()
getEraAnalysis()
```

2. Expose via CLI commands

3. Visualize in frontend

### Add New Visualization Types

1. Create new module: `src/visualization/newVizType.ts`

2. Implement D3 rendering logic

3. Add toggle in frontend

## Performance Considerations

- **Scraping**: Sequential requests to avoid overwhelming server
- **Memory**: Process data in chunks for large datasets
- **D3 Rendering**: Use canvas for 1000+ data points
- **Caching**: Store scraped data to avoid repeated requests

## Security Notes

- No sensitive data handled
- Web scraping respects robots.txt
- No authentication required
- Data is static JSON only

## Context Engineering Integration

This project implements the Context Engineering Protocol:

### Tool Definitions
- **scraper**: Extract villain data
- **processor**: Normalize and validate
- **visualizer**: Generate D3 config

### Context Building
- User provides issue range
- System determines required tools
- Tools executed in dependency order

### Feedback Loop
- Scraping success rate tracked
- Data quality metrics recorded
- Visualization rendering performance monitored

See [Context Engineering Template](../../context-engineering-template/) for protocol details.
