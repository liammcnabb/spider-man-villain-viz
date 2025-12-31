# This repo is entirely written by Claude as a public example of a workflow. Since I do not pay for any AI, progress is limited by the amount of tokens I get per month.

# Spider-Man Villain Timeline

A visualization of Spider-Man villain appearances across the Amazing Spider-Man Vol. 1 comic book series (first 20 issues).

## Project Overview

This project visualizes the chronological appearances of villains in the Spider-Man comics using data scraped from the Marvel Fandom website. The visualization is built with D3.js and displays which antagonists appear in each issue, allowing exploration of villain frequency and appearance patterns.

## Features

- **Web Scraper**: Automatically extracts antagonist information from Marvel Fandom pages
- **Data Processing**: Normalizes and structures villain data from comic issues
- **Interactive Visualization**: D3.js-based timeline graph showing villain appearances
- **Context Engineering**: Follows the context engineering protocol for maintainability and clarity

## Tech Stack

- **Frontend**: D3.js, HTML5, CSS3
- **Backend/Scraping**: Node.js + TypeScript, Cheerio, Axios
- **Build Tool**: TypeScript, npm

## Project Structure

```
spider-man-villain-timeline/
├── src/
│   ├── index.ts              # Main entry point
│   ├── scraper/
│   │   ├── marvelScraper.ts  # Marvel Fandom web scraper
│   │   └── parser.ts         # Parses HTML to extract villain data
│   ├── visualization/
│   │   └── d3Graph.ts        # D3.js visualization logic
│   └── utils/
│       └── dataProcessor.ts  # Processes and normalizes data
├── data/
│   └── villains.json         # Extracted villain data
├── public/
│   ├── index.html            # Main HTML page
│   ├── style.css             # Styling
│   └── script.js             # Client-side D3 rendering
├── docs/
│   ├── ARCHITECTURE.md       # System architecture
│   ├── SETUP.md              # Setup instructions
│   └── GUIDELINES.md         # Code guidelines
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

### Scraping Data

```bash
# Scrape Amazing Spider-Man Vol 1 for antagonists (issues 1-20)
npm run scrape
```

This creates `data/villains.json` with all extracted antagonist information.

### Viewing the Visualization

```bash
# Start a local HTTP server
npm run serve
```

Then open `http://localhost:8000` in your browser.

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

### Workflow

1. **Data Scraping**: `src/scraper/` handles Marvel Fandom extraction
2. **Data Processing**: `src/utils/` normalizes and structures data
3. **Visualization**: `src/visualization/` generates D3.js logic
4. **Frontend**: `public/` contains the interactive interface

## Next Steps

### Short Term
- [ ] Complete scraper for issues 1-20
- [ ] Create basic D3 timeline visualization
- [ ] Add interactive filtering by villain

### Medium Term
- [ ] Extend scraper to all 800+ issues
- [ ] Add villain statistics (first appearance, frequency)
- [ ] Implement villain relationship visualization

### Long Term
- [ ] Support multiple Spider-Man series (2099, Ultimate, etc.)
- [ ] Add comics from other Marvel properties
- [ ] Historical analysis of villain popularity trends

## Resources

- [Marvel Fandom - Amazing Spider-Man Vol 1](https://marvel.fandom.com/wiki/Amazing_Spider-Man_Vol_1_1)
- [D3.js Documentation](https://d3js.org)
- [Context Engineering Template](../context-engineering-template)
