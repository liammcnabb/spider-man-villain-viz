# Handover: Refactor & Redesign Initiative

**Status**: Checkpoint 1 complete. Checkpoint 2 (Workflow Separation) ready to start.  
**Date**: January 10, 2026  
**Previous Agent**: GitHub Copilot  
**Current Phase**: Checkpoint 2 - CLI separation (scrape ↔ process)  
**Scope**: CLI separation (scrape ↔ process), identity policy (✅ DONE), serialization types (✅ DONE), workflow cleanup.

## Checkpoint Progress

### ✅ CHECKPOINT 1: Identity & Data Modeling - COMPLETE
- ✓ `identitySource: 'url' | 'name'` field added to ProcessedVillain type
- ✓ `SerializedProcessedData` interface defined for JSON output  
- ✓ dataProcessor updated to set identitySource during processing
- ✓ 4 new unit tests added (Identity Source Tracking describe block)
- ✓ All 121 tests passing, no regressions
- ✓ End-to-end test verified (Untold Tales Vol 1: 25 issues → 44 villains)
- ✓ ARCHITECTURE.md updated with identity policy and new data models
- ✓ Output file verified: data/villains.Untold_Tales_Test.json (29.9 KB)
- ✓ All changes compiled and verified in public/script.js
- Completed: January 10, 2026

### ⏳ CHECKPOINT 2: Workflow Separation - READY TO START
- All prerequisites complete from Checkpoint 1
- Type definitions in place with identity tracking
- Ready for CLI refactoring into service pattern

## What Was Accomplished (In Planning Phase)

1. **Created functional documentation** ([docs/FUNCTIONAL_DOCUMENTATION.md](FUNCTIONAL_DOCUMENTATION.md))
   - System overview with module responsibilities.
   - Mermaid flowchart (scrape → process → merge → visualize).
   - Data contract diagram (RawVillainData → ProcessedData → D3Config).

2. **Created refactor checklist** ([docs/REFACTOR_CHECKLIST.md](REFACTOR_CHECKLIST.md))
   - 10+ actionable refactor items grouped by concern.
   - Suggested implementation order (7 phases).
   - CLI redesign spec: `scrape`, `process`, `merge`, `publish`, `serve` commands.

3. **Key decisions finalized**
   - **Identity policy**: No reconciliation. Name-only and later-URL entities remain separate historically.
   - **Workflow**: Scraper and processor must be entirely separate; raw data output before processing.
   - **CLI commands**: Five distinct commands with clear responsibilities and arguments.

4. **Updated documentation index** ([DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md#L47-L52))
   - Added links to FUNCTIONAL_DOCUMENTATION.md and REFACTOR_CHECKLIST.md.

## Current Code State

- **Existing entry point**: [src/index.ts](../src/index.ts) mixes CLI, scraping, processing, and publishing.
- **Main modules**:
  - [src/scraper/marvelScraper.ts](../src/scraper/marvelScraper.ts) — HTTP scraping.
  - [src/utils/dataProcessor.ts](../src/utils/dataProcessor.ts) — Normalization, deduplication, stats, timeline.
  - [src/utils/mergeDatasets.ts](../src/utils/mergeDatasets.ts) — Series combination.
  - [src/visualization/D3ConfigBuilder.ts](../src/visualization/D3ConfigBuilder.ts) — Unified D3 config builder (primary). Legacy: [d3Graph.ts](../src/visualization/d3Graph.ts).
  - [src/utils/cliParser.ts](../src/utils/cliParser.ts) — Argument parsing.
  - [src/types.ts](../src/types.ts) — Shared types.
- **Tests**: [src/__tests__/](../src/__tests__/) (Jest).
- **Build**: `npm run build` → `dist/` and [public/script.js](../public/script.js).
- **Data**: [data/](../data/) (series and combined), [public/data/](../public/data/) (served).

## Critical Dependencies & Gotchas

1. **Compiled verification required** (from project instructions):
   - Always run `npm run build` and verify changes propagate to [public/script.js](../public/script.js).
   - Search for your specific function/logic change in compiled output to confirm success.

2. **Data flow ordering**:
   - Raw scrape output → series `villains.{Series}.json` → combined `villains.json`.
   - Failing to merge correctly can corrupt combined files; always validate intermediate outputs.

3. **Identity invariant**:
   - Once an entity is stored as name-only, adding a URL later **must not** reconcile them retroactively.
   - Add `identitySource: 'url' | 'name'` field to `ProcessedVillain` to track this permanently.

4. **Image caching** (from project instructions):
   - Key filenames by character page URL slug (e.g., `the-rose-kingpin`), not display names, to avoid collisions.

5. **Series-specific vs merged defaults**:
   - Source files for scrape progress: `data/villains.{Series}.json` (not merged `data/villains.json`).
   - Do not use merged files to assess what's been scraped; they are derivatives.

## Suggested Implementation Phases

See [docs/REFACTOR_CHECKLIST.md](REFACTOR_CHECKLIST.md#suggested-implementation-order) for full order. **Quick summary**:

1. **Types & identity** — Add `SerializedProcessedData` type and `identitySource` field.
2. **CLI separation** — Extract `ScrapeRunner`, `ProcessRunner`, `Publisher`; redesign [src/index.ts](../src/index.ts).
3. **Schema validation** — Add zod or similar for boundary validation; typed errors.
4. **D3 consolidation** — Merge `d3Graph.ts` and `generateD3FromCombined.ts` into single builder.
5. **Tests** — Normalization, identity invariants, group classification, D3 domains.
6. **Serving** — Add Node static server alternative to Python; `publish` task.
7. **Documentation** — Update README, QUICKSTART, and functional doc with new commands.

## Files to Create/Modify

### New Files
- `src/services/scrapeRunner.ts` — Pure scraping orchestration, outputs raw JSON.
- `src/services/processRunner.ts` — Processing orchestration, reads raw JSON, outputs processed + D3 config.
- `src/services/publisher.ts` — Publishing utility, copies to `public/data`.
- `src/services/d3ConfigBuilder.ts` — Unified D3 config generation.
- `src/errors.ts` — Typed error classes (`ScrapeError`, `ValidationError`, `IOError`).
- `src/utils/schema.ts` — zod schemas for validation.
- `src/__tests__/dataProcessor.test.ts` — Normalization, identity, groups tests (if not already present).

### Modify
- `src/types.ts` — Add `identitySource` to `ProcessedVillain`; define `SerializedProcessedData`.
- `src/index.ts` — Refactor to dispatch to services; add new commands.
- `src/utils/dataProcessor.ts` — Document identity policy; add `identitySource` field during processing.
- `src/utils/cliParser.ts` — Extend to handle new commands and arguments.
- `src/visualization/d3Graph.ts` and `src/utils/generateD3FromCombined.ts` — Consolidate into d3ConfigBuilder.

### Update Docs
- [README.md](../README.md) — New command summary.
- [QUICKSTART.md](../QUICKSTART.md) — New workflow examples.
- [docs/FUNCTIONAL_DOCUMENTATION.md](FUNCTIONAL_DOCUMENTATION.md) — Reflect new commands.

## Verification Checklist

**After each phase**, verify:
- [ ] `npm run build` completes without errors.
- [ ] Open [public/script.js](../public/script.js) and search for your changes (e.g., function name, log line).
- [ ] `npm test` passes (or update tests as needed).
- [ ] No `npm run type-check` errors.

**After CLI separation**:
- [ ] `npm run scrape -- --series "Amazing Spider-Man Vol 1" --issues 1-10` produces `data/raw.Amazing_Spider-Man_Vol_1.json`.
- [ ] `npm run process -- --series "Amazing Spider-Man Vol 1"` reads raw JSON and produces `villains.Amazing_Spider-Man_Vol_1.json` + `d3-config.Amazing_Spider-Man_Vol_1.json`.
- [ ] `npm run merge` combines all series outputs into `villains.json` + `d3-config.json`.
- [ ] `npm run publish` copies outputs to `public/data`.

## Testing Strategy

- **Unit tests** for normalization, identity invariants, group classification (mock scraped data).
- **Integration tests** for merge logic (use existing test data in [data/](../data/)).
- **Manual verification** of D3 config domains/ranges with known issue counts.

## Known Constraints

1. Rate limit for scrapers: ~1 req/sec (enforced in `marvelScraper.ts`).
2. Python HTTP server for serving (fallback: Node alternative in phase 6).
3. Series list is hardcoded: "Amazing Spider-Man Vol 1", "Amazing Spider-Man Annual Vol 1", "Untold Tales of Spider-Man Vol 1".
4. Current implementation processes immediately after scraping; new design defers processing.

## Quick Start for Next Agent

1. Read [docs/REFACTOR_CHECKLIST.md](REFACTOR_CHECKLIST.md) for full scope.
2. Read [docs/FUNCTIONAL_DOCUMENTATION.md](FUNCTIONAL_DOCUMENTATION.md) for system context.
3. Pick Phase 1: types, `SerializedProcessedData`, `identitySource` field.
4. Create `src/errors.ts` and `src/utils/schema.ts`.
5. Update `src/types.ts`.
6. Run `npm run build` and verify `public/script.js` contains your changes.
7. Commit and move to Phase 2.

## Questions for Clarification

If unclear:
1. Check [docs/REFACTOR_CHECKLIST.md](REFACTOR_CHECKLIST.md) for scope and reasoning.
2. Check [docs/FUNCTIONAL_DOCUMENTATION.md](FUNCTIONAL_DOCUMENTATION.md) for module responsibility and data flow.
3. Re-read the identity policy constraint (no reconciliation).
4. Refer to existing CLI in [src/utils/cliParser.ts](../src/utils/cliParser.ts) for argument style.

---

**Next Steps**: Start Phase 1 (types) in [src/types.ts](../src/types.ts). Expected time: ~30 min. Then build and verify.
