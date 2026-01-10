# 🚨 AGENT WORKFLOW RULES - READ THIS FIRST

## Rule 1: NEVER Claim Success Without Verification

**The Problem:** Agents edit TypeScript files, see `npm run build` succeed, then claim the fix is complete without checking the actual output.

**The Solution:**

```bash
# ❌ WRONG WORKFLOW
1. Edit src/visualization/d3Graph.ts
2. Run npm run build
3. See success → "Fix is complete!" ← STOP! Not verified!

# ✅ CORRECT WORKFLOW
1. Edit src/visualization/d3Graph.ts
2. Run npm run build
3. Read public/script.js (lines 1-200 or search for your function)
4. Verify your changes appear in the compiled JavaScript
5. Run npm test
6. If UI change: run npm run serve and test in browser
7. NOW you can claim success
```

### Verification Checklist

Before claiming any fix is complete:

- [ ] Source files edited
- [ ] `npm run build` completed successfully
- [ ] **Read [public/script.js](public/script.js) and found my changes**
- [ ] Changes appear in compiled output exactly as expected
- [ ] Tests pass (`npm test`)
- [ ] If UI change: tested in browser (`npm run serve`)

### Common Failures

**"I edited the TypeScript and built it, so it must be fixed"**
- ❌ Build success ≠ correct output
- ✅ Must read compiled JavaScript to verify

**"The function looks good in the source file"**
- ❌ Source file correctness ≠ compiled output correctness
- ✅ Transpilation, bundling, and minification can change behavior

**"I'll trust the build process"**
- ❌ Blind trust leads to incomplete fixes
- ✅ Always verify the actual output that runs in the browser

---

## Rule 2: NEVER Scrape Unless Absolutely Necessary

**The Problem:** Agents scrape data (10-30 minutes) when the issue is actually in processing logic (< 1 second to test).

**The Solution:**

### Decision Tree: Should I Scrape?

```
Do data files exist in data/ directory?
├─ NO → Check if they should exist
│  ├─ New series needed → OK to scrape
│  └─ Files should exist → Investigate why missing
│
└─ YES → DON'T SCRAPE!
   │
   ├─ Is the data corrupted/malformed?
   │  ├─ YES → OK to scrape that specific series
   │  └─ NO → DON'T SCRAPE
   │
   └─ Is the issue about:
      ├─ Villain positioning? → Processing logic issue
      ├─ First appearance wrong? → Processing logic issue
      ├─ Deduplication failing? → Processing logic issue
      ├─ Merge algorithm? → Processing logic issue
      ├─ UI/visualization? → Frontend issue
      └─ ALL OF THESE → FIX LOGIC, DON'T SCRAPE
```

### When to Use What

| Issue Type | Solution | Time | Command |
|------------|----------|------|---------|
| Villain appears in wrong order | Fix merge logic | < 1 sec | `npx ts-node test-merge-logic.ts` |
| First appearance incorrect | Fix chronological sort | < 1 sec | `npx ts-node test-merge-logic.ts` |
| Deduplication not working | Fix merge algorithm | < 1 sec | `npx ts-node test-merge-logic.ts` |
| Visualization broken | Fix D3.js code | N/A | `npm run serve` |
| Data actually missing | Scrape | 10-30 min | `npm run scrape -- --series "..."` |

### Testing Without Scraping

```bash
# ✅ DO THIS FIRST (< 1 second):
npx ts-node test-merge-logic.ts

# This tests the merge logic with existing data
# Output shows Doctor Octopus and The Rose as examples
# If logic is wrong, you'll see it immediately

# ✅ CHECK EXISTING DATA:
cat data/villains.Amazing_Spider-Man_Vol_1.json | grep -A10 "Mysterio"
cat data/villains.json | grep -A10 "Mysterio"

# ✅ BUILD AND TEST:
npm run build
npm test

# ❌ DON'T DO THIS (10-30 minutes wasted):
npm run scrape -- --all-series
```

### Red Flags: You're About to Waste Time

If you're thinking any of these, STOP:
- "Let me scrape to verify the data is correct"
- "I'll refresh the data to be sure"
- "Maybe the Marvel site changed"
- "Let me re-scrape to test my fix"

Instead:
- Data is already complete and validated
- Use existing data files
- Test processing logic with `test-merge-logic.ts`
- Fix the logic, not the data source

### The 99% Rule

**99% of issues are PROCESSING problems, not DATA problems.**

The data is already:
- ✅ Complete (all series scraped)
- ✅ Valid (passed validation)
- ✅ Synchronized (`data/` and `public/data/` match)
- ✅ Fresh (recently scraped)

Fix the logic that processes the data, don't re-scrape.

---

## Common Scenarios

### Scenario 1: "Mysterio appears in issue 1 but shouldn't"

**❌ Wrong Approach:**
```bash
# This takes 30 minutes and won't fix anything
npm run scrape -- --series "Amazing Spider-Man Vol 1"
```

**✅ Correct Approach:**
```bash
# This takes < 1 second and identifies the real problem
npx ts-node test-merge-logic.ts

# Check the merge logic in src/utils/mergeDatasets.ts
# The issue is chronological sorting vs numeric sorting
# Fix the logic, rebuild, verify output
```

### Scenario 2: "I edited the deduplication algorithm"

**❌ Wrong Approach:**
```bash
# Edit src/utils/mergeDatasets.ts
npm run build
# "Build succeeded, fix is complete!" ← WRONG!
```

**✅ Correct Approach:**
```bash
# Edit src/utils/mergeDatasets.ts
npm run build

# Verify the fix in multiple places:
npx ts-node test-merge-logic.ts  # Test merge logic
npm test                          # Run unit tests

# Check the output data:
cat public/data/villains.json | grep -A20 "Doctor Octopus"

# Verify in visualization:
npm run serve
# Open browser, check villain appears correctly
```

### Scenario 3: "Visualization shows wrong timeline position"

**❌ Wrong Approach:**
```bash
# Scrape data (not a data problem)
npm run scrape -- --all-series
```

**✅ Correct Approach:**
```bash
# Check the data is correct:
cat data/d3-config.json | head -50

# Check the D3 code:
# Read src/visualization/d3Graph.ts

# Edit the visualization logic
npm run build

# CRITICAL: Verify output
# Read public/script.js and search for your D3 function
# Confirm the change is in the compiled output

# Test in browser:
npm run serve
```

---

## Summary

### Two Simple Rules

1. **After editing TypeScript → Build → Verify output JavaScript → Test → THEN claim success**
2. **Before scraping → Check existing data → Test logic → Fix processing → THEN (maybe) scrape**

### The Verification Mantra

**"I edited the source, built successfully, AND verified the compiled output."**

Not:
- ❌ "I edited the source and built successfully"
- ❌ "The build succeeded so it must work"
- ❌ "The source looks correct"

Always:
- ✅ "I verified my changes in public/script.js"
- ✅ "I tested the actual output that runs in the browser"
- ✅ "I confirmed the behavior changed as expected"

### The Scraping Mantra

**"Data exists → Test processing logic → Fix logic → Don't scrape."**

Not:
- ❌ "Let me scrape to verify"
- ❌ "I'll refresh the data"
- ❌ "Maybe the data changed"

Always:
- ✅ "I used existing data to test"
- ✅ "I fixed the processing logic"
- ✅ "I verified with test-merge-logic.ts"

---

## Related Documentation

- [docs/CONTEXT_ENGINEERING.md](docs/CONTEXT_ENGINEERING.md) - Full context engineering guide
- [docs/WORKFLOW_WITH_TESTS.md](docs/WORKFLOW_WITH_TESTS.md) - Testing workflow
- [docs/PULL_AND_PROCESS.md](docs/PULL_AND_PROCESS.md) - When to scrape vs process
- [.github/copilot-instructions.md](.github/copilot-instructions.md) - Copilot config
