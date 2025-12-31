# Spider-Man Villain Timeline - Setup Guide

## Environment Setup

### Prerequisites

- **Node.js**: 16.0 or higher
- **npm**: 8.0 or higher (comes with Node.js)
- **Python**: 3.8+ (optional, for HTTP server)
- **Git**: For version control

### Installation Steps

#### 1. Install Node.js Dependencies

```bash
cd spider-man-villain-timeline
npm install
```

This installs:
- `axios`: HTTP client for web scraping
- `cheerio`: jQuery-like HTML parsing
- `d3`: Visualization library
- `typescript`: Type-safe JavaScript
- Development tools: ts-node, jest, tsc

#### 2. Verify Installation

```bash
# Check TypeScript is installed
npx tsc --version

# Check Node.js version
node --version

# Check npm version
npm --version
```

### Build Instructions

#### Development Build (with source maps)
```bash
npm run build
```

Compiles TypeScript to JavaScript in `dist/` directory with source maps for debugging.

#### Watch Mode (for development)
```bash
npx tsc --watch
```

Automatically recompiles when files change.

### Running the Project

#### 1. Scrape Marvel Fandom Data

```bash
npm run scrape
```

This:
- Connects to Marvel Fandom website
- Extracts antagonist data from Amazing Spider-Man Vol 1 issues 1-20
- Saves normalized data to `data/villains.json`
- Reports progress and any errors

Expected output format:
```json
{
  "series": "Amazing Spider-Man Vol 1",
  "baseUrl": "https://marvel.fandom.com/wiki/Amazing_Spider_Man_Vol_1_{issue}",
  "issues": [
    {
      "issueNumber": 1,
      "title": "...",
      "antagonists": ["Green Goblin", "...]
    }
  ]
}
```

#### 2. Start Visualization Server

```bash
npm run serve
```

Starts Python HTTP server on `http://localhost:8000`

Or alternatively:
```bash
# If you have http-server installed
npx http-server public -c-1
```

Then open `http://localhost:8000` in your web browser to view the D3.js visualization.

### Configuration

#### Environment Variables

Create a `.env` file if you need custom settings:

```
# Marvel Fandom base URL
MARVEL_FANDOM_BASE=https://marvel.fandom.com

# Scraping options
SCRAPE_ISSUES_START=1
SCRAPE_ISSUES_END=20
SCRAPE_TIMEOUT=10000  # milliseconds

# Output location
DATA_OUTPUT_PATH=./data/villains.json
```

#### Visualization Config

Edit `public/script.js` for D3 visualization options:

```javascript
const VizConfig = {
  width: 1200,
  height: 600,
  margin: { top: 20, right: 20, bottom: 30, left: 60 },
  animationDuration: 750
};
```

### Development Workflow

#### 1. Code Style & Linting

Follow these standards:
- **Line Length**: Max 110 characters
- **Indentation**: 2 spaces
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Semicolons**: Required
- **Strict Mode**: TypeScript strict mode enabled

#### 2. Running Tests

```bash
npm test
```

Runs Jest test suite. Tests should be in files matching `*.test.ts` or `*.spec.ts`

#### 3. Building for Production

```bash
npm run build
```

Outputs optimized JavaScript to `dist/` directory ready for deployment.

### Debugging

#### Enable Source Maps

TypeScript is configured with source maps. In your browser DevTools:
1. Open DevTools (F12)
2. Go to Sources tab
3. You'll see original TypeScript files in the source tree

#### Debug Output

Add logging in code:
```typescript
console.log('Debug:', variableName);
```

View logs in:
- Browser Console (Ctrl+Shift+J)
- Terminal where `npm run serve` is running

#### Node.js Debugging

```bash
# Debug the scraper
node --inspect-brk dist/src/index.js scrape
```

Then open `chrome://inspect` in Chrome to debug.

### Troubleshooting

#### npm install fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -r node_modules package-lock.json
npm install
```

#### Scraper can't connect to Marvel Fandom

- Check your internet connection
- Verify firewall/proxy isn't blocking requests
- Increase timeout in `.env`: `SCRAPE_TIMEOUT=15000`
- Try running with verbose logging (add to scraper)

#### D3 visualization not displaying

- Check browser console for JavaScript errors (F12)
- Verify `data/villains.json` exists and is valid JSON
- Check that `public/` files are being served correctly

#### TypeScript compilation errors

```bash
# Clear compiled output and rebuild
rm -rf dist
npm run build

# Check TypeScript version compatibility
npx tsc --version
```

### Next Steps

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand system design
2. Review [GUIDELINES.md](./GUIDELINES.md) for code standards
3. Start with the scraper: `src/scraper/marvelScraper.ts`
4. Explore the visualization: `public/script.js`

### Support

For issues or questions:
1. Check troubleshooting section above
2. Review relevant source files with comments
3. Check Node.js/npm documentation
4. See context-engineering-template for protocol details
