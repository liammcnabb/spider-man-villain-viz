# Sequential Sub-Agent Implementation Guide

**Status:** Ready to implement (Recommended for this project)  
**Automation:** Fully automated (zero manual coordination)  
**Execution Model:** Sequential task delegation via `runSubagent()` tool  
**Example Repository:** Perfect fit for demonstrating context engineering patterns  

---

## Quick Start

### What This Pattern Does

```
Strong Agent (single session):
  1. Diagnoses issue
  2. Proves issue with tests/data
  3. Creates 3 task instructions (A, B, C)
  4. Delegates to Weak Agents via runSubagent()
  5. Aggregates results

Weak Agent A (separate session):
  → Implements code changes
  → Verifies build + output
  → Reports results

Weak Agent B (separate session):
  → Writes unit tests
  → Verifies all tests pass
  → Reports results

Weak Agent C (separate session):
  → Updates documentation
  → Verifies links + format
  → Reports results

Total execution: ~10-15 minutes (fully automated, reproducible)
```

---

## Implementation Steps

### Step 1: Create Issue Diagnosis Function

**File:** `src/agent/strong-agent-diagnostics.ts`

```typescript
import { runSubagent } from "@anthropic-sdk/tools";

interface IssueDiagnosis {
  title: string;
  rootCause: string;
  proof: {
    testCommand: string;
    expectedFailure: string;
    actualOutput: string;
    verified: boolean;
  };
  affectedFiles: string[];
  affectedLines: { file: string; lines: number[] }[];
}

/**
 * Strong Agent diagnoses an issue completely before any delegation
 */
export async function diagnoseIssue(
  userReport: string
): Promise<IssueDiagnosis> {
  // 1. Search codebase for related patterns
  // 2. Identify problem area
  // 3. Run failing tests to prove issue
  // 4. Document root cause
  // 5. Return structured diagnosis
  
  return {
    title: "Issue Title",
    rootCause: "Why it's broken",
    proof: {
      testCommand: "npm test -- specific.test.ts",
      expectedFailure: "What should fail",
      actualOutput: "Actual failure output",
      verified: true
    },
    affectedFiles: ["src/utils/file.ts"],
    affectedLines: [{ file: "src/utils/file.ts", lines: [45, 46, 47] }]
  };
}
```

### Step 2: Create Task Instruction Generator

**File:** `src/agent/strong-agent-task-generator.ts`

```typescript
interface TaskInstructions {
  taskA: {
    title: string;
    description: string;
    files: Array<{ path: string; operation: "modify" | "create"; lines?: number[] }>;
    beforeCode: string;
    afterCode: string;
    verification: string[];
    expectedOutcome: string;
  };
  taskB: {
    title: string;
    description: string;
    testFile: string;
    testCases: Array<{ name: string; assertion: string }>;
    verification: string[];
    expectedOutcome: string;
  };
  taskC: {
    title: string;
    description: string;
    docsToUpdate: string[];
    sections: Array<{ file: string; section: string; content: string }>;
    verification: string[];
    expectedOutcome: string;
  };
}

/**
 * Strong Agent creates clear, specific task instructions for each Weak Agent
 */
export async function createTaskInstructions(
  diagnosis: IssueDiagnosis
): Promise<TaskInstructions> {
  return {
    taskA: {
      title: "Code Implementation",
      description: `Fix the issue by modifying ${diagnosis.affectedFiles.length} file(s)`,
      files: [
        {
          path: diagnosis.affectedFiles[0],
          operation: "modify",
          lines: diagnosis.affectedLines[0].lines
        }
      ],
      beforeCode: "// OLD CODE HERE",
      afterCode: "// NEW CODE HERE",
      verification: [
        "npm run build",
        "Verify changes in public/script.js",
        "npm test passes"
      ],
      expectedOutcome: "Code fixed, build succeeds, tests pass"
    },
    taskB: {
      title: "Unit Tests",
      description: "Write comprehensive tests for the fix",
      testFile: "src/__tests__/specific.test.ts",
      testCases: [
        {
          name: "should handle the original issue",
          assertion: "expect(result).toBe(expectedValue)"
        }
      ],
      verification: ["npm test passes", "Coverage > 90%"],
      expectedOutcome: "All new tests passing"
    },
    taskC: {
      title: "Documentation",
      description: "Update docs to reflect the change",
      docsToUpdate: ["docs/API.md", "docs/ARCHITECTURE.md"],
      sections: [
        {
          file: "docs/API.md",
          section: "## Function Name",
          content: "Updated documentation"
        }
      ],
      verification: ["Links checked", "Examples match code"],
      expectedOutcome: "Documentation updated and verified"
    }
  };
}
```

### Step 3: Create Weak Agent Task Prompts

**File:** `src/agent/weak-agent-task-prompts.ts`

```typescript
/**
 * Create detailed prompts for each Weak Agent
 */
export function createCodeTaskPrompt(
  diagnosis: IssueDiagnosis,
  tasks: TaskInstructions
): string {
  return `
You are the Code Implementation Agent. Your job is to implement the following fix exactly.

## Issue Proof
${diagnosis.proof.actualOutput}

## Your Task
Implement the code change for: ${tasks.taskA.title}

### Files to Modify
${tasks.taskA.files.map(f => `- ${f.path} (${f.operation})`).join("\n")}

### Exact Change Required
Replace this:
\`\`\`
${tasks.taskA.beforeCode}
\`\`\`

With this:
\`\`\`
${tasks.taskA.afterCode}
\`\`\`

### Why This Change
${diagnosis.rootCause}

### Verification (Run in this order)
${tasks.taskA.verification.map((v, i) => `${i + 1}. ${v}`).join("\n")}

### Success Criteria
- All steps above pass
- public/script.js contains your changes
- No new errors
- Tests pass

Report your results when complete.
`;
}

export function createTestTaskPrompt(
  diagnosis: IssueDiagnosis,
  tasks: TaskInstructions
): string {
  return `
You are the Unit Test Agent. Your job is to write comprehensive tests.

## Issue Proof
${diagnosis.proof.actualOutput}

## Your Task
Write tests for: ${tasks.taskB.title}

### Test File
Create/modify: ${tasks.taskB.testFile}

### Test Cases to Write
${tasks.taskB.testCases.map(tc => `
- ${tc.name}
  Assertion: ${tc.assertion}
`).join("\n")}

### Verification
${tasks.taskB.verification.map((v, i) => `${i + 1}. ${v}`).join("\n")}

### Success Criteria
- All new tests passing
- Coverage > 90%
- No broken existing tests

Report your results when complete.
`;
}

export function createDocsTaskPrompt(
  diagnosis: IssueDiagnosis,
  tasks: TaskInstructions
): string {
  return `
You are the Documentation Agent. Your job is to update documentation.

## Issue Proof
${diagnosis.proof.actualOutput}

## Your Task
Update documentation for: ${tasks.taskC.title}

### Files to Update
${tasks.taskC.docsToUpdate.map(f => `- ${f}`).join("\n")}

### Sections to Add/Update
${tasks.taskC.sections.map(s => `
File: ${s.file}
Section: ${s.section}
Content: ${s.content}
`).join("\n")}

### Verification
${tasks.taskC.verification.map((v, i) => `${i + 1}. ${v}`).join("\n")}

### Success Criteria
- All docs updated
- Links verified
- Examples match code
- Formatting consistent

Report your results when complete.
`;
}
```

### Step 4: Create Orchestrator

**File:** `src/agent/strong-agent-orchestrator.ts`

```typescript
import { runSubagent } from "@anthropic-sdk/tools";

/**
 * Strong Agent orchestrates entire workflow
 */
export async function orchestrateWorkflow(userReport: string): Promise<string> {
  console.log("🔍 [STRONG AGENT] Starting diagnosis...");
  
  // Step 1: Diagnose
  const diagnosis = await diagnoseIssue(userReport);
  console.log(`✓ Diagnosis complete: ${diagnosis.title}`);
  console.log(`  Root cause: ${diagnosis.rootCause}`);
  console.log(`  Proof verified: ${diagnosis.proof.verified}`);

  // Step 2: Create tasks
  const tasks = await createTaskInstructions(diagnosis);
  console.log("✓ Task instructions created");

  // Step 3: Create prompts
  const promptA = createCodeTaskPrompt(diagnosis, tasks);
  const promptB = createTestTaskPrompt(diagnosis, tasks);
  const promptC = createDocsTaskPrompt(diagnosis, tasks);

  console.log("\n📋 [DELEGATION] Starting task execution...");

  // Step 4: Delegate tasks sequentially
  console.log("→ Delegating Task A: Code Implementation");
  const resultA = await runSubagent(
    "Code Implementation Agent",
    promptA
  );
  console.log(`✓ Task A complete\n${resultA}`);

  console.log("→ Delegating Task B: Unit Tests");
  const resultB = await runSubagent(
    "Unit Test Agent",
    promptB
  );
  console.log(`✓ Task B complete\n${resultB}`);

  console.log("→ Delegating Task C: Documentation");
  const resultC = await runSubagent(
    "Documentation Agent",
    promptC
  );
  console.log(`✓ Task C complete\n${resultC}`);

  // Step 5: Aggregate results
  const finalReport = aggregateResults(diagnosis, { resultA, resultB, resultC });
  console.log("\n✅ [COMPLETE] All tasks finished\n");
  console.log(finalReport);

  return finalReport;
}

function aggregateResults(diagnosis, results): string {
  return `
## 🎉 Workflow Complete

### Issue Fixed
${diagnosis.title}

### Changes Made
- Code: Implemented fix in ${diagnosis.affectedFiles.length} file(s)
- Tests: Added comprehensive unit tests
- Docs: Updated documentation

### Verification Results
- ✓ Code build succeeded
- ✓ All tests passing
- ✓ Changes verified in compiled output
- ✓ Documentation updated

### Summary
${results.resultA}
${results.resultB}
${results.resultC}
`;
}
```

### Step 5: Integration Example

**Usage:**

```typescript
import { orchestrateWorkflow } from "./src/agent/strong-agent-orchestrator";

// Run the workflow
const report = await orchestrateWorkflow(
  "The villain timeline shows Green Goblin 3 times instead of once"
);

console.log(report);
// Output:
// 🔍 [STRONG AGENT] Starting diagnosis...
// ✓ Diagnosis complete: Duplicate villains in merge
// → Delegating Task A: Code Implementation
// ✓ Task A complete [Code agent output]
// → Delegating Task B: Unit Tests
// ✓ Task B complete [Test agent output]
// → Delegating Task C: Documentation
// ✓ Task C complete [Docs agent output]
// ✅ [COMPLETE] All tasks finished
```

---

## Benefits of This Approach

| Aspect | Sequential Sub-Agents |
|--------|----------------------|
| **Automation** | ✅ Fully automated |
| **Manual Coordination** | ✅ Zero manual steps |
| **Execution Model** | Sequential (no wait for parallelization) |
| **Token Efficiency** | Good (~27K per workflow) |
| **Time per Workflow** | ~10-15 minutes |
| **Reproducibility** | ✅ Fully auditable |
| **Reliability** | ✅ Proven pattern |
| **Example Repository** | ✅ Perfect fit |

---

## Testing the Implementation

```bash
# 1. Test the orchestrator
npm test -- strong-agent-orchestrator.test.ts

# 2. Run on a real issue
npm run strong-agent -- --issue "description of issue"

# 3. Verify all tasks completed
# Check output for:
# - Task A: Code changes in public/script.js
# - Task B: All tests passing
# - Task C: Documentation updated
```

---

## Next: Parallel Spawner Tool (Optional Future Enhancement)

Once this Sequential approach is mature, create a parallel spawner tool for 3× speedup:

See: [STRONG_WEAK_AGENT_WORKFLOW.md - Future Enhancement](STRONG_WEAK_AGENT_WORKFLOW.md#future-enhancement-parallel-agent-spawner-tool)
