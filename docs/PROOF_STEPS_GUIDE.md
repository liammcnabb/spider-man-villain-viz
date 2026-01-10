# Proof Steps Guide - Unit Test Generation for Issue Resolution

## Overview

The **Proof Steps** feature generates unit test proofs that assert issues and verify fixes. These are test cases that:

1. **FAIL with buggy code** - Demonstrate the issue exists
2. **PASS with fixed code** - Verify the solution works
3. **Cover edge cases** - Ensure robust fixes
4. **Prevent regression** - Guard against future issues

---

## Why Proof Steps?

### Traditional Approach
```
Issue Found → Manual Fix Attempt → Hope it works → Find more bugs later
```

### Proof Steps Approach
```
Issue Found → Generate Test Proof → Fix Code → Run Tests → Verified ✓
```

### Benefits

| Aspect | Traditional | With Proof Steps |
|--------|-----------|------------------|
| **Issue Verification** | Assumed | Guaranteed by test |
| **Fix Validation** | Manual testing | Automated testing |
| **Regression Risk** | High | Low (tests prevent it) |
| **Time to Fix** | Unpredictable | Clear (test-driven) |
| **Documentation** | Written separately | Tests ARE documentation |

---

## How It Works

### Step 1: Identify Issue

```python
from analyze import analyze_code

result = analyze_code(
    code="""
def sum_values(items):
    for item in items:
        total += item.get('value', 0)  # ERROR: total not defined!
    return total
    """,
    language="python"
)

# Issues found:
# - "Variable 'total' is not initialized"
```

### Step 2: Generate Proof

```python
result = analyze_code(
    code="""
def sum_values(items):
    for item in items:
        total += item.get('value', 0)
    return total
    """,
    language="python",
    generate_proof=True,  # Generate test proofs!
    issue_to_resolve="undefined variable 'total'"
)

# Returns: Unit tests that FAIL with this code
```

### Step 3: Review Generated Tests

```python
if result.proof_steps:
    print("Generated Tests:")
    for test in result.proof_steps.generated_tests:
        print(test)
```

Output:
```python
# TEST 1: Asserts the issue exists
def test_variable_must_be_initialized():
    """Proof: Variable must be initialized before use"""
    import pytest
    
    def buggy_function(items):
        for item in items:
            total += item.get("value", 0)  # NameError!
        return total
    
    with pytest.raises(NameError):
        buggy_function([{"value": 10}])

# TEST 2: Verifies the fix works
def test_variable_initialized_fixed():
    """Proof: Initializing variable fixes the issue"""
    
    def fixed_function(items):
        total = 0  # INITIALIZE FIRST
        for item in items:
            total += item.get("value", 0)
        return total
    
    assert fixed_function([{"value": 10}, {"value": 20}]) == 30
    assert fixed_function([]) == 0
```

### Step 4: Run Tests Against Your Code

```bash
# Test FAILS with buggy code
pytest test_buggy.py::test_variable_must_be_initialized
# ❌ FAILED: NameError not raised (good - issue confirmed)

# Test PASSES with fixed code
pytest test_fixed.py::test_variable_initialized_fixed
# ✓ PASSED: All assertions passed
```

### Step 5: Use Tests to Fix Code

Now you have a **clear target**:
- Tests tell you exactly what's wrong
- Tests verify when you've fixed it
- Tests prevent future regressions

---

## Proof Step Workflow

```
┌─────────────────────────────────────────────────────┐
│ PROOF STEP WORKFLOW                                 │
└─────────────────────────────────────────────────────┘

1. ANALYZE CODE
   ├─→ Input: Buggy code snippet
   ├─→ Detect: Issues and anomalies
   └─→ Output: List of issues

2. GENERATE PROOFS
   ├─→ For each issue to resolve:
   ├─→ Create test that catches it
   ├─→ Create fix that passes test
   └─→ Generate edge cases

3. REVIEW TESTS
   ├─→ Read test descriptions
   ├─→ Understand what's being tested
   ├─→ Identify test patterns
   └─→ Plan fix strategy

4. FIX CODE
   ├─→ Implement the fix
   ├─→ Based on test requirements
   └─→ Match test expectations

5. VERIFY TESTS PASS
   ├─→ Run generated tests
   ├─→ Check all assertions pass
   ├─→ Verify edge cases handled
   └─→ Confirm no regressions

6. COMMIT & DOCUMENT
   ├─→ Tests are now documentation
   ├─→ Commit code + tests together
   └─→ Tests prevent future issues
```

---

## Proof Step Types

### Type 1: Uninitialized Variable Proof

**Issue**: Variable used before initialization

**Generated Tests**:
```python
# Test 1: Asserts the bug
def test_uninitialized_variable_error():
    with pytest.raises(NameError):
        buggy_function()

# Test 2: Verifies the fix
def test_initialized_variable_works():
    result = fixed_function()
    assert result == expected_value

# Test 3: Edge case - empty input
def test_initialized_with_empty_input():
    result = fixed_function([])
    assert result == 0
```

### Type 2: Error Handling Proof

**Issue**: No error handling for exception-prone code

**Generated Tests**:
```python
# Test 1: Asserts exception occurs
def test_division_by_zero_uncaught():
    with pytest.raises(ZeroDivisionError):
        divide(10, 0)

# Test 2: Verifies error handling
def test_division_with_error_handling():
    result = divide_safe(10, 0)
    assert result is None or result == 'error'

# Test 3: Normal case still works
def test_division_normal_case():
    assert divide_safe(10, 2) == 5
```

### Type 3: Type Safety Proof

**Issue**: Type mismatch or type coercion errors

**Generated Tests**:
```python
# Test 1: Wrong type fails
def test_wrong_type_raises():
    with pytest.raises((TypeError, AttributeError)):
        process_items("not a list")

# Test 2: Correct type works
def test_correct_type_works():
    result = process_items([1, 2, 3])
    assert result == 3

# Test 3: Type hints catch issues
def test_type_hints_provide_safety():
    # Type checkers should flag this:
    # process_items("invalid")  # TypeError
    pass
```

### Type 4: Logic Error Proof

**Issue**: Incorrect algorithm or business logic

**Generated Tests**:
```python
# Test 1: Current behavior (wrong)
def test_current_behavior():
    assert calculate_discount(100) == 95  # BUG!

# Test 2: Expected behavior (correct)
def test_expected_behavior():
    # 10% discount should be:
    assert calculate_discount(100) == 90

# Test 3: Edge cases
def test_edge_cases():
    assert calculate_discount(0) == 0
    assert calculate_discount(1) == 0.9
```

---

## API Reference

### `analyze_code()` with Proof Generation

```python
from analyze import analyze_code

result = analyze_code(
    code: str,                      # Code to analyze
    language: str,                  # 'python', 'javascript', 'java', etc.
    analyze_for: List[str] = None,  # Optional: aspects to check
    generate_proof: bool = False,   # NEW: Generate tests?
    issue_to_resolve: str = None    # NEW: Which issue to create tests for?
) -> CodeAnalysisResult
```

### Return Value: `CodeAnalysisResult`

```python
@dataclass
class CodeAnalysisResult:
    success: bool                          # Analysis completed?
    language: str                          # Language analyzed
    complexity: str                        # 'simple', 'moderate', 'complex'
    issues: List[str]                      # Issues found
    suggestions: List[str]                 # Improvement suggestions
    proof_steps: Optional[ProofSteps]      # NEW: Generated tests (if requested)
```

### Proof Steps Object: `ProofSteps`

```python
@dataclass
class ProofSteps:
    should_generate_proof: bool            # Was proof generated?
    generated_tests: List[str]             # Test code (as strings)
    proof_description: str                 # Explanation of proofs
    assertions_failed: List[str]           # Expected failures with buggy code
    proof_examples: List[ProofStep]        # Detailed proof objects
```

### Example Proof Step: `ProofStep`

```python
@dataclass
class ProofStep:
    test_name: str                         # Name of the test
    test_code: str                         # Actual test code
    assertion_description: str             # What the test checks
    should_fail_with_bug: bool             # Will it fail with buggy code?
    should_pass_with_fix: bool             # Will it pass with fixed code?
```

---

## Usage Examples

### Example 1: Basic Proof Generation

```python
from analyze import analyze_code

# Analyze code and generate proofs
result = analyze_code(
    code="""
def calculate(items):
    for item in items:
        total += item['value']
    return total
    """,
    language="python",
    generate_proof=True,
    issue_to_resolve="undefined variable 'total'"
)

# Review the proofs
if result.proof_steps:
    print("Issue:", result.issues)
    print("Proof Description:", result.proof_steps.proof_description)
    print("\nGenerated Tests:")
    for test in result.proof_steps.generated_tests:
        print("---")
        print(test)
```

### Example 2: Save Tests to File

```python
from analyze import analyze_code

result = analyze_code(
    code=buggy_code,
    language="python",
    generate_proof=True,
    issue_to_resolve="undefined variable 'total'"
)

# Save generated tests to file
if result.proof_steps:
    with open("test_proof.py", "w") as f:
        f.write("import pytest\n\n")
        for test in result.proof_steps.generated_tests:
            f.write(test)
            f.write("\n\n")

print("Tests saved to test_proof.py")
```

### Example 3: Multi-Language Proof Generation

```python
from analyze import analyze_code

# Python
python_result = analyze_code(
    code="total += item",
    language="python",
    generate_proof=True,
    issue_to_resolve="variable not initialized"
)

# JavaScript
js_result = analyze_code(
    code="total += item.value;",
    language="javascript",
    generate_proof=True,
    issue_to_resolve="variable not declared"
)

# Java
java_result = analyze_code(
    code="total += item.value;",
    language="java",
    generate_proof=True,
    issue_to_resolve="variable not initialized"
)

# All use the same proof workflow!
# Each generates language-specific tests
```

---

## Proof Step Patterns

### Pattern 1: The Missing Initialization

**Issue Code**:
```python
def calculate(items):
    for item in items:
        total += item.get('value', 0)  # total not initialized!
    return total
```

**Proof Pattern**:
```python
# ❌ Test that FAILS with buggy code
def test_uninitialized():
    with pytest.raises(NameError):
        calculate([{'value': 10}])

# ✓ Test that PASSES with fix
def test_initialized():
    assert calculate([{'value': 10}]) == 10
```

### Pattern 2: The Missing Error Handling

**Issue Code**:
```python
def divide(a, b):
    return a / b  # No check for b == 0!
```

**Proof Pattern**:
```python
# ❌ Test that FAILS with buggy code
def test_division_by_zero():
    with pytest.raises(ZeroDivisionError):
        divide(10, 0)

# ✓ Test that PASSES with fix
def test_division_safe():
    assert divide(10, 2) == 5
    # No exception on b == 0
    result = divide(10, 0)
    assert result is None
```

### Pattern 3: The Wrong Logic

**Issue Code**:
```python
def apply_discount(price, discount):
    return price + discount  # Should be subtract!
```

**Proof Pattern**:
```python
# ❌ Test that FAILS with buggy code
def test_wrong_calculation():
    assert apply_discount(100, 10) == 90  # Fails! (returns 110)

# ✓ Test that PASSES with fix
def test_correct_calculation():
    assert apply_discount(100, 10) == 90  # Now passes!
```

---

## Best Practices

### ✅ DO

- **Generate proofs for critical issues** - Especially initialization, errors, logic
- **Review generated tests** - Understand what they're testing
- **Keep tests readable** - Tests are documentation
- **Run tests frequently** - Validate as you code
- **Commit tests with code** - Keep them in sync
- **Use edge cases** - Tests catch corner cases

### ❌ DON'T

- **Ignore test failures** - They indicate real issues
- **Modify tests to match buggy code** - Fix the code instead
- **Over-test simple code** - Balance coverage with complexity
- **Forget edge cases** - Empty input, null, boundary values
- **Skip error handling tests** - Errors happen in production
- **Delete tests after passing** - They prevent regression

---

## Workflow Integration

### Development Workflow with Proofs

```
1. Write Code
   └─→ Code has bugs

2. Analyze Code
   ├─→ Detect issues
   └─→ generate_proof=True

3. Review Generated Tests
   └─→ Understand failures

4. Fix Code
   ├─→ Implement corrections
   └─→ Based on test requirements

5. Run Tests
   ├─→ pytest test_proof.py
   └─→ All pass? → Done ✓
   
6. Commit
   ├─→ Code + tests together
   └─→ Tests document the fix
```

### CI/CD Integration

```bash
# In your CI pipeline:

# Step 1: Analyze code (no proof generation)
analyze-code --language python src/main.py

# Step 2: Run existing test suite
pytest tests/

# Step 3: For new issues, generate proofs
analyze-code --generate-proof --issue "undefined var" src/new_feature.py

# Step 4: Run proof tests
pytest test_proof.py

# Step 5: Only merge if all tests pass
```

---

## Troubleshooting

### Issue: "No tests generated"

**Cause**: Issue type not recognized  
**Solution**: Try a more specific issue description

```python
# ❌ Vague
analyze_code(code, generate_proof=True, issue_to_resolve="bug")

# ✅ Specific
analyze_code(code, generate_proof=True, issue_to_resolve="undefined variable 'total'")
```

### Issue: "Generated tests don't match my code"

**Cause**: Tests are generic templates  
**Solution**: Customize tests to match your specific code

```python
# Generated test (template):
def test_initialize():
    assert calculate([{'value': 10}]) == 10

# Your customized test (specific):
def test_sum_list_of_products():
    """Tests our specific domain logic"""
    assert calculate([{'price': 25}, {'price': 75}]) == 100
```

### Issue: "Tests pass but code still has issues"

**Cause**: Tests only cover specified issue  
**Solution**: Generate proofs for other issues too

```python
# Get all issues first
result = analyze_code(code, language="python")
print(result.issues)

# Then generate proofs for each:
for issue in result.issues:
    proof_result = analyze_code(
        code, 
        language="python",
        generate_proof=True,
        issue_to_resolve=issue
    )
```

---

## Summary

Proof Steps transform issue analysis into actionable test code:

- **Identifies issues** - Code analyzer finds problems
- **Generates tests** - Creates test cases automatically
- **Verifies fixes** - Tests prove issue is resolved
- **Prevents regression** - Tests guard against future bugs
- **Documents intent** - Tests explain what code should do

Use proof steps to make debugging faster, more reliable, and well-documented.
