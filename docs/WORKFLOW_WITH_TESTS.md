# Context Engineering Workflow with Tests

This guide describes how to apply the Context Engineering workflow to the Spider-Man Villain Timeline project with **tests as proof steps**.

## � MANDATORY VERIFICATION STEPS

### After Every Source Code Change

**NEVER stop after editing TypeScript files.** Always complete the full verification cycle:

```bash
# Step 1: Build the project
npm run build

# Step 2: Verify compiled output contains your changes
# CRITICAL: Read public/script.js and find your fix
# Don't just trust compilation - verify the actual output

# Step 3: Run tests
npm test

# Step 4: For data processing changes, test merge logic
npx ts-node test-merge-logic.ts

# Step 5: For UI changes, test in browser
npm run serve
# Then open http://localhost:8000
```

### Verification Checklist

- [ ] Source files edited
- [ ] `npm run build` executed successfully
- [ ] **[public/script.js](../public/script.js) read and verified**
- [ ] Changes found in compiled JavaScript
- [ ] Tests executed and passed
- [ ] Browser tested (if UI change)

**Example Verification:**
```bash
# After fixing a bug in src/visualization/d3Graph.ts:

# 1. Build
npm run build

# 2. Search for your fix in output
# Read public/script.js lines 1-100, then search for your function
# Verify the logic change is present

# 3. Test
npm test -- d3Graph

# 4. Visual check
npm run serve
# Open browser, verify fix works visually
```

### When to Skip Scraping

**NEVER scrape unless data is provably missing or corrupted.**

Most issues are in processing/merge logic, NOT in source data.

```bash
# ❌ DON'T scrape for these issues:
# - Villain appears in wrong position
# - First appearance is incorrect
# - Deduplication not working
# - Missing villain in combined data
# These are PROCESSING issues, not DATA issues

# ✅ DO this instead:
# Check existing data
cat data/villains.Amazing_Spider-Man_Vol_1.json | grep -A5 "Mysterio"

# Test processing logic
npx ts-node test-merge-logic.ts

# Fix merge/processing logic in src/utils/
```

## �📋 The Workflow

When you ask for help solving an issue or adding a feature, follow this pattern:

### 1. **Context Building**
   - Gather requirements
   - Understand current state
   - Identify dependencies

### 2. **Tool Definition**
   - What code needs to be written/changed
   - Which modules are affected
   - What types are involved

### 3. **Implementation**
   - Write the actual code
   - Follow GUIDELINES.md standards
   - Add JSDoc comments

### 4. **Build & Verify Output**
   - Run `npm run build`
   - **CRITICAL:** Read [public/script.js](../public/script.js)
   - Verify changes appear in compiled JavaScript
   - Search for specific function/logic changes
   - Do NOT proceed until output is verified

### 5. **Proof Steps (Tests)**
   - For data processing: run `npx ts-node test-merge-logic.ts` (fast, no scraping)
   - For scraper/general: write Jest tests in `src/__tests__/`
   - Each test should verify one behavior
   - All tests must pass

### 6. **Feedback & Metrics**
   - Verify test coverage
   - Check for edge cases
   - Document results
   - Confirm browser behavior for UI changes

## 🧪 Testing Strategies

### Strategy 1: Test Processing Logic (Fast - No Scraping)

For changes to data merge/processing logic, use the test script:

```bash
npx ts-node test-merge-logic.ts
```

**When to use:**
- Modifying `src/utils/mergeDatasets.ts`
- Testing villain deduplication
- Verifying chronological sorting
- Checking first appearance calculation

**Speed:** < 1 second ⚡

**Example workflow:**
```bash
# 1. Edit src/utils/mergeDatasets.ts
# 2. Rebuild
npm run build
# 3. Test immediately (no scraping!)
npx ts-node test-merge-logic.ts
# 4. View results for Doctor Octopus and The Rose
```

### Strategy 2: Unit Tests (Jest)

For scraper, data processor, and visualization logic:

```bash
npm test
```

**Test File Location**
```
src/__tests__/
├── dataProcessor.test.ts      # Data processing unit tests
├── marvelScraper.test.ts      # Web scraper unit tests
├── d3Graph.test.ts            # Visualization unit tests
└── groupHandling.test.ts      # Group classification tests
```

### Test Template
```typescript
import { functionToTest } from '../module';

describe('Module Name - Proof Steps', () => {
  
  describe('functionToTest', () => {
    it('should verify expected behavior', () => {
      // Arrange: Set up test data
      const input = 'test data';
      
      // Act: Call the function
      const result = functionToTest(input);
      
      // Assert: Verify the result
      expect(result).toBe('expected output');
    });
  });
});
```

## 💡 Example: Applying the Workflow

### Request
> "Fix villain deduplication to properly handle multiple mantles using the Context Engineering workflow"

### What Should Happen

**1. Context**
```
- Current state: Two Doctor Octopus entries (Otto vs Carolyn)
- Issue: Should be separate by URL, not merged by name
- Goal: Use URL-based deduplication
- Files affected: src/utils/mergeDatasets.ts
```

**2. Tools**
```
- Modify: mergeDatasets.ts (add URL matching logic)
- Test: Use test-merge-logic.ts for verification (fast!)
- Verify: Run npm test (all 93 tests pass)
```

**3. Implementation**
```typescript
// In src/utils/mergeDatasets.ts
const isMatch = villainUrl && entryVillainUrls.includes(villainUrl);
```

**4. Proof Steps (Fast Testing)**
```bash
npm run build
npx ts-node test-merge-logic.ts
# Output shows:
# Doctor Octopus (Otto Octavius) - Issue #3 ✓
# (No Carolyn Trainer duplicate) ✓
```

**5. Feedback**
```
✅ Villains properly separated by URL
✅ No accidental merging
✅ All 93 tests pass
✅ Process is fast (< 1 sec)
```

---

## 📊 Running Tests

### Fast Data Processing Tests (Recommended for processing changes)
```bash
# Test merge logic on existing JSON files (< 1 second)
npx ts-node test-merge-logic.ts
```

### Unit Tests (All tests)
```bash
# Run all 93 tests
npm test

# Run tests for a specific file
npm test dataProcessor

# Run with coverage
npm test -- --coverage

# Watch mode (re-run on changes)
npm test -- --watch
```

### Full Pipeline Testing
```bash
# Compile TypeScript
npm run build

# Run all unit tests
npm test

# Test processing logic
npx ts-node test-merge-logic.ts

# If all pass, scrape and view
npm run scrape -- --all-series
npm run serve
```

---

## 🎯 How to Request the Workflow

Use explicit language about what phase you're testing:

✅ **Good requests:**
```
"Fix the villain deduplication using the Context Engineering workflow. 
Test with: npx ts-node test-merge-logic.ts"

"Add a villain filter feature following the workflow:
1. Update mergeDatasets.ts
2. Test with test-merge-logic.ts (fast)
3. Write Jest tests for edge cases
4. Verify with npm test"
```

❌ **Vague requests:**
```
"Fix the data"  // No workflow mention
"Add filtering"  // No test method specified
```

---

## ⚡ Performance: Testing Philosophy

**For process logic changes:**
- Use `npx ts-node test-merge-logic.ts` (< 1 second)
- Don't re-scrape during development
- Quick iteration cycles

**For scraper/general changes:**
- Use `npm test` (< 2 seconds)
- Full suite of 93 tests
- No network calls (mocked responses)

**For final verification:**
- Run full pipeline: build → test → scrape → serve
- Takes ~15 minutes for complete data
- Done once when confident

---

## 📝 For Pull/Process Separation

See [PULL_AND_PROCESS.md](PULL_AND_PROCESS.md) for details on:
- Running **Pull phase** (scraping) separately
- Running **Process phase** (merging) separately  
- Testing each phase independently

## ✅ Test Quality Checklist

Every test should:
- [ ] Test one behavior
- [ ] Have clear test name
- [ ] Use Arrange-Act-Assert pattern
- [ ] Use meaningful assertions
- [ ] Be independent from other tests
- [ ] Pass consistently
- [ ] Cover happy path AND edge cases

## 🔍 Example Test Pattern

```typescript
describe('normalizeVillainName', () => {
  // Happy path
  it('should normalize basic villain names', () => {
    expect(normalizeVillainName('spider man'))
      .toBe('Spider Man');
  });

  // Edge cases
  it('should handle extra whitespace', () => {
    expect(normalizeVillainName('  venom  '))
      .toBe('Venom');
  });

  it('should remove alias information', () => {
    expect(normalizeVillainName('Green Goblin (Norman Osborn)'))
      .toBe('Green Goblin');
  });

  // Error cases
  it('should handle empty strings', () => {
    expect(normalizeVillainName(''))
      .toBe('');
  });
});
```

## 📈 Coverage Goals

- **Functions**: 80%+ coverage
- **Branches**: 70%+ coverage
- **Lines**: 80%+ coverage

Current coverage threshold (in `jest.config.js`): 50% (can be increased)

## 🚀 Workflow Checklist

When applying the workflow, ensure:

- [ ] Code is written
- [ ] Tests are written
- [ ] Tests pass (`npm test`)
- [ ] Code follows GUIDELINES.md
- [ ] JSDoc comments added
- [ ] All edge cases covered
- [ ] No `any` types
- [ ] Error handling included

## 📝 Template to Use

Save this template when requesting workflow application:

```
Please apply the Context Engineering workflow to [TASK]:

1. Context: [What needs to change]
2. Tools: [Which modules to modify]
3. Implementation: [Code changes]
4. Proof Steps: [Write Jest tests that verify this works]
5. Feedback: [Verify coverage and edge cases]

Ensure:
- All tests pass
- Code follows GUIDELINES.md
- Coverage > 70%
```

---

**Key Principle**: No code change is complete without tests proving it works.
