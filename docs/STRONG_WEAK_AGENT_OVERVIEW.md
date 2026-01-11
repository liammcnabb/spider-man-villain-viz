# Strong → Weak Agent Workflow: Complete Documentation

**This is a Context Engineering Example Repository pattern for automated, reproducible issue resolution.**

---

## 📚 Documentation Suite

### 1. **STRONG_WEAK_AGENT_WORKFLOW.md** (Main Reference)
   - **What:** Complete workflow definition
   - **When:** Read first to understand the pattern
   - **Contains:**
     - Phase 1: Strong Agent diagnosis & proof
     - Phase 2: Weak Agent implementation
     - Scaling strategies (sequential vs. parallel)
     - Full workflow examples
     - Future enhancement: parallel spawner tool
   - **Length:** ~1000 lines, comprehensive

### 2. **SEQUENTIAL_SUBAGENT_IMPLEMENTATION.md** (Implementation Guide)
   - **What:** Ready-to-implement code examples
   - **When:** Read when implementing in TypeScript
   - **Contains:**
     - Diagnosis function implementation
     - Task instruction generator
     - Weak agent prompt creators
     - Orchestrator pattern
     - Integration examples
   - **Ready to:** Adapt for your codebase
   - **Language:** TypeScript with full type definitions

### 3. **QUICK_REFERENCE_STRONG_WEAK_WORKFLOW.md** (Cheat Sheet)
   - **What:** One-page quick reference
   - **When:** Read for fast lookup during workflow
   - **Contains:**
     - One-minute overview
     - Real example walkthrough
     - Key rules (Strong Agent vs Weak Agent)
     - Troubleshooting tips
     - Quick commands
   - **Perfect for:** Refreshing memory mid-workflow

### 4. **CONTEXT_ENGINEERING.md** (Integration Point)
   - **What:** How this fits in your context engineering
   - **Contains:** Links to all workflow documents
   - **Also contains:** Existing verification rules, scraping guidelines

---

## 🎯 Quick Start Path

**For trying this out right now:**

1. Read: [QUICK_REFERENCE_STRONG_WEAK_WORKFLOW.md](./QUICK_REFERENCE_STRONG_WEAK_WORKFLOW.md) (5 min)
2. Understand: [STRONG_WEAK_AGENT_WORKFLOW.md](./STRONG_WEAK_AGENT_WORKFLOW.md) (30 min)
3. Implement: [SEQUENTIAL_SUBAGENT_IMPLEMENTATION.md](./SEQUENTIAL_SUBAGENT_IMPLEMENTATION.md) (2-3 hours)

---

## 🏗️ Architecture Overview

```
Strong Agent (Single Session)
├─ 1. Diagnose Issue
│  ├─ Search codebase for problem
│  ├─ Identify affected files/lines
│  └─ Document root cause
│
├─ 2. Prove Issue
│  ├─ Run failing tests
│  ├─ Show exact failure
│  └─ Verify reproducible
│
├─ 3. Create Task Instructions
│  ├─ Task A: Exact code changes
│  ├─ Task B: Unit test specs
│  └─ Task C: Documentation updates
│
└─ 4. Delegate (via runSubagent)
   ├─ runSubagent("Code Agent", taskA)
   ├─ runSubagent("Test Agent", taskB)
   └─ runSubagent("Docs Agent", taskC)

Weak Agents (Sequential Execution)
├─ Code Agent Session
│  ├─ Implement code changes
│  ├─ Verify: npm run build
│  ├─ Verify: changes in public/script.js
│  └─ Report: Done
│
├─ Test Agent Session
│  ├─ Write unit tests
│  ├─ Verify: npm test passes
│  ├─ Verify: coverage > threshold
│  └─ Report: Done
│
└─ Docs Agent Session
   ├─ Update documentation
   ├─ Verify: links work
   ├─ Verify: examples match code
   └─ Report: Done

Aggregator
└─ Collect all results → Final report → Issue resolved
```

---

## 🔄 Workflow Patterns

### Current: Sequential Sub-Agents
- **Execution:** Tasks A → B → C (one after another)
- **Automation:** Fully automated (runSubagent)
- **Speed:** ~10-15 minutes per issue
- **Manual coordination:** Zero
- **Status:** ✅ Ready now
- **Perfect for:** Example repositories

### Future: Parallel Spawner Tool
- **Execution:** Tasks A, B, C (all simultaneous)
- **Automation:** Fully automated (custom tool)
- **Speed:** ~3-5 minutes per issue (3× faster)
- **Manual coordination:** Zero
- **Status:** 🔮 Roadmap (implement after 10+ workflows)
- **Perfect for:** Production systems where speed matters

---

## 🎯 Use Cases

### When to Use This Workflow ✅
- Complex issues (multiple files affected)
- Unclear root causes
- High confidence needed before implementation
- Need reproducible, auditable trail
- Example/reference repository

### When Optional
- Simple 1-2 line bug fixes
- Clear-cut feature additions
- Routine refactoring

### When Essential 🚨
- Data corruption issues
- Complex merge/processing bugs
- Architecture changes
- Visualization problems
- Cross-module dependencies

---

## 🚀 Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Workflow definition | ✅ Complete | Full documentation ready |
| Sequential sub-agents | ✅ Ready | Code examples provided |
| Parallel spawner | 🔮 Future | Roadmap outlined |
| Type definitions | ✅ Included | Full TypeScript support |
| Example walkthrough | ✅ Included | Real-world scenario |
| Integration guide | ✅ Included | How to use in project |

---

## 📋 Key Principles

**Strong Agents:**
- Prove everything (tests first, claims second)
- Be explicit (exact line numbers, exact code)
- Think first (analyze before delegating)
- Create proof (before instructions)

**Weak Agents:**
- Follow exactly (no improvisation)
- Verify each step (test after changes)
- Report honestly (say if something fails)
- Never skip verification (always test)

**Both:**
- Always verify output (read compiled code)
- Test thoroughly (unit + integration + visual)
- Communicate clearly (clear instructions, clear results)
- Never skip proof (proof > assumption)

---

## 🔗 File Map

```
docs/
├── CONTEXT_ENGINEERING.md              ← Integration point
├── STRONG_WEAK_AGENT_WORKFLOW.md       ← Main reference (START HERE)
├── SEQUENTIAL_SUBAGENT_IMPLEMENTATION.md ← Code examples (IMPLEMENT THIS)
├── QUICK_REFERENCE_STRONG_WEAK_WORKFLOW.md ← Cheat sheet
└── archive/
    └── [Historical context docs]
```

---

## 💡 Key Insights

1. **Automation > Manual Coordination**
   - Sequential sub-agents fully automated
   - No human coordination needed
   - Reproducible every time

2. **Proof > Assumption**
   - Always prove issue before fixing
   - Use tests as evidence
   - Document exactly what's broken

3. **Explicit > Vague**
   - Task instructions must be specific
   - Include line numbers, exact code
   - Show before/after code

4. **Verify > Trust**
   - Don't trust build success
   - Read compiled output (`public/script.js`)
   - Run all tests before claiming done

5. **Sequential > Manual Parallel**
   - Current approach: fully automated
   - Future approach: can parallelize
   - Both have zero manual steps

---

## 🎓 Learning Path

### Beginner (Just curious)
- Read: QUICK_REFERENCE_STRONG_WEAK_WORKFLOW.md (5 min)
- Skim: STRONG_WEAK_AGENT_WORKFLOW.md phases 1-2

### Intermediate (Want to use it)
- Read: STRONG_WEAK_AGENT_WORKFLOW.md completely (30 min)
- Skim: SEQUENTIAL_SUBAGENT_IMPLEMENTATION.md (10 min)
- Run: One example workflow

### Advanced (Want to implement)
- Read: SEQUENTIAL_SUBAGENT_IMPLEMENTATION.md carefully (30 min)
- Study: TypeScript code examples
- Implement: In your project (2-3 hours)
- Test: With real issue

---

## ❓ FAQ

**Q: Do I have to do all 3 tasks (code, tests, docs)?**
A: No, create only the tasks you need. Omit task C if docs don't need updating.

**Q: Can I parallelize without building a tool?**
A: Yes, use human coordinator approach. Strong Agent creates 3 tasks, you paste each to separate agent session.

**Q: How long does a workflow take?**
A: Sequential: 10-15 minutes. Parallel (future): 3-5 minutes. Plus initial diagnosis: 5-10 minutes.

**Q: What if a Weak Agent fails?**
A: Re-run that agent with updated instructions, or have Strong Agent diagnose the issue.

**Q: Is this only for code?**
A: No, works for data processing, documentation, testing, or any multi-step task.

---

## 🎯 Next Steps

1. **Understand the pattern** → Read STRONG_WEAK_AGENT_WORKFLOW.md
2. **See the code** → Study SEQUENTIAL_SUBAGENT_IMPLEMENTATION.md  
3. **Try a workflow** → Use QUICK_REFERENCE_STRONG_WEAK_WORKFLOW.md
4. **Implement** → Integrate Sequential Sub-Agents into your project
5. **Iterate** → Run 10+ workflows to find optimization opportunities
6. **Optimize** → Consider parallel spawner tool if speed becomes bottleneck

---

## 📞 Support

**Issues with the workflow?**
- See QUICK_REFERENCE_STRONG_WEAK_WORKFLOW.md troubleshooting section
- Review examples in STRONG_WEAK_AGENT_WORKFLOW.md
- Check code examples in SEQUENTIAL_SUBAGENT_IMPLEMENTATION.md

**Want to improve it?**
- Suggestions for parallel spawner tool
- Better task separation strategies
- Additional weak agent roles
- Integration with other tools

---

**Last Updated:** January 2026  
**Status:** Production Ready (Sequential)  
**Version:** 1.0 (Future: 2.0 with parallel spawner)
