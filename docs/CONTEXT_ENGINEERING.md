# Context Engineering for Spider-Man Villain Timeline

This project implements modern context engineering patterns (2026) for AI-assisted development.

## Quick Reference

### Project Structure
```
spider-man-villain-timeline/
 .cursorrules                    # Context for AI agents
 .github/
    copilot-instructions.md    # GitHub Copilot config
    workflows/validate.yml     # CI validation
 src/
    scraper/                   # Web scraping modules
    utils/                     # Data processing
    visualization/             # D3.js components
    __tests__/                 # Jest tests
 data/                          # Scraped JSON data
 public/                        # Static visualization files
 docs/                          # Documentation
     CONTEXT_ENGINEERING.md     # This file
     MODERN_PATTERNS_2026.md    # Complete guide
```

## AI Agent Context Files

### 1. `.cursorrules`
Project-specific context including:
- Architecture overview
- Code conventions
- TypeScript patterns
- Scraping best practices
- Testing requirements

### 2. `.github/copilot-instructions.md`
GitHub Copilot specific instructions for:
- Tech stack
- Common tasks
- Code style
- Validation commands

### 3. `docs/MODERN_PATTERNS_2026.md`
Comprehensive guide to modern context engineering:
- Autonomous agent patterns
- Validation-driven feedback
- Parallel execution strategies
- Error recovery patterns
- Complete implementation examples

## Using Modern Patterns in This Project

### 1. Autonomous Context Discovery
Let AI agents discover context through semantic search:

```typescript
// Agent will automatically:
// 1. Search for existing scraping patterns
// 2. Find data processing examples
// 3. Understand D3.js visualization patterns
// 4. Discover test patterns

// You just request: "Add a new scraper for villain aliases"
```

### 2. Validation-Driven Development
Every change is validated automatically:

```bash
# Before committing
npm run validate  # Runs type-check + tests

# CI automatically validates on push
# See .github/workflows/validate.yml
```

### 3. Parallel Operations
AI agents batch independent operations:

```typescript
// Agent will parallelize these automatically:
const [villainData, comicData, imageData] = await Promise.all([
  scrapeVillains(urls),
  scrapeComics(issues),
  scrapeImages(characters)
]);
```

### 4. Progressive Refinement
AI agents iterate until validation passes:

```
Attempt 1: Implement scraper
   Type error detected
   Fix type definitions
  
Attempt 2: Implement with correct types
   Test fails (missing rate limiting)
   Add rate limiter
  
Attempt 3: Implement with rate limiting
   All tests pass 
```

## Validation Tools

### Type Checking
```bash
npm run type-check  # TypeScript strict mode validation
```

### Testing
```bash
npm test           # Run all Jest tests
npm test -- --watch # Watch mode
```

### Full Validation
```bash
npm run validate   # Type-check + tests (used in CI)
```

## Common Workflows

### Adding a New Scraper
1. Agent searches for existing scraper patterns
2. Creates new scraper with types and error handling
3. Adds tests with mocked HTTP responses
4. Validates: type-check + tests
5. Auto-fixes any errors found

### Updating Visualization
1. Agent analyzes existing D3.js patterns
2. Implements new visualization feature
3. Creates snapshot tests
4. Validates rendering logic
5. Iterates until tests pass

### Refactoring Data Processing
1. Agent finds all usages of data structures
2. Plans refactoring with type safety
3. Updates code with multi-file edits
4. Validates: no type errors, all tests pass
5. Confirms no breaking changes

## Best Practices

### 1. Let Agents Drive Discovery
 **Don't**: Manually specify all context files to read
 **Do**: Request the task and let agents discover needed context

### 2. Use Real Validation
 **Don't**: Rely on "looks good" assessment
 **Do**: Run `npm run validate` to check actual errors

### 3. Batch Independent Operations
 **Don't**: Sequential reads when order doesn't matter
 **Do**: Parallel Promise.all() for independent operations

### 4. Iterate with Feedback
 **Don't**: Give up after first attempt
 **Do**: Use errors to guide progressive refinement

## See Also

- [MODERN_PATTERNS_2026.md](./MODERN_PATTERNS_2026.md) - Complete implementation guide
- [.cursorrules](../.cursorrules) - Project context for AI agents
- [.github/copilot-instructions.md](../.github/copilot-instructions.md) - Copilot config

## Proof Steps Integration

This project implements the **Proof Steps** methodology: write failing tests that prove issues exist, then fix the code until tests pass.

### Quick Example

```typescript
// Issue: Scraper crashes on villains without power descriptions

// 1. Write FAILING test (proves the bug)
it('should handle villains without powers', () => {
  const html = '<div class="villain"><h2>Chameleon</h2></div>';
  const result = parseVillain(html);
  expect(result.powers).toEqual([]); // FAILS 
});

// 2. Fix the code
function parseVillain(html: string): Villain {
  const powers = extractPowers(html) || []; //  Handle undefined
  return { name, powers };
}

// 3. Test now PASSES 
```

### For AI Agents

When requesting bug fixes or features, AI agents will:
1. Generate failing test that demonstrates the issue
2. Implement the fix
3. Verify test passes
4. Add edge case tests

**Example requests:**
- "Fix the scraper to handle missing aliases - use proof steps"
- "Add support for villain team affiliations with proof tests"

### Documentation

- [PROOF_STEPS_GUIDE.md](./PROOF_STEPS_GUIDE.md) - Complete methodology
- [CODE_GUIDELINES.md](./CODE_GUIDELINES.md) - Coding standards with proof steps
