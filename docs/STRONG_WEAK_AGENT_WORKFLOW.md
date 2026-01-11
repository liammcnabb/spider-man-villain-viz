# Strong Agent → Weak Agent Workflow

## Overview

This workflow delegates complex problem-solving to specialized agents:

- **Strong Agent** (Expert): Diagnoses issues, creates proof, writes detailed instructions
- **Weak Agent** (Implementation): Executes exact instructions provided, tests thoroughly

This separation ensures:
- ✅ Issues are fully understood before implementation
- ✅ Clear, reproducible instructions reduce errors
- ✅ Implementation is systematic and verifiable
- ✅ Proof steps prevent false positives

---

## Phase 1: Strong Agent - Diagnosis & Proof

### 1.1 Issue Identification

**Task:** Understand the problem completely

```
INPUT:  User reports an issue or requests a feature
OUTPUT: Clear problem statement with:
  - What is broken/missing
  - Why it's broken (root cause)
  - Where in codebase it occurs
  - How to reproduce it
```

**Steps:**
1. Read relevant source files
2. Check data files for corruption
3. Run tests to identify failures
4. Search for related code patterns
5. Trace execution flow

**Example:**
```
ISSUE: "D3 visualization not rendering villain names"

DIAGNOSIS:
- Source: src/visualization/d3Graph.ts (lines 45-67)
- Cause: Names array is empty, not populated from data
- Root: data/d3-config.json has malformed villain objects
- Reproduce: npm run build && npm run serve && check browser console
```

### 1.2 Root Cause Analysis

**Task:** Explain WHY the issue exists

```
INPUT:  Problem statement and code investigation
OUTPUT: Root cause with:
  - The exact code causing the issue
  - Why the code is wrong
  - How data/flow breaks at this point
```

**Check List:**
- [ ] Verified issue exists (not assumption)
- [ ] Found exact line/function causing problem
- [ ] Traced data flow from source to output
- [ ] Identified all affected modules
- [ ] Documented the failure cascade

**Example:**
```
ROOT CAUSE: Data processing merge bug

File: src/utils/mergeSeries.ts (lines 89-103)

Problem Code:
```typescript
const villains = [...newVillains];
// BUG: Doesn't check if villain already exists
// Adds duplicate entries for same villain across series
```

Why It's Wrong:
- No deduplication logic for villain names
- Array push happens for every series, not just first
- Results in ["Green Goblin", "Green Goblin", "Mysterio", "Green Goblin"]

Data Flow Broken:
- Raw data: {"name": "Green Goblin"} ✓ correct
- After merge: [{"name": "Green Goblin"}, {"name": "Green Goblin"}] ✗ broken
- In D3 render: Names appear N times (N = number of series)
```

### 1.3 Proof Steps

**Task:** Create reproducible steps that prove the issue

```
INPUT:  Root cause analysis
OUTPUT: Step-by-step proof with:
  - Exact commands to run
  - Expected output showing failure
  - Line-by-line code showing the bug
  - Test case demonstrating issue
```

**Proof Methods (in order of preference):**

1. **Unit Test Failure** (strongest proof)
   ```bash
   npm test -- mergeSeries.test.ts
   
   Expected Output:
   FAIL  src/__tests__/utils/mergeSeries.test.ts
   ✗ should deduplicate villains across series
   Expected: 1
   Received: 3
   ```

2. **Integration Test Failure**
   ```bash
   npx ts-node test-merge-logic.ts
   
   Expected Output:
   ❌ Merge failed: Duplicate villains found
   villains.json has 2847 entries (should be 1240)
   Duplicates: Green Goblin (×3), Mysterio (×2), ...
   ```

3. **Visual Inspection**
   ```bash
   npm run build
   npm run serve
   # Open browser console → see errors about undefined names
   # Check D3 graph → see duplicate villain names
   ```

4. **Code Inspection**
   ```bash
   # Search source file
   grep -n "villains.push" src/utils/mergeSeries.ts
   # Line 92: const newVillains = allSeries.flatMap(s => s.villains);
   # ^^^ Bug: flattens ALL villains without dedup
   ```

**Complete Proof Template:**
```markdown
## Issue Proof: [Brief Issue Title]

### Proof Step 1: Reproduce the Failure
Command: npm test -- myModule.test.ts
Expected: FAIL - duplicate villain bug
Actual: FAIL - duplicate villain bug ✓

### Proof Step 2: Inspect Source
File: src/utils/mergeSeries.ts
Line 92: Bug is here → [shows code]
Problem: [explains why it's wrong]

### Proof Step 3: Verify Impact
File: data/villains.json
Duplicates found: 1234
Should be: 456
```

### 1.4 Create Instruction Guide

**Task:** Write step-by-step implementation instructions for the Weak Agent

```
INPUT:  Root cause + proof
OUTPUT: Implementation guide with:
  - Exact files to modify
  - Specific code to change (before/after)
  - Why each change is needed
  - What to test and how
```

**Instruction Guide Template:**

```markdown
# Implementation Guide: [Issue Title]

## Issue Summary
[Brief description of what's broken and why]

## Root Cause
[From Phase 1.2]

## Solution Overview
[High-level description of what will be fixed]

## Implementation Steps

### Step 1: [Specific Task]
**File:** src/path/to/file.ts
**Lines:** 45-67

**What to do:**
Replace this:
\`\`\`typescript
// OLD CODE
const result = data.villains.push(villain);
\`\`\`

With this:
\`\`\`typescript
// NEW CODE
if (!result.villains.find(v => v.name === villain.name)) {
  result.villains.push(villain);
}
\`\`\`

**Why:**
Checks if villain already exists before adding to prevent duplicates.

### Step 2: [Next Specific Task]
...

## Verification Steps

### Test 1: Unit Test
\`\`\`bash
npm test -- mergeSeries.test.ts
Expected: ✓ All tests pass
\`\`\`

### Test 2: Data Integrity
\`\`\`bash
npx ts-node test-merge-logic.ts
Expected: No duplicate errors
\`\`\`

### Test 3: Compilation
\`\`\`bash
npm run build
Expected: ✓ Build succeeds
\`\`\`

### Test 4: Visual (if UI change)
\`\`\`bash
npm run serve
Then open http://localhost:8000
Expected: [Describe what should look correct]
\`\`\`

## Validation Checklist
- [ ] All files modified as specified
- [ ] All tests pass
- [ ] public/script.js verified (for JS changes)
- [ ] npm run build succeeds
- [ ] Visual test passes (if applicable)

## Success Criteria
When complete, you should see:
1. Test results: [Specific test assertions]
2. Data output: [Specific data structure]
3. Visual appearance: [Specific UI change]
```

---

## Phase 2: Weak Agent - Implementation

### 2.1 Receive Instructions

**Task:** Read and understand the implementation guide

```
INPUT:  Instruction guide from Strong Agent
OUTPUT: Confirm understanding before starting
```

**Checklist:**
- [ ] Read the entire guide
- [ ] Understand why each step is needed
- [ ] Know what tests to run
- [ ] Know what success looks like

### 2.2 Execute Steps

**Task:** Follow instructions exactly, file by file

```
INPUT:  Implementation guide
OUTPUT: Modified source files
```

**For Each Step:**
1. Open the specified file
2. Find the exact code section
3. Replace old code with new code
4. Verify the change looks correct
5. Move to next step

**Important:**
- Follow instructions exactly
- Don't improvise or modify the plan
- Don't skip verification between steps
- Stop if instructions are unclear and ask for clarification

### 2.3 Run Verification Tests

**Task:** Execute each verification test in order

```bash
# Test 1: Unit tests
npm test -- [specific test file]
# MUST PASS before proceeding

# Test 2: Data processing tests
npx ts-node test-merge-logic.ts
# MUST PASS before proceeding

# Test 3: Build
npm run build
# MUST SUCCEED before proceeding

# Test 4: Visual (if applicable)
npm run serve
# Test in browser, verify expected behavior
```

**Checkpoint:** After each test, confirm it passes before moving to the next one.

### 2.4 Final Verification

**Task:** Complete verification checklist

Before claiming implementation is complete:

- [ ] Modified files match instruction guide exactly
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] `npm run build` succeeds
- [ ] **Read [public/script.js](../public/script.js) and verify changes appear** (for JS logic changes)
- [ ] Visual test passes in browser (if UI change)
- [ ] No new errors in console

### 2.5 Report Results

**Task:** Provide clear summary to Strong Agent

```markdown
## Implementation Complete

### Files Modified
- src/utils/mergeSeries.ts (lines 89-103)
- src/__tests__/utils/mergeSeries.test.ts (added test case)

### Tests Passed
- ✓ npm test -- mergeSeries.test.ts (5/5 passed)
- ✓ npx ts-node test-merge-logic.ts (0 duplicates found)
- ✓ npm run build (success)

### Verification
- ✓ Changes verified in public/script.js
- ✓ D3 graph renders without duplicate names

### Issue Resolved
Data now correctly deduplicates villains across series.
```

---

## Full Workflow Example

### Strong Agent Session

```
USER: "The villain timeline shows Green Goblin 3 times instead of once"

STRONG AGENT:
1. Investigates mergeSeries.ts
2. Finds flatMap without deduplication
3. Writes test showing 3 instead of 1
4. Creates instruction guide with exact changes needed
5. Passes to Weak Agent with complete proof

INSTRUCTION GUIDE:
"Replace lines 92-95 in mergeSeries.ts to add dedup check"
"Run npm test to verify (expect 5 passes, currently 1 fails)"
"Then run npm run build and test in browser"
```

### Weak Agent Session

```
WEAK AGENT receives instruction guide:
1. Opens src/utils/mergeSeries.ts
2. Replaces lines 92-95 exactly as specified
3. Runs npm test → ✓ 5/5 pass
4. Runs npm run build → ✓ success
5. Opens browser, verifies Green Goblin appears once
6. Reports back: "Implementation complete, all tests pass"

RESULT: Issue solved with high confidence
```

---

## Scaling: Multiple Parallel Weak Agents

### Automation Architecture

Strong Agents can automatically delegate to Weak Agents using available tooling:

**Primary Approach: Sequential Sub-Agents (Fully Automated Today)**
- ✅ Uses built-in `runSubagent()` tool
- ✅ No manual coordination
- ✅ Repeatable and reliable
- ⚠️ Sequential execution (3-4 minutes per workflow)
- Good for: Example repositories, reproducible workflows

**Advanced Approach: Parallel Sub-Agent Spawner (Future Enhancement)**
- Create custom tool to spawn agents in parallel
- ✅ Full automation AND 3× speed
- ⚠️ Requires tool development (2-4 hours one-time)
- Good for: Production systems where speed matters

**This guide emphasizes the Sequential Sub-Agent approach** because it:
1. Works with available tools today
2. Requires zero manual coordination (fully automated)
3. Perfect for demonstrating context engineering
4. Can evolve to parallel spawner later

### Token Economics

**Single Weak Agent (Sequential):**
- ~24,000 tokens for code + tests + docs
- Slower (all tasks sequential)

**Three Parallel Weak Agents:**
- ~27,000 tokens (only 12% more)
- 3× faster (parallel execution)

**Verdict:** Parallel agents are worth the token cost when tasks are independent.

### When to Use Parallel Agents ✅

1. **Tasks are truly independent**
   - Code changes don't block tests
   - Documentation doesn't need live code verification
   - No file write conflicts

2. **Strong Agent can cleanly separate work**
   ```
   Task A: Modify src/utils/file.ts lines 45-67 (do exactly this)
   Task B: Test cases for the above (verify with jest)
   Task C: Update docs/API.md (add this section)
   ```

3. **Time savings justify token overhead**
   - 3 tasks → 3× speedup
   - Token cost ~12% higher
   - Good trade-off for complex issues

4. **Each task has roughly equal complexity**
   - If one is trivial, keep serial
   - If one task is 10× bigger, consider serial

### Implementation Approaches

#### Approach 1: Sequential Sub-Agents with runSubagent() [RECOMMENDED FOR THIS PROJECT]

**Strong Agent Workflow:**

```typescript
// Strong Agent uses this pattern:

const issueProof = await diagnoseAndProveIssue();
// - Investigates the problem
// - Runs tests to show failure
// - Documents root cause
// - Returns proof object

const taskInstructions = await createInstructionGuides(issueProof);
// - Task A: Code implementation
// - Task B: Unit tests  
// - Task C: Documentation

// Execute tasks sequentially via runSubagent
const taskAResults = await runSubagent(
  "Weak Agent: Code Implementation",
  createTaskPrompt("A", issueProof, taskInstructions.a)
);

const taskBResults = await runSubagent(
  "Weak Agent: Unit Tests",
  createTaskPrompt("B", issueProof, taskInstructions.b)
);

const taskCResults = await runSubagent(
  "Weak Agent: Documentation",
  createTaskPrompt("C", issueProof, taskInstructions.c)
);

// Aggregate and report
return aggregateResults([taskAResults, taskBResults, taskCResults]);
```

**What each Weak Agent receives:**

- **Agent A (Code):** Issue proof + exact code changes (lines/files) + verification checklist
- **Agent B (Tests):** Issue proof + test patterns + specific assertions + coverage targets  
- **Agent C (Docs):** Issue proof + documentation format + where to add sections

**Pros:**
- ✅ Fully automated (zero manual coordination)
- ✅ Works with available tools today
- ✅ Perfect for example repository (reproducible, auditable)
- ✅ Each agent gets fresh context
- ✅ Clear separation of concerns

**Cons:**
- Sequential execution (~10-15 minutes for complex issues)
- Agent B waits for Agent A to start
- Agent C waits for Agent B to start
- Token cost slightly higher (~27K vs 24K)

**When to use:**
- Demonstrating context engineering patterns ← **Recommended for this project**
- Complex issues requiring careful proof
- When reliability and reproducibility matter
- Building replicable workflows
- Example repositories

#### Approach 2: Human Coordinator (Fast but Manual)

Only if you absolutely need true parallelization and manual coordination is acceptable:

```
Strong Agent creates 3 task instructions
User pastes Task A into Agent A session
User pastes Task B into Agent B session [parallel]
User pastes Task C into Agent C session [parallel]
```

**Pros:** True 3× parallel (5-7 minute savings)
**Cons:** Manual, not replicable, not for example repo

#### Approach 3: Custom Parallel Spawner Tool [FUTURE ENHANCEMENT]

For true automated parallelization. See "Future Enhancements" section.

### Parallel Agent Task Separation

**For Strong Agent (all approaches):**

Create clear task assignments that don't depend on each other:

```markdown
# Implementation Tasks

## Task A: Code Implementation
**Agent:** Code Specialist
**Goal:** Implement the fix exactly as specified

Files to modify:
- src/utils/mergeSeries.ts (lines 92-103)
  Replace: [old code]
  With: [new code]
  
- src/visualization/d3Graph.ts (lines 45-56)
  Add: [new functions]

Verification:
- npm run build succeeds
- Read public/script.js and verify changes appear
- Report: List of modifications made

## Task B: Unit Tests
**Agent:** Test Specialist
**Goal:** Write tests for the code changes

Test file: src/__tests__/utils/mergeSeries.test.ts

Test cases:
- should deduplicate villains across series
- should preserve first appearance order
- should handle empty series gracefully

Verification:
- npm test passes (all new tests passing)
- Coverage for new code paths
- Report: Test file created, X% coverage achieved

## Task C: Documentation
**Agent:** Documentation Specialist
**Goal:** Update docs reflecting the change

Files to update:
- docs/ARCHITECTURE.md (update deduplication section)
- docs/API.md (update mergeSeries() documentation)
- Add example to docs/EXAMPLES.md

Verification:
- All links work (test in browser)
- Examples match actual code
- Report: Documentation files updated with sections added

# Important: These tasks can run in parallel
# Each agent needs only their task description
# Coordinate by having all read the original issue proof
```

### Parallel Weak Agent Execution

**For Weak Agents:**

When you receive parallel assignments:

1. **Agent receives task** (e.g., Task A: Code)
2. **Agent reads:**
   - Original issue proof from Strong Agent
   - Task A specification only
   - Relevant file context for Task A
3. **Agent executes Task A exactly**
4. **Agent verifies Task A** (build succeeds, changes verified)
5. **Agent reports Task A complete**

**Important:** Don't wait for other agents or modify their domains.

### Parallel Agent Report Template

Each parallel agent reports independently:

```markdown
## Task A: Code Implementation - COMPLETE

### Changes Made
- src/utils/mergeSeries.ts (lines 92-103): Added dedup check
- src/visualization/d3Graph.ts (lines 45-56): Added sort function

### Verification
- npm run build: ✓ SUCCESS
- public/script.js verified: ✓ Changes present (lines 1234-1250)
- No new errors: ✓

### Status
Ready for Task B and Task C to complete
```

```markdown
## Task B: Unit Tests - COMPLETE

### Tests Written
- src/__tests__/utils/mergeSeries.test.ts (5 new test cases)

### Verification
- npm test: ✓ 5/5 PASS
- Coverage: ✓ 95% for modified code
- No broken tests: ✓

### Status
Tests for Task A complete, awaiting Task A completion for integration
```

```markdown
## Task C: Documentation - COMPLETE

### Docs Updated
- docs/ARCHITECTURE.md (section: Deduplication Strategy)
- docs/API.md (function: mergeSeries())

### Verification
- Links checked: ✓ All valid
- Examples match code: ✓ (using public/script.js)
- Formatting: ✓ Consistent

### Status
Documentation updated, no code dependencies
```

### When to Keep Single Agent ❌

**Use one sequential weak agent when:**

1. **Tasks have hard dependencies**
   ```
   ❌ Wrong: Parallel tests before code is written
   ✅ Right: Code first, then tests
   ```

2. **Token budget is extremely tight**
   - Save 12% tokens by going sequential
   - Accept 3× slower execution

3. **Coordination complexity is high**
   - Hard to split work cleanly
   - Multiple file conflicts
   - Requires synchronization

4. **One task is much larger** (e.g., 80% of work)
   - Tests are trivial → single agent
   - Code is huge → single code agent
   - Parallelize doesn't help much

---

## Key Principles

### For Strong Agent
- ✅ **Prove everything:** Test first, then explain
- ✅ **Be explicit:** Exact line numbers, exact code changes
- ✅ **Create proof:** Before giving instructions
- ✅ **Think first:** Analyze before implementing

### For Weak Agent
- ✅ **Follow exactly:** Don't improvise or skip steps
- ✅ **Test after each:** Verify each step works
- ✅ **Report honestly:** If something fails, report it
- ✅ **Execute completely:** Run all verification steps

### For Both
- ✅ **Verify output:** Always check compiled JavaScript for logic changes
- ✅ **Test thoroughly:** Unit tests + integration tests + visual test
- ✅ **Communicate clearly:** Clear instructions, clear results
- ✅ **Never skip proof:** Proof > assumption always

---

## Common Workflow Mistakes

### ❌ Strong Agent Mistakes

1. **Skip proof step**
   - Wrong: Create instructions without running tests
   - Right: Prove issue exists, then write instructions

2. **Vague instructions**
   - Wrong: "Fix the merge logic"
   - Right: "Replace lines 92-95 in mergeSeries.ts with this exact code: [code]"

3. **Incomplete verification list**
   - Wrong: Only mention unit tests
   - Right: List unit tests + integration tests + build test + visual test

### ❌ Weak Agent Mistakes

1. **Skip verification steps**
   - Wrong: Edit one file and claim done
   - Right: Edit all files, run all tests, verify in browser

2. **Modify instructions**
   - Wrong: "The instructions say line 45 but I think line 50 is better"
   - Right: Follow exact instructions, report if something seems wrong

3. **Trust the build**
   - Wrong: "npm run build succeeded so I'm done"
   - Right: Build succeeded AND public/script.js verified AND tests pass

4. **Don't verify output**
   - Wrong: Edit TypeScript and trust compilation
   - Right: Edit TypeScript, build, read public/script.js, verify changes are there

---

## Integration with Existing Workflow

This workflow enhances existing rules:

| Existing Rule | Strong Agent | Weak Agent |
|---|---|---|
| Minimize Scraping | Investigate if data is really broken | Execute data processing fixes, not scraping |
| Verify Output Files | Create proof before instructions | Verify changes in compiled output |
| Use Tests as Proof | Run tests to diagnose | Run tests to verify |
| Never Skip Verification | Skip nothing in diagnosis | Skip nothing in implementation |

---

## Implementation Guide

For a complete, ready-to-implement guide using the Sequential Sub-Agent approach:

**→ [SEQUENTIAL_SUBAGENT_IMPLEMENTATION.md](./SEQUENTIAL_SUBAGENT_IMPLEMENTATION.md)**

This includes:
- Step-by-step TypeScript implementation
- Code examples for Strong Agent diagnostics
- Task instruction generators
- Weak Agent prompts
- Orchestrator pattern
- Integration examples

This is the **recommended approach** for automating this workflow without manual coordination.

---

## When to Use This Workflow

**Use this workflow when:**
- Issue is complex (multiple files affected)
- Issue root cause is unclear
- Issue requires architectural changes
- Multiple people need to work on same issue
- Need high confidence before implementing

**Optional for:**
- Simple bug fixes (1-2 line changes)
- Feature additions with clear specification
- Routine refactoring

**Always use this workflow for:**
- Data corruption issues
- Complex merge logic bugs
- Architecture changes
- Visualization problems
- Cross-module dependencies
---

## Future Enhancement: Parallel Agent Spawner Tool

Once the Sequential Sub-Agent workflow is mature and proves valuable, consider building a **Parallel Agent Spawner Tool** for true parallelization.

### Architecture Design

```typescript
// File: src/tools/parallel-agent-spawner.ts

interface AgentTask {
  id: string;
  role: "code" | "tests" | "docs" | "custom";
  name: string;
  instructions: string;
  context: Record<string, unknown>;
}

interface ParallelAgentResult {
  taskId: string;
  role: string;
  status: "success" | "failure";
  output: string;
  executionTime: number;
}

interface SpawnParallelAgentsRequest {
  issueTitle: string;
  issueProof: string;
  tasks: AgentTask[];
  maxParallel?: number; // default: 3
}

interface SpawnParallelAgentsResponse {
  aggregatedResults: ParallelAgentResult[];
  totalExecutionTime: number;
  allSucceeded: boolean;
  report: string;
}

/**
 * Spawns multiple weak agents in parallel, each handling independent tasks
 * @param request Configuration with tasks to execute
 * @returns Aggregated results from all agents
 * 
 * Example:
 * ```typescript
 * const results = await spawn_parallel_agents({
 *   issueTitle: "Duplicate villains in timeline",
 *   issueProof: "[proof showing 3 Green Goblins instead of 1]",
 *   tasks: [
 *     {
 *       id: "code",
 *       role: "code",
 *       name: "Code Implementation",
 *       instructions: "Task A: Modify mergeSeries.ts...",
 *       context: { files: [...], lines: [...] }
 *     },
 *     {
 *       id: "tests",
 *       role: "tests",
 *       name: "Unit Tests",
 *       instructions: "Task B: Write tests for dedup...",
 *       context: { testPatterns: [...], assertions: [...] }
 *     },
 *     {
 *       id: "docs",
 *       role: "docs",
 *       name: "Documentation",
 *       instructions: "Task C: Update API docs...",
 *       context: { docsFormat: {...}, sections: [...] }
 *     }
 *   ],
 *   maxParallel: 3
 * });
 * 
 * // Returns:
 * // {
 * //   aggregatedResults: [{id: "code", status: "success", ...}, ...],
 * //   totalExecutionTime: 420, // seconds
 * //   allSucceeded: true,
 * //   report: "[formatted report of all results]"
 * // }
 * ```
 */
async function spawn_parallel_agents(
  request: SpawnParallelAgentsRequest
): Promise<SpawnParallelAgentsResponse> {
  // Implementation would:
  // 1. Spawn multiple agent sessions in parallel (max: request.maxParallel)
  // 2. Send each task to its agent
  // 3. Wait for all to complete (or timeout)
  // 4. Collect and aggregate results
  // 5. Generate formatted report
  
  const results: ParallelAgentResult[] = [];
  const startTime = Date.now();

  // Spawn agents in parallel batches
  const agents = request.tasks.map(task => 
    spawnWeakAgent({
      role: task.role,
      instructions: task.instructions,
      context: task.context,
      issueProof: request.issueProof
    })
  );

  // Wait for all agents to complete
  const responses = await Promise.all(agents);
  
  responses.forEach((response, index) => {
    results.push({
      taskId: request.tasks[index].id,
      role: request.tasks[index].role,
      status: response.succeeded ? "success" : "failure",
      output: response.report,
      executionTime: response.executionTime
    });
  });

  const totalExecutionTime = (Date.now() - startTime) / 1000;

  return {
    aggregatedResults: results,
    totalExecutionTime,
    allSucceeded: results.every(r => r.status === "success"),
    report: formatAggregatedReport(request, results, totalExecutionTime)
  };
}

function formatAggregatedReport(
  request: SpawnParallelAgentsRequest,
  results: ParallelAgentResult[],
  totalTime: number
): string {
  return `
# Parallel Agent Execution Report

## Issue: ${request.issueTitle}

## Execution Summary
- Total Time: ${totalTime}s
- Tasks Completed: ${results.length}
- Success Rate: ${(results.filter(r => r.status === "success").length / results.length * 100).toFixed(0)}%

## Task Results

${results.map(r => `
### Task ${r.taskId.toUpperCase()}: ${r.role}
- Status: ${r.status === "success" ? "✓ SUCCESS" : "✗ FAILURE"}
- Execution Time: ${r.executionTime}s

${r.output}
`).join("\n")}

## Next Steps
${results.every(r => r.status === "success") 
  ? "✓ All tasks completed successfully. Review results above and verify integration."
  : "✗ Some tasks failed. Review failures above and retry."}
`;
}
```

### Integration with Strong Agent

Once the tool exists, Strong Agent would use it like this:

```typescript
// Current approach (Sequential Sub-Agents)
const taskAResults = await runSubagent("Code", taskA);
const taskBResults = await runSubagent("Tests", taskB);
const taskCResults = await runSubagent("Docs", taskC);

// Future approach (Parallel Spawner Tool)
const results = await spawn_parallel_agents({
  issueTitle: "Duplicate villains showing in timeline",
  issueProof: issueProof,
  tasks: [
    { id: "code", role: "code", name: "Code", instructions: taskA, context: {} },
    { id: "tests", role: "tests", name: "Tests", instructions: taskB, context: {} },
    { id: "docs", role: "docs", name: "Docs", instructions: taskC, context: {} }
  ]
});

// Results come back as aggregated report with all task outputs
return formatFinalReport(results);
```

### Implementation Roadmap

**Phase 1: Sequential Sub-Agents (Current)**
- ✅ Fully automated
- ✅ No manual coordination
- ✅ Good for examples
- Time: ~10-15 minutes per workflow

**Phase 2: Parallel Spawner Tool (After 10+ workflows with Sequential)**
- Development time: 2-4 hours
- Testing and refinement: 1-2 hours
- Expected speedup: 3×
- New time: ~3-5 minutes per workflow

**Decision Points:**
- Have you used Sequential approach 10+ times? → Consider building Parallel
- Is speed a critical bottleneck? → Prioritize Parallel tool
- Is your team large enough for parallel tasks? → Parallel more valuable
- Is token budget tighter than time? → Keep Sequential

---