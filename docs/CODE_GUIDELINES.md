# Code Guidelines for Spider-Man Villain Timeline

## Modern Development Principles (2026)

This project follows modern context engineering patterns with emphasis on **validation-driven development** and **proof steps testing**.

---

## 1. Validation-Driven Development

### Every Change Must Be Validated

```bash
# Before committing ANY change:
npm run validate  # TypeScript type-check + Jest tests
```

### Validation Levels

| Level | Tool | What It Checks | When to Use |
|-------|------|----------------|-------------|
| 1. Syntax | TypeScript | Syntax errors, basic types | After every edit |
| 2. Types | `tsc --noEmit` | Full type checking | Before commit |
| 3. Tests | Jest | Unit test suite | Before commit |
| 4. Build | `npm run build` | Compilation | Before deploy |

---

## 2. Proof Steps Methodology

### Test-First for Issues

When fixing a bug or adding a feature:

```typescript
// 1. Write FAILING test that proves the issue
describe('VillainScraper edge cases', () => {
  it('should handle villains with no first appearance date', () => {
    const html = '<div class="villain"><h2>Mysterio</h2></div>';
    const result = parseVillain(html);
    
    // This FAILS with buggy code 
    expect(result.firstAppearance).toBeNull();
    expect(result.name).toBe('Mysterio');
  });
});

// 2. Fix the code
function parseVillain(html: string): Villain {
  const name = extractName(html);
  const firstAppearance = extractFirstAppearance(html) || null; //  Handle missing!
  return { name, firstAppearance };
}

// 3. Test now PASSES 
// 4. Add more edge cases
```

### When to Generate Proof Tests

 **Always for:**
- Bug fixes
- New scrapers
- Data processing changes
- API changes
- Refactoring

 **Skip for:**
- Documentation updates
- Comment changes
- README edits

---

## 3. TypeScript Standards

### Use Strict Types

```typescript
//  Good - Explicit types
interface VillainData {
  name: string;
  aliases: string[];
  firstAppearance: number | null;
  powers: string[];
}

async function scrapeVillain(url: string): Promise<VillainData> {
  // Implementation
}

//  Bad - Any types
async function scrapeVillain(url: any): Promise<any> {
  // Don't use 'any'!
}
```

### Null Safety

```typescript
//  Good - Handle nulls explicitly
function getVillainAlias(villain: Villain): string {
  return villain.alias ?? 'Unknown';
}

//  Bad - Assume data exists
function getVillainAlias(villain: Villain): string {
  return villain.alias.toUpperCase(); // Crash if null!
}
```

### Type Guards

```typescript
//  Good - Type guards for validation
function isValidVillain(data: unknown): data is Villain {
  return (
    typeof data === 'object' &&
    data !== null &&
    'name' in data &&
    typeof data.name === 'string'
  );
}

if (isValidVillain(scraped)) {
  // TypeScript knows scraped is Villain here
  processVillain(scraped);
}
```

---

## 4. Error Handling

### Use Typed Errors

```typescript
// Define custom errors
class ScrapingError extends Error {
  constructor(
    message: string,
    public url: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ScrapingError';
  }
}

class DataValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message);
    this.name = 'DataValidationError';
  }
}

// Use them
async function scrapeVillain(url: string): Promise<Villain> {
  try {
    const response = await axios.get(url);
    const data = parseVillain(response.data);
    
    if (!isValidVillain(data)) {
      throw new DataValidationError(
        'Invalid villain data',
        'structure',
        data
      );
    }
    
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new ScrapingError(
        'Failed to fetch villain data',
        url,
        error.response?.status
      );
    }
    throw error;
  }
}
```

### Error Recovery

```typescript
// Implement retry with exponential backoff
async function scrapeWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxAttempts - 1) throw error;
      
      const delay = 1000 * Math.pow(2, i); // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Unreachable');
}
```

---

## 5. Async/Await Patterns

### Parallel Operations

```typescript
//  Good - Parallel for independent operations
async function scrapeAllVillains(urls: string[]): Promise<Villain[]> {
  const results = await Promise.all(
    urls.map(url => scrapeVillain(url))
  );
  return results;
}

//  Bad - Sequential when unnecessary
async function scrapeAllVillains(urls: string[]): Promise<Villain[]> {
  const results: Villain[] = [];
  for (const url of urls) {
    results.push(await scrapeVillain(url)); // Slow!
  }
  return results;
}
```

### Sequential for Dependent Operations

```typescript
//  Good - Sequential when order matters
async function scrapeAndProcess(url: string): Promise<ProcessedData> {
  const raw = await scrapeVillain(url);        // Must finish first
  const validated = await validateData(raw);    // Depends on raw
  const processed = await processData(validated); // Depends on validated
  return processed;
}
```

---

## 6. Web Scraping Guidelines

### Rate Limiting

```typescript
// Implement rate limiter
class RateLimiter {
  private lastRequest = 0;
  private minDelay = 1000; // 1 request per second

  async wait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.minDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minDelay - timeSinceLastRequest)
      );
    }
    
    this.lastRequest = Date.now();
  }
}

const rateLimiter = new RateLimiter();

async function scrapeVillain(url: string): Promise<Villain> {
  await rateLimiter.wait(); //  Always rate limit!
  const response = await axios.get(url);
  return parseVillain(response.data);
}
```

### Caching

```typescript
// Cache scraped data
class ScraperCache {
  private cache = new Map<string, CachedData>();
  
  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && !this.isExpired(cached)) {
      return cached.data as T;
    }
    
    const data = await fetcher();
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }
  
  private isExpired(cached: CachedData): boolean {
    const age = Date.now() - cached.timestamp;
    return age > 24 * 60 * 60 * 1000; // 24 hours
  }
}

const cache = new ScraperCache();

async function scrapeVillain(url: string): Promise<Villain> {
  return cache.get(url, async () => {
    await rateLimiter.wait();
    const response = await axios.get(url);
    return parseVillain(response.data);
  });
}
```

---

## 7. Testing Standards

### Test Structure

```typescript
describe('Feature/Component Name', () => {
  // Setup
  beforeEach(() => {
    // Initialize test state
  });
  
  // 1. Proof tests (demonstrate issues)
  describe('Bug fixes (proof tests)', () => {
    it('should handle missing data (issue #123)', () => {
      // Test that proves bug and verifies fix
    });
  });
  
  // 2. Happy path
  describe('Normal operation', () => {
    it('should parse villain data correctly', () => {
      // Test typical usage
    });
  });
  
  // 3. Edge cases
  describe('Edge cases', () => {
    it('should handle empty arrays', () => { /* ... */ });
    it('should handle malformed HTML', () => { /* ... */ });
    it('should handle missing fields', () => { /* ... */ });
  });
  
  // 4. Error cases
  describe('Error handling', () => {
    it('should throw on invalid input', () => {
      expect(() => parseVillain(null)).toThrow();
    });
  });
});
```

### Mock External Dependencies

```typescript
// Mock axios for scraper tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('VillainScraper', () => {
  it('should scrape villain data', async () => {
    // Mock HTTP response
    mockedAxios.get.mockResolvedValue({
      data: '<html><!-- test HTML --></html>'
    });
    
    const result = await scrapeVillain('https://example.com');
    
    expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com');
    expect(result.name).toBe('Green Goblin');
  });
});
```

---

## 8. Documentation Standards

### JSDoc for Public APIs

```typescript
/**
 * Scrapes villain information from Marvel Comics Wiki
 * 
 * @param url - URL of the villain's wiki page
 * @returns Promise resolving to parsed villain data
 * @throws {ScrapingError} If the page cannot be fetched
 * @throws {DataValidationError} If the data is invalid
 * 
 * @example
 * ```typescript
 * const villain = await scrapeVillain('https://marvel.com/Green_Goblin');
 * console.log(villain.name); // "Green Goblin"
 * ```
 */
export async function scrapeVillain(url: string): Promise<Villain> {
  // Implementation
}
```

---

## 9. Git Workflow

### Before Every Commit

```bash
# 1. Run validation
npm run validate

# 2. Check for errors
# Fix any issues found

# 3. Commit with descriptive message
git commit -m "fix: Handle villains without aliases in scraper

- Added null check for alias field
- Added proof test demonstrating the issue
- All tests pass "
```

### Commit Message Format

```
<type>: <short summary>

<optional detailed description>

- Bullet points for changes
- Include proof test info
- Reference issue numbers
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

---

## 10. Quick Validation Checklist

Before committing, verify:

- [ ] `npm run type-check` passes (no TypeScript errors)
- [ ] `npm test` passes (all tests green)
- [ ] New features have proof tests
- [ ] Bug fixes have tests that demonstrate the issue
- [ ] No `any` types used
- [ ] Error handling in place
- [ ] Rate limiting for scrapers
- [ ] JSDoc for public functions
- [ ] Commit message follows format

---

## See Also

- [PROOF_STEPS_GUIDE.md](./PROOF_STEPS_GUIDE.md) - Complete proof testing guide
- [MODERN_PATTERNS_2026.md](./MODERN_PATTERNS_2026.md) - Modern development patterns
- [CONTEXT_ENGINEERING.md](./CONTEXT_ENGINEERING.md) - AI agent usage guide
