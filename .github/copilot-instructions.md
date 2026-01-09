# GitHub Copilot Instructions

## 🚨 CRITICAL WORKFLOW REQUIREMENTS

### ALWAYS Verify Compiled Output
1. After editing TypeScript source files, run `npm run build`
2. **READ public/script.js** to verify your changes appear in compiled output
3. Search for your specific function/logic change in the compiled code
4. Do NOT claim success until you've verified the output JavaScript
5. Test in browser with `npm run serve` for UI changes

### MINIMIZE Scraping - Only When Absolutely Necessary
- **DON'T scrape** unless data files are missing/corrupted
- **DO use** existing data in `data/` directory
- **DO test** processing logic with `npx ts-node test-merge-logic.ts` (fast)
- **DON'T scrape** to "verify" or "refresh" data
- Most issues are in processing/merge logic, NOT source data
- Scraping takes 10-30 minutes; testing takes < 1 second

## Project Context
Spider-Man Villain Timeline - TypeScript project that scrapes Marvel Comics data and creates D3.js visualizations of villain appearances.

## Tech Stack
- TypeScript + Node.js (backend, scraping, data processing)
- D3.js (interactive timeline visualizations)
- Axios + Cheerio (web scraping)
- Jest (testing)

## Style Guide
- Use strict TypeScript with explicit types
- Use async/await for all async operations
- Handle errors with typed error classes
- Respect rate limits when scraping (1 req/sec)
- Cache scraped data to avoid re-requests
- Validate all scraped data before processing

## When Suggesting Code
- Include TypeScript types for all functions and interfaces
- Add error handling with try-catch and typed errors
- Include JSDoc comments for public functions
- Add rate limiting for scraping operations
- Include data validation checks

## Common Tasks
- **New scraper**: Create in `/src/scraper/`, add types, tests, caching
- **Data processing**: Add to `/src/utils/`, include validation, tests
- **Visualization**: Create in `/src/visualization/`, use D3.js patterns
- **Tests**: Use Jest with mocked HTTP responses for scrapers

## Validation Commands
- `npm run build` - TypeScript compilation
- `npm test` - Run Jest tests
- `npm run scrape` - Run web scraper
- `npm run serve` - Serve visualization locally
