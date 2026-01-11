# Quick Reference: Strong → Weak Agent Workflow

**For use in the Spider-Man Villain Timeline example repository**

---

## One-Minute Overview

```
Strong Agent (diagnoses & delegates):
  → Investigates problem
  → Proves issue with tests
  → Creates 3 task instructions
  → Passes to Weak Agents

Weak Agents (execute in sequence):
  → Task A: Implements code fix
  → Task B: Writes unit tests
  → Task C: Updates documentation

Result: Fully automated, reproducible, zero manual coordination
```

---

## When Someone Says "There's a Bug"

### Strong Agent Does This

```
1. READ THE BUG REPORT
   → What's broken? Where?

2. INVESTIGATE CODE
   → Search for related logic
   → Find problem area
   → Check affected files

3. PROVE IT'S BROKEN
   → Run failing test: npm test -- file.test.ts
   → Verify failure output
   → Show exact line causing issue

4. CREATE FIX INSTRUCTIONS
   → Task A: "Replace lines 45-50 in file.ts with this code"
   → Task B: "Write tests for that change"
   → Task C: "Update docs with new behavior"

5. DELEGATE (automatically)
   → runSubagent("Code Agent", taskA)
   → runSubagent("Test Agent", taskB)
   → runSubagent("Docs Agent", taskC)

6. REPORT
   → All tasks completed
   → Issue is fixed
```

### Weak Agents Do This

**Code Agent:**
- Make exact code changes specified
- Run `npm run build`
- Verify changes in `public/script.js`
- Report: "✓ Code implemented"

**Test Agent:**
- Write tests from specification
- Run `npm test`
- Verify all pass
- Report: "✓ Tests written"

**Docs Agent:**
- Update documentation
- Check all links work
- Verify examples match code
- Report: "✓ Docs updated"

---

## Real Example

### Scenario: "Green Goblin appears 3 times in the timeline instead of 1"

**Strong Agent:**
```
1. Investigates: mergeSeries.ts
2. Proves: Test shows 3 instead of 1
3. Root cause: No deduplication in merge logic
4. Creates tasks:
   - Task A: "Add dedup check in mergeSeries.ts lines 92-95"
   - Task B: "Write test: should return 1 Green Goblin"
   - Task C: "Update API.md deduplication section"
5. Delegates to 3 agents
6. Reports: "Issue fixed, all tasks complete"
```

**Weak Agents Execute:**
- Code Agent: Changes lines 92-95, verifies build
- Test Agent: Writes test, verifies passes
- Docs Agent: Updates docs, verifies links

**Result:** Bug fixed, tested, documented

---

## Key Rules

### For Strong Agents ✅
- **Prove first:** Use tests to show the bug
- **Be specific:** "Replace lines 45-50" not "fix the logic"
- **Think first:** Analyze before creating instructions
- **Never vague:** Task instructions must be exact

### For Weak Agents ✅
- **Follow exactly:** Don't improvise
- **Verify each step:** Test after each change
- **Report honestly:** Say if something fails
- **Read output:** Check `public/script.js` for JS changes

### For Both ✅
- **Always verify:** Don't trust build success
- **Test thoroughly:** Run all tests
- **Communicate:** Clear instructions, clear results
- **Never skip proof:** Proof > assumption

---

## Documentation Files

| File | Purpose |
|------|---------|
| [STRONG_WEAK_AGENT_WORKFLOW.md](./STRONG_WEAK_AGENT_WORKFLOW.md) | Complete workflow definition |
| [SEQUENTIAL_SUBAGENT_IMPLEMENTATION.md](./SEQUENTIAL_SUBAGENT_IMPLEMENTATION.md) | Implementation code + examples |
| This file | Quick reference card |

---

## Automation Status

✅ **Fully Automated** - No manual coordination needed  
✅ **Sequential** - Each agent completes, next begins  
✅ **Reproducible** - Same workflow every time  
✅ **Auditable** - Full record of diagnosis → tasks → results  

---

## Future Enhancement

**Once mature (after 10+ workflows):**
- Create parallel spawner tool
- Run agents simultaneously
- 3× speedup (15 min → 5 min)
- Still fully automated

See: [Future Enhancement: Parallel Agent Spawner Tool](./STRONG_WEAK_AGENT_WORKFLOW.md#future-enhancement-parallel-agent-spawner-tool)

---

## Troubleshooting

**"Task failed, agent didn't follow instructions"**
- Strong Agent: Check instructions were specific enough
- Weak Agent: Re-read instructions, follow exactly
- Both: Add more context/examples to next task

**"Build succeeded but changes don't appear in public/script.js"**
- Read `public/script.js` and search for your function
- Verify exact line numbers in compiled output
- If missing, rebuild and check again

**"Tests pass but feature doesn't work"**
- Test coverage might be incomplete
- Add more test cases for edge cases
- Verify behavior in browser manually

---

## Quick Commands

```bash
# For Strong Agent - Diagnose
npm test -- file.test.ts                    # Show the bug
grep -n "pattern" src/file.ts               # Find exact location
npm run build                                # Verify build works

# For Weak Agents - Execute
npm run build                                # Build after code changes
npm test -- specific.test.ts                # Run specific tests
grep "pattern" public/script.js              # Verify output contains change
npm run serve                                # Test in browser if UI change
```

---

## Example: Full Workflow

```markdown
# User Reports Bug
"The D3 graph doesn't show villain names"

# Strong Agent Diagnosis
Issue: src/visualization/d3Graph.ts line 123
Root Cause: names array is empty, not populated from data
Proof: npm test fails showing undefined names
Severity: Critical

# Task A: Code Implementation
File: src/visualization/d3Graph.ts
Line: 123
Change: Add .map() to populate names from villain objects

# Task B: Unit Tests
File: src/__tests__/visualization/d3Graph.test.ts
Test: villainNames should equal input villain names

# Task C: Documentation
File: docs/API.md
Section: D3 Graph Configuration
Update: Name binding example

# Results
✓ Task A: Code changed, build succeeds
✓ Task B: Tests pass, 95% coverage
✓ Task C: Docs updated and verified

# Outcome
✅ Issue fixed, tested, documented
✅ All changes verified in compiled output
✅ Ready for production
```

---

## Remember

**This workflow is about:**
- Strong agents finding and proving problems
- Weak agents implementing exact solutions
- Clear communication between steps
- Verification at every stage

**Not about:**
- Guessing or assumptions
- Unproven fixes
- Manual coordination
- "It looks good" claims

**Always:** Prove > Assume, Verify > Trust, Test > Hope
