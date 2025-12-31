# Context Engineering Workflow with Tests

This guide describes how to apply the Context Engineering workflow to the Spider-Man Villain Timeline project with **tests as proof steps**.

## 📋 The Workflow

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

### 4. **Proof Steps (Tests)**
   - Write Jest tests verifying the code works
   - Tests go in `src/__tests__/` directory
   - Each test should verify one behavior
   - All tests must pass

### 5. **Feedback & Metrics**
   - Verify test coverage
   - Check for edge cases
   - Document results

## 🧪 Test Structure

### Test File Location
```
src/__tests__/
├── dataProcessor.test.ts      # Tests for data processing
├── marvelScraper.test.ts      # Tests for web scraper
└── d3Graph.test.ts            # Tests for visualization
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
> "Fix the scraper to handle rate limiting better using the Context Engineering workflow"

### What Should Happen

**1. Context**
```
- Current state: Scraper has 1s delay
- Issue: Rate limiting is hardcoded
- Goal: Make it configurable
```

**2. Tools**
```
- Modify: marvelScraper.ts (add config parameter)
- Update: index.ts (pass configuration)
- Test: Write tests verifying the new behavior
```

**3. Implementation**
```typescript
// Code changes in marvelScraper.ts
async scrapeWithConfig(config: ScraperConfig) {
  // ... implementation
}
```

**4. Proof Steps (Tests)**
```typescript
// Tests in src/__tests__/marvelScraper.test.ts
it('should use custom delay from config', () => {
  const config = { delay: 2000 };
  // Verify the delay is applied
});

it('should fall back to default delay', () => {
  // Verify default behavior
});
```

**5. Feedback**
```
✅ Tests pass
✅ Rate limiting configurable
✅ Backward compatible
```

## 🎯 How to Request the Workflow

Use explicit language:

✅ **Good requests:**
```
"Fix the D3 chart rendering using the Context Engineering workflow. 
Include Jest tests as proof steps."

"Add a villain filter feature following the workflow:
1. Update data processor
2. Modify frontend
3. Write tests proving it works"
```

❌ **Vague requests:**
```
"Fix the chart"  // No workflow mention
"Add filtering"  // No test requirement
```

## 📊 Running Tests

```bash
# Run all tests
npm test

# Run tests for a specific file
npm test dataProcessor

# Run with coverage
npm test -- --coverage

# Watch mode (re-run on changes)
npm test -- --watch
```

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
