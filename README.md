# This repo is entirely written by Claude as a public example of a workflow. Since I do not pay for any AI, progress is limited by the amount of tokens I get per month.

# Spider-Man Villain Timeline

A visualization of Spider-Man villain appearances across the Amazing Spider-Man Vol. 1 comic book series (first 20 issues).

## 🚨 For AI Agents

**MUST READ FIRST:** [AGENT_WORKFLOW_RULES.md](AGENT_WORKFLOW_RULES.md)
- Verification requirements (always check compiled output)
- Scraping guidelines (almost never necessary)
- Common failure patterns to avoid

## Project Overview

This project visualizes the chronological appearances of villains in the Spider-Man comics using data scraped from the Marvel Fandom website. The visualization is built with D3.js and displays which antagonists appear in each issue, allowing exploration of villain frequency and appearance patterns.

## Features

### Core Features
- **Web Scraper**: Automatically extracts antagonist information from Marvel Fandom pages
- **Data Processing**: Normalizes and structures villain data from comic issues
- **Interactive Visualization**: D3.js-based timeline graph showing villain appearances
- **Context Engineering**: Follows the context engineering protocol for maintainability and clarity

### Grid Visualization Features ✨ NEW
- **Data Filtering**: Hide villains with fewer than X appearances (default: 3)
- **Flexible Sorting**: Sort Y-axis by first appearance or longest chronological span
- **Magnification Controls**: Zoom from 0.5x to 16x with smooth 300ms transitions
- **Fullscreen Mode**: Present data on large screens with ESC to exit
- **Dark Theme**: Professional dark mode with automatic OS detection and persistent preferences
  - Light theme: Light gray background (#f5f5f5) with dark text
  - Dark theme: Dark background (#1a1a1a) with light text
  - Theme toggle button (🌙/☀️) in top-right corner
  - System preference auto-detection on first visit
  - Preference saved to localStorage

See [COMPLETE_FEATURE_SET.md](COMPLETE_FEATURE_SET.md) for comprehensive feature documentation.

## Tech Stack

- **Frontend**: D3.js, HTML5, CSS3
- **Backend/Scraping**: Node.js + TypeScript, Cheerio, Axios
- **Build Tool**: TypeScript, npm

## Project Structure

```
spider-man-villain-timeline/
├── src/
│   ├── index.ts              # Main CLI entry point (6 commands)
│   ├── pipeline.ts           # Complete pipeline runner
│   ├── scraper/
│   │   └── marvelScraper.ts  # Marvel Fandom web scraper
│   ├── visualization/
│   │   └── d3Graph.ts        # D3.js visualization logic
│   └── utils/
│       ├── ScrapeRunner.ts      # Scraping orchestration
│       ├── ProcessRunner.ts     # Processing orchestration
│       ├── MergeRunner.ts       # Merging orchestration
│       ├── Publisher.ts         # Publishing orchestration
│       ├── commandParser.ts     # CLI argument parser
│       └── dataProcessor.ts     # Data normalization
├── data/
│   ├── raw.{Series}.json                 # Raw scraped data
│   ├── villains.{Series}.json            # Processed per-series data
│   ├── d3-config.{Series}.json           # D3 config per-series
│   ├── villains.json                     # Combined merged data
│   └── d3-config.json                    # Combined D3 config
├── public/
│   ├── index.html            # Main HTML page
│   ├── style.css             # Styling
│   ├── script.js             # Client-side D3 rendering
│   └── data/                 # Published data files
├── docs/
│   ├── ARCHITECTURE.md       # System architecture
│   ├── CHECKPOINT_2_COMPLETION.md  # CHECKPOINT 2 report
│   └── REFACTOR_CHECKLIST.md # Refactoring progress
├── package.json
├── tsconfig.json
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Python 3.8+ (for serving if needed)

### Installation

```bash
# Clone or navigate to project directory
cd spider-man-villain-timeline

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Running the Complete Pipeline

The easiest way to run everything is the **complete pipeline** command:

```bash
# Run all steps: scrape → process → merge → publish
npm run pipeline -- --series "Amazing Spider-Man Vol 1" --issues 1-50

# Or use full series
npm run pipeline -- --series "Untold Tales of Spider-Man Vol 1"
```

### Individual Commands

You can also run each step separately:

#### 1. Scrape Raw Data
```bash
# Scrape all series
npm run scrape -- --all-series

# Scrape specific series
npm run scrape -- --series "Amazing Spider-Man Vol 1" --issues 1-100

# Scrape specific issue range
npm run scrape -- --issues 1-20

# Scrape specific issues
npm run scrape -- --issues 1,5,10,20

# Scrape multiple ranges and specific issues
npm run scrape -- --issues 1-20,50-60,100

# Fast dev (avoid long scrapes)
npm run scrape -- --issues 1-20
```

### Processing Data (Process Phase - No Scraping Needed!)

**⚡ Test the merge logic without scraping:**

```bash
# Process existing JSON files instantly (< 1 second)
npx ts-node test-merge-logic.ts
```

This loads existing series JSON files and tests the data merge logic.

**See docs for more:** [PULL_AND_PROCESS.md](docs/PULL_AND_PROCESS.md)

### View Results

```bash
npm run serve
# Opens http://localhost:8000
```

This creates:
- `data/villains.json` - Combined data for all series
- `data/d3-config.json` - Visualization configuration

#### Scraping Options

- `--issues, -i <spec>`: Specify which issues to scrape
  - Single issue: `1`
  - Range: `1-20`
  - Multiple issues: `1,5,10,20`
  - Combined: `1-20,50-60,100`
  
- `--volume, -v <name>`: Specify which volume to scrape (default: "Amazing Spider-Man Vol 1")
  - Currently supports: Vol 1 (1-441), Vol 2 (1-58), Vol 3 (1-20), Vol 4 (1-32), Vol 5 (1-93)

### Viewing the Visualization

```bash
# Start a local HTTP server
npm run serve
```

Then open `http://localhost:8000` in your browser.

## Architecture: Pull → Process → Publish

The data pipeline is separated into three independent phases:

```
Pull Phase          Process Phase         Publish Phase
(Scraping)          (Merge & Transform)   (Visualize & Output)
─────────────────────────────────────────────────────────
Marvel Fandom  →  mergeDatasets()  →  D3.js visualization
JSON Files     →  (mergeDatasets.ts) → HTML/Browser
```

### Phase Separation Benefits

**Pull (Scraping)**
- Fetches data from Marvel Fandom
- Creates series-specific JSON files
- Can be run independently
- Command: `npm run scrape -- --all-series`

**Process (Merge & Transform)**
- Pure function: `mergeDatasets(datasets)` in `src/utils/mergeDatasets.ts`
- No I/O dependencies
- Can be tested without scraping
- Command: `npx ts-node test-merge-logic.ts`

**Publish (Visualization)**
- Generates D3 configs and HTML
- Updates public data directory
- Can reuse existing data files

### Development Workflow

For **data processing changes** (fast iteration):
```bash
# 1. Edit src/utils/mergeDatasets.ts
# 2. Rebuild
npm run build
# 3. Test immediately (no scraping!)
npx ts-node test-merge-logic.ts
# Verification: < 1 second ⚡
```

For **complete pipeline**:
```bash
npm run build      # Build TypeScript
npm test           # Run 93 unit tests
npm run scrape -- --all-series  # Scrape all data
npm run serve      # View in browser
```

**See [docs/PULL_AND_PROCESS.md](docs/PULL_AND_PROCESS.md) for detailed workflow.**

## Development

### Project Setup with Context Engineering

This project uses the Context Engineering Protocol for:
- Clear component boundaries
- Documented tool definitions
- Feedback-driven optimization
- Proof steps for testing

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

### Code Guidelines

Follow the standards in [GUIDELINES.md](docs/GUIDELINES.md):
- Max 110 character line length
- Max 3 levels of nesting
- Max 80 lines per function
- TypeScript strict mode enabled

### Testing Strategy

```bash
# Fast data processing tests (< 1 second)
npx ts-node test-merge-logic.ts

# Full unit test suite (93 tests)
npm test

# With coverage
npm test -- --coverage
```

### Workflow

1. **Pull (Scraping)**: `src/scraper/` handles Marvel Fandom extraction
2. **Process (Merging)**: `src/utils/mergeDatasets.ts` normalizes and deduplicates data
3. **Visualization**: `src/visualization/` generates D3.js logic
4. **Frontend**: `public/` contains the interactive interface

## Next Steps

### Short Term
- [x] Complete scraper for issues 1-20
- [x] Create basic D3 timeline visualization
- [x] Separate pull and process logic
- [ ] Add interactive filtering by villain
- [x] Create specific D3 gantt plot to explore as one chart

### Medium Term
- [ ] Extend scraper to all 800+ issues
- [ ] Add villain statistics (first appearance, frequency)
- [ ] Implement villain relationship visualization
- [ ] Extend Interaction with the marvel fandom website
- [ ] Consider Arc's/Saga's ([Part of the End of Spider-Man arc](https://marvel.fandom.com/wiki/End_of_Spider-Man))

### Long Term
- [ ] Support multiple Spider-Man series (2099, Ultimate, etc.)
- [ ] Add comics from other Marvel properties
- [ ] Historical analysis of villain popularity trends


## Coverage Checklist

Maintenance note: Keep this checklist up to date after scrapes; tick items once series/annuals appear in `data/` and `public/data/`.

- Amazing Spider-Man (Primary canon)
  - [x] Vol. 1 (1963–1998) #1–441
  - [ ] Vol. 2 (1999–2003) #1–58
  - [ ] Vol. 1 resumed #500–545
  - [ ] Vol. 3 (2014–2015) #1–18
  - [ ] Vol. 4 (2015–2018) #1–32, #789–801
  - [ ] Vol. 5 (2018–2022) #1–93
  - [ ] Vol. 6 (2022–2024) #1–60
  - [ ] Vol. 7 (2024–present)

- Peter Parker, The Spectacular Spider-Man
  - [ ] Vol. 1 (1976–1998)
  - [ ] Vol. 2 (1999–2003)
  - [ ] Vol. 3 (2017–2018)

- Web of Spider-Man
  - [ ] Vol. 1 (1985–1995)

- Spider-Man (Adjectiveless)
  - [ ] Vol. 1 (1990–1998)
  - [ ] Vol. 2 (2004–2006)

- Sensational Spider-Man
  - [ ] Vol. 1 (1996–1998)

- Parallel Ongoings
  - [ ] Friendly Neighborhood Spider-Man Vol. 1 (2005–2007)
  - [ ] Friendly Neighborhood Spider-Man Vol. 2 (2019)
  - [ ] Spider-Man Unlimited Vol. 1 (1993–1998)
  - [x] Untold Tales of Spider-Man Vol. 1 (1995–1997)
  - [ ] Superior Spider-Man Vol. 1 (2013–2014)
  - [ ] Superior Spider-Man Vol. 2 (2018–2019)
  - [ ] The Lost Years

- Canon Minis & Events
  - [ ] Spider-Man: The Other
  - [ ] Back in Black
  - [ ] One More Day (2007)
  - [ ] Spider-Man: Blue

- Clone Saga
  - [ ] Clone Saga material (retained with revisions)

- Full Retcons
  - [ ] Sins Past (retconned 2021)

- Annuals
  - [x] Amazing Spider-Man Annual (#1–present)
  - [ ] Spectacular Spider-Man Annual
  - [ ] Web of Spider-Man Annual
  - [ ] Sensational Spider-Man Annual
  - [ ] Spider-Man (Adjectiveless) Annual

- Team-Up Books
  Note: Requires additional work to select only volumes/issues where Spider-Man is a Featured Character.
  Status: Blocked until Featured Character filtering exists.
  - [ ] Marvel Team-Up
  - [ ] Spider-Man Team-Up
  - [ ] Avenging Spider-Man
  - [ ] Spider-Man & Deadpool
  
- Extended Scope (616 Canon Spiders)
  Note: Explicitly build on separation and union — own pages, shared data, and unified form if requested.
  Status: Blocked until separation/union feature exists.

  - Miles Morales
    - [ ] Spider-Man (Miles Morales) Vol. 2 (2016–2018)
    - [ ] Miles Morales: Spider-Man Vol. 1 (2018–2022)
    - [ ] Miles Morales: Spider-Man Vol. 2 (2022–present)
    - [ ] Spider-Men (2012)
    - [ ] Spider-Men II (2017)

  - Ben Reilly (Clone Legacy)
    - [ ] Sensational Spider-Man (1996–1998)
    - [ ] Scarlet Spider Vol. 1 (1995–1996)
    - [ ] Scarlet Spider Vol. 2 (2012–2014)
    - [ ] Scarlet Spider Vol. 3 (2017)

  - Kaine Parker
    - [ ] Scarlet Spider (2012–2014)

  - Cindy Moon (Silk)
    - [ ] Silk Vol. 1 (2015)
    - [ ] Silk Vol. 2 (2015–2016)
    - [ ] Silk Vol. 3 (2021–2022)

  - Jessica Drew (Spider-Woman)
    - [ ] Spider-Woman Vol. 5 (2014–2017)
    - [ ] Spider-Woman Vol. 7 (2020–2021)


## Resources

- [Marvel Fandom - Amazing Spider-Man Vol 1](https://marvel.fandom.com/wiki/Amazing_Spider-Man_Vol_1_1)
- [D3.js Documentation](https://d3js.org)
- [Context Engineering Template](../context-engineering-template)
