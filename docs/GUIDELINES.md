# Code Guidelines - Spider-Man Villain Timeline

## Overview

This document defines the code standards for the Spider-Man Villain Timeline project. All code should follow these guidelines to maintain consistency, readability, and maintainability.

## General Principles

1. **Clarity First**: Code should be clear and self-documenting
2. **No Magic Numbers**: All constants should be named
3. **Single Responsibility**: Each function should do one thing well
4. **Error Handling**: All error cases should be handled
5. **Type Safety**: Use TypeScript strict mode (no `any`)

## TypeScript Guidelines

### File Structure

```typescript
// 1. Imports (grouped: external, internal, types)
import axios from 'axios';
import * as cheerio from 'cheerio';

import { normalizeVillainName } from '../utils/dataProcessor';

import type { IssueData, ProcessedVillain } from '../types';

// 2. Types and Interfaces
interface ScraperConfig {
  baseUrl: string;
  timeout: number;
}

// 3. Constants
const DEFAULT_TIMEOUT = 10000;
const MARVEL_FANDOM_BASE = 'https://marvel.fandom.com';

// 4. Main implementation
class MarvelScraper {
  // constructor
  // public methods
  // private methods
}

// 5. Exports
export { MarvelScraper };
export type { ScraperConfig };
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Classes | PascalCase | `MarvelScraper` |
| Functions | camelCase | `parseAntagonists()` |
| Variables | camelCase | `issueNumber` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT` |
| Types/Interfaces | PascalCase | `IssueData` |
| Booleans | is/has prefix | `isValid`, `hasError` |
| Private fields | \_ prefix | `_cache` |

### Type Annotations

**Always provide explicit types:**

```typescript
// ✅ Good
function scrapeIssue(issueNumber: number): Promise<IssueData> {
  // implementation
}

const villainsPerIssue: Map<number, string[]> = new Map();

// ❌ Avoid
function scrapeIssue(issueNumber: any) {
  // implementation
}

const villainsPerIssue = new Map(); // inferred type
```

### Function Guidelines

**Maximum 80 lines per function:**

```typescript
// ✅ Good - focused function
function normalizeVillainName(name: string): string {
  // Trim whitespace
  let normalized = name.trim();
  
  // Remove publication notes in parentheses
  normalized = normalized.replace(/\([^)]*\)/g, '').trim();
  
  // Standardize case
  normalized = normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return normalized;
}

// ❌ Avoid - too many responsibilities
function processAllData(html: string) {
  // parsing, normalization, validation, storage all in one function
}
```

### Nesting Depth

**Maximum 3 levels of nesting:**

```typescript
// ✅ Good - extracted helper function
function processIssues(issues: IssueData[]): ProcessedVillain[] {
  return issues.flatMap(issue => 
    issue.antagonists.map(villain => normalizeVillain(villain))
  );
}

// ❌ Avoid - 4+ levels
function processIssues(issues: IssueData[]) {
  return issues.map(issue => {
    return issue.antagonists.map(villain => {
      return villain.split('/').map(name => {
        return name.trim().toUpperCase();
      });
    });
  });
}
```

### Error Handling

**Always handle errors explicitly:**

```typescript
// ✅ Good
async function fetchIssue(issueNumber: number): Promise<IssueData> {
  try {
    const response = await axios.get(getIssueUrl(issueNumber), {
      timeout: DEFAULT_TIMEOUT
    });
    
    if (!response.data) {
      throw new Error(`No data returned for issue ${issueNumber}`);
    }
    
    return parseIssueData(response.data);
  } catch (error) {
    console.error(`Failed to fetch issue ${issueNumber}:`, error);
    throw new Error(
      `Could not fetch issue ${issueNumber}: ${error.message}`
    );
  }
}

// ❌ Avoid
async function fetchIssue(issueNumber) {
  const response = await axios.get(getIssueUrl(issueNumber));
  return parseIssueData(response.data);
}
```

### Comments and Documentation

**Use JSDoc for public functions:**

```typescript
/**
 * Extracts villain names from an issue's HTML.
 * 
 * @param html - The HTML content of the issue page
 * @returns Array of villain names found in antagonists section
 * @throws Error if HTML parsing fails
 * 
 * @example
 * const villains = parseAntagonists(htmlContent);
 * console.log(villains); // ['Green Goblin', 'Doctor Octopus']
 */
function parseAntagonists(html: string): string[] {
  // implementation
}
```

**Inline comments for complex logic:**

```typescript
// Normalize name: remove aliases in parentheses and standardize case
const normalized = name
  .replace(/\([^)]*\)/g, '')  // Remove (alias) patterns
  .trim()                       // Remove whitespace
  .toUpperCase();               // Standardize case
```

### Imports Organization

```typescript
// 1. External libraries (alphabetical)
import axios from 'axios';
import * as cheerio from 'cheerio';

// 2. Internal modules (relative paths)
import { DataProcessor } from '../utils/dataProcessor';
import { MarvelScraper } from './marvelScraper';

// 3. Type imports (separate)
import type { 
  IssueData, 
  ProcessedVillain,
  TimelineData 
} from '../types';
```

## HTML/CSS Guidelines

### HTML Structure

```html
<!-- Use semantic HTML5 elements -->
<main id="visualization">
  <section class="timeline">
    <!-- SVG or canvas element -->
  </section>
</main>

<!-- Use data attributes for JavaScript -->
<div class="villain" data-villain-id="green-goblin">
  Green Goblin
</div>
```

### CSS Guidelines

```css
/* Use consistent spacing and naming */
.timeline {
  margin-bottom: 20px;
  padding: 15px;
}

/* Use custom properties for colors */
:root {
  --color-primary: #ff6b6b;
  --color-grid: #eeeeee;
  --color-text: #333333;
}

.villain-node {
  fill: var(--color-primary);
  transition: all 0.3s ease;
}

/* Use comments for sections */
/* ============= Timeline Styles ============= */
```

## Project-Specific Guidelines

### Scraper Code

1. **Rate Limiting**: Add delays between requests
2. **Validation**: Always validate extracted data
3. **Logging**: Log progress and errors

```typescript
async function scrapeWithDelay(
  issues: number[],
  delayMs: number = 1000
): Promise<IssueData[]> {
  const results: IssueData[] = [];
  
  for (const issue of issues) {
    console.log(`Scraping issue ${issue}...`);
    const data = await fetchIssue(issue);
    results.push(data);
    
    // Delay before next request
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  console.log(`Scraped ${results.length}/${issues.length} issues`);
  return results;
}
```

### Data Processing Code

1. **Immutability**: Don't mutate input data
2. **Validation**: Validate before transformation
3. **Clarity**: Use descriptive variable names

```typescript
function processVillainData(rawData: IssueData[]): ProcessedVillain[] {
  // Validate input
  if (!Array.isArray(rawData) || rawData.length === 0) {
    throw new Error('Invalid input data');
  }
  
  // Build villain index (immutable approach)
  const villainMap = new Map<string, ProcessedVillain>();
  
  for (const issue of rawData) {
    for (const rawName of issue.antagonists) {
      const normalized = normalizeVillainName(rawName);
      
      if (!villainMap.has(normalized)) {
        villainMap.set(normalized, {
          id: generateId(normalized),
          names: [normalized],
          firstAppearance: issue.issueNumber,
          appearances: [issue.issueNumber],
          frequency: 1
        });
      } else {
        const villain = villainMap.get(normalized)!;
        if (!villain.appearances.includes(issue.issueNumber)) {
          villain.appearances.push(issue.issueNumber);
          villain.frequency++;
        }
      }
    }
  }
  
  return Array.from(villainMap.values());
}
```

### D3.js Code

1. **Separation**: Keep D3 logic separate from data
2. **Modularity**: Group related scales, axes, etc.
3. **Chainability**: Use D3 method chaining appropriately

```typescript
// Initialize scales
const xScale = d3.scaleLinear()
  .domain([1, 20])
  .range([margin.left, width - margin.right]);

const yScale = d3.scaleLinear()
  .domain([0, maxVillains])
  .range([height - margin.bottom, margin.top]);

// Create axes
const xAxis = d3.axisBottom(xScale);
const yAxis = d3.axisLeft(yScale);

// Render
svg.append('g')
  .attr('transform', `translate(0,${height - margin.bottom})`)
  .call(xAxis);
```

## Testing Guidelines

### Test Structure

```typescript
// Use descriptive test names
describe('normalizeVillainName', () => {
  it('should remove publication notes in parentheses', () => {
    expect(normalizeVillainName('Green Goblin (Norman Osborn)'))
      .toBe('Green Goblin');
  });
  
  it('should trim whitespace', () => {
    expect(normalizeVillainName('  Doctor Octopus  '))
      .toBe('Doctor Octopus');
  });
});
```

## Performance Checklist

- [ ] Functions under 80 lines
- [ ] Nesting depth ≤ 3 levels
- [ ] No `any` types
- [ ] All async operations have error handling
- [ ] No console.log in production code (use logging module)
- [ ] Constants extracted for "magic" values
- [ ] Comments for non-obvious logic

## Review Checklist

Before committing code:

- [ ] Follows naming conventions
- [ ] Functions have single responsibility
- [ ] Error handling implemented
- [ ] Types are explicit
- [ ] Comments are clear and minimal
- [ ] Tests pass (if applicable)
- [ ] No console errors or warnings
- [ ] Line length ≤ 110 characters

---

These guidelines follow the Context Engineering Protocol's emphasis on clarity, maintainability, and systematic improvement.
