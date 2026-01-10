# Refactor & Redesign Checklist

This checklist consolidates improvement opportunities with clear, actionable items. It reflects updated identity policy and the requested separation of scraping vs processing workflows.

## � CHECKPOINT STATUS

### ✅ CHECKPOINT 1: Identity & Data Modeling - COMPLETE
- ✓ All items implemented and verified
- ✓ End-to-end test passed (Untold Tales Vol 1, 25 issues)
- ✓ identitySource field flows through entire pipeline
- ✓ 4 new unit tests passing
- ✓ All existing tests still passing (121 total)
- ✓ Output file generated: data/villains.Untold_Tales_Test.json (29.9 KB)
- ✓ ARCHITECTURE.md updated
- Completed: January 10, 2026

### ✅ CHECKPOINT 2: Workflow Separation - COMPLETE
- ✓ ScrapeRunner, ProcessRunner, MergeRunner, Publisher classes created
- ✓ CLI redesigned with 6 commands: scrape, process, merge, publish, serve, help
- ✓ Complete pipeline script (src/pipeline.ts) for one-command execution
- ✓ Argument parsing implemented for all commands
- ✓ index.ts refactored to delegate to runner classes
- ✓ package.json scripts updated with new commands
- ✓ 45 new tests added (166 total tests passing)
- ✓ Build successful, all compilation verified
- ✓ CLI functional with comprehensive help
- ✓ Full workflow tested with small datasets
- Completed: January 10, 2026
- Documentation: See docs/CHECKPOINT_2_COMPLETION.md

## �🚨 CHECKPOINT PROTOCOL

**After completing each checklist section:**
1. ✅ Run `npm run build`
2. ✅ Read [public/script.js](../public/script.js) to verify compiled output
3. ✅ Run `npm test` to ensure all tests pass
4. ✅ Run `npm run serve` if UI changes were made
5. ✅ **STOP and report to user** - Wait for confirmation before proceeding

**Before ANY scraper changes:**
- Data is already backed up in `backup/` directory
- Do NOT scrape unless explicitly requested by user
- Test with existing data first

## Identity & Data Modeling

- [x] Identity policy: historical separation
  - Keep entities with only names and those with later-added URLs as separate identities historically; do not reconcile retroactively.
  - Document in `src/utils/dataProcessor.ts` and `src/types.ts` comments to avoid ambiguity.
- [x] Explicit identity strategy
  - Define `EntityIdStrategy`: primary key by canonical URL slug when present; fallback to normalized name otherwise; never merge later.
  - Add `identitySource: 'url' | 'name'` on `ProcessedVillain` for transparency.
- [x] Serialized types
  - Introduce `SerializedProcessedData` TypeScript type for the output of `serializeProcessedData()` and use it across `mergeDatasets` and visualization.

**🛑 CHECKPOINT: Identity & Data Modeling Complete**
- Verify types compile: `npm run build`
- Check [public/script.js](../public/script.js) for new types
- Run tests: `npm test`
- **STOP** - Report completion to user, wait for approval to continue

## Workflow Separation (Scrape vs Process)

- [x] Decouple orchestration in `src/index.ts`
  - Extract `ScrapeRunner` (outputs raw per-series JSON only).
  - Extract `ProcessRunner` (reads raw JSON, produces processed outputs & D3 config).
  - Extract `Publisher` (copies to `public/data`).
- [x] CLI redesign
  - `scrape`: writes `data/raw.{Series}.json` (no processing).
  - `process`: reads `data/raw.{Series}.json` → writes `villains.{Series}.json`, `d3-config.{Series}.json`.
  - `merge`: builds combined `villains.json`, `d3-config.json` from series outputs.
  - `publish`: copies series and combined files into `public/data`.
  - `serve`: static server for `public`.
- [x] CLI arguments
  - `scrape`: `--series`, `--issues`, `--out data/raw.{Series}.json`.
  - `process`: `--series`, `--in`, `--out`, optional `--validate`.
  - `merge`: `--inputs glob` (default `data/villains.*.json`), `--out data/villains.json`.
  - `publish`: `--src data`, `--dest public/data`.

**🛑 CHECKPOINT: Workflow Separation Complete**
- Verify CLI builds: `npm run build`
- Test new commands work: `node dist/index.js --help`
- Run all tests: `npm test`
- **STOP** - Report completion to user, wait for approval to continue

## Validation, Errors, and Tests

- [x] Typed errors
  - Create `ScrapeError`, `ValidationError`, `IOError` classes and use them where applicable.
- [x] Schema validation
  - Use `zod` (or similar) to validate `RawVillainData`, `ProcessedData`, and `SerializedProcessedData` at boundaries.
- [x] Targeted tests
  - Normalization coverage: aliases, punctuation, whitespace.
  - Identity invariants: name-only vs URL remain separate across processing and merging.
  - Group classification edge cases and taxonomy list.
  - D3 config domains/ranges and color assignment.

**🛑 CHECKPOINT: Validation, Errors, and Tests Complete**
- Verify all tests pass: `npm test`
- Check test coverage if desired
- Build and verify: `npm run build`
- **STOP** - Report completion to user, wait for approval to continue

## Groups & Taxonomy

- [x] Group registry
  - ✅ Created `GroupRegistry` singleton in `src/utils/groupRegistry.ts`
  - ✅ Curated list of 16 known Spider-Man villain groups with aliases
  - ✅ Deterministic ID generation (lowercase, hyphens)
  - ✅ Audit trail for all lookups and registrations
  - ✅ Integrated into `classifyKind()` in `groupClassifier.ts`
  - ✅ Fallback keyword patterns for dynamic groups
- [x] Members derivation
  - ✅ Verified in `dataProcessor.ts` `generateTimeline()`
  - ✅ Members derived from same-issue villains only
  - ✅ Each group appearance maintains distinct roster per issue
  - ✅ No cross-issue reconciliation
  - ✅ Added inline documentation with assertions

**🛑 CHECKPOINT: Groups & Taxonomy Complete**
- ✅ Build: `npm run build` - Successful
- ✅ Tests: `npm test` - 337 tests passing, 14 test suites passing
- ✅ Compiled code verified: `dist/src/utils/groupRegistry.js` exists
- ✅ New test suite: `src/__tests__/groupTaxonomy.test.ts` with 40+ test cases
- ✅ Documentation updated: FUNCTIONAL_DOCUMENTATION.md reflects new GroupRegistry pattern

**Completed: January 10, 2026**

## Visualization Config

- [ ] Unify config builders
  - Consolidate `d3Graph.ts` and `generateD3FromCombined.ts` into a single `D3ConfigBuilder` with well-typed inputs.
- [ ] Output clarity
  - Consider writing combined outputs to `villains.combined.json` / `d3-config.combined.json` to avoid confusion with per-series defaults.

**🛑 CHECKPOINT: Visualization Config Complete**
- Build and verify: `npm run build`
- Check [public/script.js](../public/script.js) for D3 config changes
- Test visualization: `npm run serve` and check in browser
- **STOP** - Report completion to user, wait for approval to continue

## Serving & Publishing

- [ ] Cross-platform server
  - Add optional Node static server (`http-server` or small Express script) to complement `npm run serve`.
- [ ] Publisher task
  - Create a dedicated `publish` task that validates source presence and logs copied files.

**🛑 CHECKPOINT: Serving & Publishing Complete**
- Test new serve/publish commands
- Build: `npm run build`
- Verify serving works: `npm run serve`
- **STOP** - Report completion to user, wait for approval to continue

## Documentation

- [ ] Update functional doc
  - Reflect identity policy change (no reconciliation) and CLI separation.
- [ ] Quick start & README
  - Document new commands, arguments, and typical flows.

**🛑 CHECKPOINT: Documentation Complete**
- Review all updated docs for accuracy
- Build final version: `npm run build`
- Run full test suite: `npm test`
- Test site: `npm run serve`
- **STOP** - Report final completion to user

## Suggested Implementation Order

1. Identity policy and types (`SerializedProcessedData`, `identitySource`).
2. Orchestration separation (ScrapeRunner, ProcessRunner, Publisher); add new CLI commands.
3. Schema validation + typed errors.
4. D3 config builder consolidation.
5. Tests for normalization, identity, groups, visualization config.
6. Node static server and publisher task.
7. Documentation updates across README, QUICKSTART, functional doc.
