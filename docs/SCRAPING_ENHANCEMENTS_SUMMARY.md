# Scraping Enhancement Specifications - Summary

**Created**: 2026-01-12  
**Status**: Ready for Implementation

---

## Overview

Two related scraping enhancements to capture richer data from Marvel Fandom and enable advanced timeline visualization features.

---

## 1. Appearance Metadata Tracking

### What It Does

Extracts and stores metadata about character appearances from parenthetical notes in character listings.

### Examples

- `Lucky Lobo (First appearance)`
- `Burglar (Final appearance; dies) (Appears in flashback)`
- `Green Goblin (Mentioned only)`

### Priority Metadata (Phase 1)

- ✅ First appearance / Debut
- ✅ Death / Killed
- ✅ Final appearance
- ✅ Mentioned only
- ✅ Behind the scenes
- ✅ Flashback
- ✅ Cameo
- ✅ Voice only

### Key Features

- **Smart Parsing**: Pattern-based extraction with regex
- **Uncaptured Logging**: Unknown metadata logged for future review
- **Appearance-Level**: Metadata stored per issue, per character
- **Timeline Aggregation**: Quick access to notable events per issue

### Data Impact

```typescript
// Before
{ name: "Burglar", url: "..." }

// After
{
  name: "Burglar",
  url: "...",
  metadata: {
    finalAppearance: true,
    death: true,
    flashback: true
  }
}
```

### Implementation Time

**10-16 hours** (types, scraping, processing, tests, docs)

### Full Specification

📄 [APPEARANCE_METADATA_SPEC.md](./APPEARANCE_METADATA_SPEC.md)

---

## 2. Story Arc & Saga Tracking

### What It Does

Extracts story arc information from Marvel Fandom page categories and tracks arcs across issues and series.

### Examples

- **Amazing Spider-Man Vol 1 #19**: "End of Spider-Man" arc
- **Web of Spider-Man Vol 1 #117**: "Power and Responsibility" AND "Clone Saga"

### Arc Types

- **Story Arc**: 2-6 issues within a series
- **Crossover**: 5-20 issues across 2 series
- **Event**: 10-100+ issues, universe-wide
- **Saga**: 20-100+ issues, extended narrative
- **Double**: 2-issue story

### Key Features

- **Category Extraction**: Parses Marvel Fandom footer categories
- **Multi-Series Tracking**: Identifies arcs spanning multiple series
- **Arc Aggregation**: Builds complete arc objects with metadata
- **Type Inference**: Automatically categorizes arc types
- **Visualization Ready**: Prepares data for arc band rendering

### Data Impact

```typescript
// Issue level
{
  issueNumber: 117,
  storyArcs: ["power-and-responsibility", "clone-saga"]
}

// Processed level
{
  id: "clone-saga",
  name: "Clone Saga",
  type: "saga",
  issues: [117, 118, 394, 395, 396],
  series: ["Web of Spider-Man Vol 1", "Amazing Spider-Man Vol 1"],
  startIssue: 117,
  endIssue: 396,
  issueCount: 5
}
```

### Implementation Time

**12-18 hours** without visualization  
**16-24 hours** with visualization design

### Full Specification

📄 [STORY_ARC_SPEC.md](./STORY_ARC_SPEC.md)

---

## Implementation Strategy

### Phase 1: Core Functionality (Both Features)

1. **Type Definitions** (2-3 hours)
   - Update interfaces in `types.ts`
   - Add metadata and arc types

2. **Scraping Logic** (6-8 hours)
   - Add `extractAppearanceMetadata()` to marvelScraper
   - Add `parseStoryArcs()` to marvelScraper
   - Update `parseAntagonistsFromHtml()`
   - Update `scrapeIssue()`

3. **Processing Logic** (5-7 hours)
   - Update `processVillainData()` for metadata
   - Add `buildStoryArcs()` function
   - Add `mergeStoryArcs()` for multi-series

4. **Testing** (4-6 hours)
   - Unit tests for parsing functions
   - Integration tests for full pipeline
   - Test fixtures with known examples

5. **Documentation** (2 hours)
   - Update README examples
   - Add usage guides

### Phase 2: Visualization (Separate)

- Arc bands on timeline
- Metadata indicators (icons)
- Filtering by metadata/arcs
- Arc navigation features

**Phase 2 Estimate**: 6-10 hours

---

## Combined Benefits

### Data Richness

- **Before**: Character name, URL, issue number
- **After**: + appearance context + story arc context

### Visualization Potential

- Highlight first appearances with stars ⭐
- Mark deaths with special styling 💀
- Show arc spans with colored bands
- Filter by arc or metadata type
- Navigate between arc issues

### Analysis Capabilities

- "How many villains debut per arc?"
- "Which arcs have the most deaths?"
- "Map flashback appearances to chronology"
- "Identify crossover patterns"

---

## Testing Strategy

### Unit Tests

- Metadata parsing accuracy
- Arc category filtering
- Arc aggregation logic
- Type inference

### Integration Tests

- Full scrape → process → visualize pipeline
- Multi-series arc merging
- Known examples (Clone Saga, etc.)

### Test Coverage Goal

**>90% for new code**

---

## Performance Impact

### Scraping

- **Appearance Metadata**: ~10-30ms per issue (minimal)
- **Story Arcs**: ~50-100ms per issue (category parsing)
- **Total Overhead**: < 5% increase

### Storage

- **Appearance Metadata**: +50-150 bytes per character/issue
- **Story Arcs**: +50-200 bytes per issue + 1-5 KB per series
- **Total Impact**: < 1% increase

### Processing

- Negligible impact (additional map operations)

---

## Data Migration

**Not Required** ✅

Both features add optional new fields. Existing data remains valid and functional.

---

## Risk Assessment

### Low Risk

- ✅ No breaking changes to existing data structures
- ✅ Optional fields (graceful degradation)
- ✅ No additional HTTP requests (scrape existing pages)
- ✅ Backward compatible

### Potential Challenges

- **Category Ambiguity**: Some categories may be unclear
  - _Mitigation_: Exclude patterns + manual review log
- **Arc Name Variations**: Different naming conventions
  - _Mitigation_: ID-based normalization
- **Incomplete Arcs**: Missing issues from unscrapped content
  - _Mitigation_: Track partial arcs, update incrementally

---

## Next Steps

### Before Implementation

1. ✅ Review specifications (completed)
2. Create GitHub issues/tasks
3. Set up test fixtures
4. Prepare example HTML samples

### During Implementation

1. Implement appearance metadata first (simpler)
2. Add story arc tracking second (builds on metadata)
3. Run tests continuously
4. Review uncaptured metadata logs
5. Validate with known examples

### After Implementation

1. Re-scrape key issues to populate new data
2. Generate visualization designs
3. Plan Phase 2 (visualization)
4. Update user documentation

---

## Questions & Decisions

### To Decide

- [ ] Should we re-scrape all existing issues immediately?
  - **Recommendation**: No, scrape on-demand or in batches
- [ ] Which metadata types should trigger visual indicators?
  - **Recommendation**: Start with first appearance, death, mentioned
- [ ] How should arc bands be rendered (visual design)?
  - **Recommendation**: Defer to Phase 2 visualization design
- [ ] Should we support custom arc definitions?
  - **Recommendation**: Not in Phase 1, consider for Phase 3

---

## Success Metrics

1. ✅ All specified metadata types are extracted correctly
2. ✅ Story arcs are identified and aggregated accurately
3. ✅ Multi-series arcs are merged properly
4. ✅ No regression in existing functionality
5. ✅ Test coverage >90%
6. ✅ Performance overhead <5%
7. ✅ Documentation complete with examples

---

## Timeline

### Fast Track (Focused Implementation)

- **Week 1**: Appearance metadata + tests
- **Week 2**: Story arc tracking + tests
- **Week 3**: Documentation + refinement
- **Week 4**: Visualization design (Phase 2)

**Total**: 3-4 weeks part-time

### Standard Track (With Review Cycles)

- **Week 1-2**: Both features implemented
- **Week 3**: Comprehensive testing
- **Week 4**: Data population + review
- **Week 5-6**: Visualization (Phase 2)

**Total**: 5-6 weeks part-time

---

## Related Documentation

- 📄 [Appearance Metadata Specification](./APPEARANCE_METADATA_SPEC.md) - Full technical details
- 📄 [Story Arc Specification](./STORY_ARC_SPEC.md) - Full technical details
- 📄 [Types Documentation](./FUNCTIONAL_DOCUMENTATION.md#type-definitions) - Current types
- 📄 [Scraper Documentation](./FUNCTIONAL_DOCUMENTATION.md#marvel-scraper) - Current scraper
- 📄 [Agent Workflow Rules](../AGENT_WORKFLOW_RULES.md) - Implementation guidelines

---

**Ready to implement?** Start with [APPEARANCE_METADATA_SPEC.md](./APPEARANCE_METADATA_SPEC.md) for detailed step-by-step implementation guide.
