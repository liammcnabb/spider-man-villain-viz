# Elastic X-Axis Filter Investigation

**Status**: Investigation Phase  
**Created**: January 11, 2026  
**Goal**: Design and implement an elastic X-axis filter that compresses the grid timeline by removing gaps between appearances while preserving gap information through connecting "web" lines.

---

## 🎯 Core Concept

The elastic filter transforms the standard linear issue timeline into a compressed view where:
1. **Empty gaps are removed** between villain appearances
2. **Connecting "web" lines** appear ONLY when there's a gap in a villain's timeline
3. **Web connectors try to be 1 block wide** (minimum width) regardless of gap size
4. **Multiple villains align** at shared issue appearances

---

## 📊 Example: Sandman Timeline (Real Data)

### Raw Data from villains.json
```json
{
  "name": "Sandman",
  "firstAppearance": 4,
  "appearances": [4, 1, 18, 19, 6, 154, 181, 214, 215, 217, 23, 334, 337, 338, 339, 375, 3],
  "frequency": 17
}
```

Note: These are chronological positions, not issue numbers. The grid maps these to actual issues.

### Standard Grid View (Linear X-axis)
```
Chrono: |4|-----|1 |------------|18|19|---|6 |---...(huge gap of ~148)...---|154|---|181|
Empty cells waste horizontal space, making the pattern hard to see.
```

### Elastic Filter View
```
Chrono: |4|-|1|-|18|19|-|6|-|154|-|181|-|214|215|-|217|-|23|-|334|-|337|338|339|-|375|-|3|
         ═════════════════════════════════════════════════════════════════════════════════
Legend:
  |N| = Issue column at chronological position N
  |-| = Gap connector column (1 unit wide, indicates a gap exists between appearances)
  
The gap connector |-| appears between ANY gap in the villain's timeline, regardless of gap size.
Gap of 3 or gap of 100? Both get the same 1-unit gap connector column.
```

### Key Observations
1. **Gap columns only appear between villain's consecutive appearances** - when there's a jump in their timeline
2. **Gap columns are always 1 unit wide** - simple, consistent visual  
3. **Gap column indicates "jump forward in time"** - tells the reader "issues were skipped here"
4. **Actual gap size can be shown in tooltip** - hover over gap to see "Gap: 148 issues"
5. **Grid structure**: Issue columns and gap columns alternate based on each villain's timeline

---

## 📐 Multi-Villain Alignment Example

### Data
- **Doctor Octopus**: Issues 3, 11, 12, Annual 1
- **Sandman**: Issues 4, Annual 1, 18, 19, Annual 6

### Chronological Order
```
Issue #3 (Doc Ock only)
Issue #4 (Sandman only)
Issue #11 (Doc Ock only)
Issue #12 (Doc Ock only)
Annual 1 (Both appear!)
Issue #18 (Sandman only)
Issue #19 (Sandman only)
Annual 6 (Sandman only)
```

### Elastic Grid Visualization
```
          |3 |4 |-|11|12|-|Annual 1|-|18|19|-|Annual 6|
          ================================================
Doc Ock:  |██|═|═|██|██|═|██|  |  |  |  |  |
Sandman:  |  |██|═|═|═|═|██|═|██|██|═|██|
          ================================================
Legend:
  ██ = Villain appears in this issue
  ═  = Web connector (spans from appearance to next appearance)
     = Empty (villain has no more appearances after this point)

Key Insight:
Web connectors fill EVERY column between consecutive appearances, including both 
issue columns and gap columns. This creates an unbroken line from one appearance 
to the next, visually showing the connection across compressed space.
```

### Key Observations
1. **Annual 1 aligns** for both villains (they both appear)
2. **Gap columns appear per-villain** - Doc Ock has gaps after #4 and #12, Sandman has gaps after #4 and #19
3. **Visual compression** - only shows issues where at least one villain appears
4. **Relative positioning** is preserved (Doc Ock #3 is before Sandman #4)
5. **Gap columns are inserted** in the X-axis structure when ANY villain needs them

---

## 🔧 Technical Implementation Strategy

### Phase 1: Data Structure Analysis

#### Current Grid Implementation
Located in [public/script.js](public/script.js#L725-L950)

**Key Components:**
1. `renderUnifiedGrid()` - Main grid rendering function
2. Uses chronological position for sorting
3. Grid cells are `cellSize × cellSize` (20px default)
4. X-axis: one column per issue (linear scale)
5. Y-axis: one row per villain

**Current X-axis Logic:**
```javascript
// Current: Linear mapping
issues.forEach((issue, xIdx) => {
    // xIdx is simply index in array (0, 1, 2, 3...)
    cell.x = xIdx * cellSize;
});
```

### Phase 2: Elastic Scale Algorithm

#### Core Principle: Gap Columns Are Shared

**Key Insight**: Gap connector columns appear in the X-axis when **any villain** has a gap between consecutive appearances at that position.

#### Gap Detection Rule
**A gap exists between two consecutive appearances when**: `nextChrono - currentChrono > 1`

Example:
- 3 → 4: `4 - 3 = 1`, NO gap (consecutive)
- 4 → 11: `11 - 4 = 7`, YES gap (7 issues skipped)
- 11 → 12: `12 - 11 = 1`, NO gap (consecutive)

```javascript
/**
 * CORRECTED ALGORITHM
 * - Gap columns appear when any villain has a gap between their consecutive appearances
 * - Gap columns are always 1 unit wide (minimum size)
 * - The X-axis interleaves issue columns and gap columns
 */

function buildElasticGridData(villains, allIssues) {
    // Step 1: Collect all unique chronological positions where villains appear
    const allChronos = new Set();
    villains.forEach(v => {
        v.appearances.forEach(chrono => allChronos.add(chrono));
    });
    
    const sortedChronos = Array.from(allChronos).sort((a, b) => a - b);
    
    // Step 2: Build elastic X-axis with interleaved gap columns
    const elasticColumns = [];
    const chronoToElasticPos = new Map();
    
    for (let i = 0; i < sortedChronos.length; i++) {
        const chrono = sortedChronos[i];
        const elasticPos = elasticColumns.length;
        
        // Add issue column
        elasticColumns.push({ type: 'issue', chrono });
        chronoToElasticPos.set(chrono, elasticPos);
        
        // Check if we need a gap column after this issue
        if (i < sortedChronos.length - 1) {
            // Check if ANY villain has both current and next as consecutive appearances
            const needsGap = villains.some(villain => {
                const sorted = villain.appearances.sort((a, b) => a - b);
                for (let j = 0; j < sorted.length - 1; j++) {
                    if (sorted[j] === chrono && sorted[j + 1] === sortedChronos[i + 1]) {
                        // This villain has these two as consecutive - check if there's a gap
                        return sorted[j + 1] - sorted[j] > 1;
                    }
                }
                return false;
            });
            
            if (needsGap) {
                elasticColumns.push({ 
                    type: 'gap',
                    fromChrono: chrono,
                    toChrono: sortedChronos[i + 1]
                });
            }
        }
    }
    
    // Step 3: For each villain, determine where webs go
    const villainWebPositions = {};
    
    villains.forEach(villain => {
        const sortedAppearances = villain.appearances.sort((a, b) => a - b);
        const websBetween = [];
        
        for (let i = 0; i < sortedAppearances.length - 1; i++) {
            const current = sortedAppearances[i];
            const next = sortedAppearances[i + 1];
            
            // Check if there's a gap (are they consecutive in sorted chronos?)
            const currentIdx = sortedChronos.indexOf(current);
            const nextIdx = sortedChronos.indexOf(next);
            
            if (nextIdx - currentIdx > 1) {
                // Gap exists! Need a web between current and next
                websBetween.push({
                    from: current,
                    to: next,
                    gapSize: next - current // For tooltip
                });
            }
        }
        
        villainWebPositions[villain.name] = websBetween;
    });
    
    return {
        elasticColumns: [         // Array of column objects
            { type: 'issue', chrono: 3 },
            { type: 'gap', fromChrono: 3, toChrono: 4 },
            { type: 'issue', chrono: 4 },
            // ... continues with all columns
        ],
        chronoToElasticPos: Map,  // { 3 → 0, 4 → 2, 11 → 4, ... }
        sortedChronos: [3, 4, 11, 12, ...]  // All chronos in order
    };
}
```

#### Integration Point: renderUnifiedGrid()

**Location**: [public/script.js](public/script.js#L725-L950)

**Current Implementation**: Linear X-axis (chronological position → pixel position)

**Elastic Mode Integration**:
```javascript
function renderUnifiedGrid(elasticMode = false) {
    if (elasticMode) {
        const elasticData = buildElasticGridData(this.filteredVillains, this.allIssues);
        renderElasticGrid(elasticData, this.filteredVillains);
    } else {
        // Existing linear grid rendering
    }
}
```

#### Rendering with Web Connectors

```javascript
function renderElasticGrid(elasticData, villains) {
    const cellSize = 20;
    
    // Render columns (both issue and gap columns)
    elasticData.elasticColumns.forEach((column, xIdx) => {
        const x = xIdx * cellSize;
        
        if (column.type === 'issue') {
            // Draw issue column label
            svg.append('text')
                .attr('x', x + cellSize / 2)
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .text(`#${column.chrono}`);
        } else {
            // Gap column - lighter background
            svg.append('rect')
                .attr('class', 'gap-column-bg')
                .attr('x', x)
                .attr('y', 0)
                .attr('width', cellSize)
                .attr('height', villains.length * cellSize)
                .attr('fill', '#f8f9fa')
                .attr('opacity', 0.3);
        }
    });
    
    // Build web position map for each villain
    // For each villain, determine which columns should show web connectors
    const villainWebRanges = {};
    
    villains.forEach(villain => {
        const sortedAppearances = villain.appearances.sort((a, b) => a - b);
        const webRanges = [];
        
        // For each pair of consecutive appearances, create a web range
        for (let i = 0; i < sortedAppearances.length - 1; i++) {
            const currentChrono = sortedAppearances[i];
            const nextChrono = sortedAppearances[i + 1];
            
            const currentIdx = elasticData.elasticColumns.findIndex(col => 
                col.type === 'issue' && col.chrono === currentChrono
            );
            const nextIdx = elasticData.elasticColumns.findIndex(col => 
                col.type === 'issue' && col.chrono === nextChrono
            );
            
            webRanges.push({
                from: currentIdx,      // Starting appearance position
                to: nextIdx,           // Ending appearance position
                gapSize: nextChrono - currentChrono  // For tooltip
            });
        }
        
        villainWebRanges[villain.name] = webRanges;
    });
    
    // Render villain rows
    villains.forEach((villain, yIdx) => {
        const y = yIdx * cellSize;
        const sortedAppearances = villain.appearances.sort((a, b) => a - b);
        const webRanges = villainWebRanges[villain.name];
        
        // For each elastic column, determine what to show
        elasticData.elasticColumns.forEach((column, xIdx) => {
            const x = xIdx * cellSize;
            
            // Check if this column is part of a web connector
            const isInWebRange = webRanges.some(web => xIdx > web.from && xIdx < web.to);
            
            if (column.type === 'issue') {
                // Check if villain appears at this issue
                if (sortedAppearances.includes(column.chrono)) {
                    // Draw filled appearance cell
                    svg.append('rect')
                        .attr('class', 'appearance-cell')
                        .attr('x', x)
                        .attr('y', y)
                        .attr('width', cellSize)
                        .attr('height', cellSize)
                        .attr('fill', getSeriesColor(column.chrono))
                        .attr('stroke', '#bdc3c7')
                        .attr('stroke-width', 0.5);
                } else if (isInWebRange) {
                    // Draw web connector in issue column
                    svg.append('line')
                        .attr('class', 'web-connector')
                        .attr('x1', x + 2)
                        .attr('y1', y + cellSize / 2)
                        .attr('x2', x + cellSize - 2)
                        .attr('y2', y + cellSize / 2)
                        .attr('stroke', '#e74c3c')
                        .attr('stroke-width', 2)
                        .attr('opacity', 0.7);
                } else {
                    // Draw empty cell (no appearance, no web)
                    svg.append('rect')
                        .attr('class', 'empty-cell')
                        .attr('x', x)
                        .attr('y', y)
                        .attr('width', cellSize)
                        .attr('height', cellSize)
                        .attr('fill', '#ecf0f1')
                        .attr('stroke', '#bdc3c7')
                        .attr('stroke-width', 0.5);
                }
            } else {
                // Gap column
                if (isInWebRange) {
                    // Draw web connector in gap column
                    svg.append('line')
                        .attr('class', 'web-connector')
                        .attr('x1', x + 2)
                        .attr('y1', y + cellSize / 2)
                        .attr('x2', x + cellSize - 2)
                        .attr('y2', y + cellSize / 2)
                        .attr('stroke', '#e74c3c')
                        .attr('stroke-width', 2)
                        .attr('opacity', 0.7)
                        .append('title')
                        .text(`Gap: ${webRanges.find(w => xIdx > w.from && xIdx < w.to).gapSize} issues`);
                } else {
                    // Empty gap cell
                    svg.append('rect')
                        .attr('class', 'empty-gap-cell')
                        .attr('x', x)
                        .attr('y', y)
                        .attr('width', cellSize)
                        .attr('height', cellSize)
                        .attr('fill', '#f8f9fa')
                        .attr('stroke', '#bdc3c7')
                        .attr('stroke-width', 0.25);
                }
            }
        });
    });
}
```

---

## 📌 Edge Cases & Special Scenarios

### Single Villain
```
Villain: [1, 5, 10]
Elastic Columns: [issue:1, gap, issue:5, gap, issue:10]
Web Connectors: 1→5 (fills gap column), 5→10 (fills gap column)
Result: Correct - webs span all intermediate columns
```

### All Villains at Same Issue
```
Villain A: [1, 5]
Villain B: [1, 5]
Villain C: [1, 5]
Elastic Columns: [issue:1, gap, issue:5]
Web Connectors: All three villains show web from 1→5
Result: Dense grid, all villains aligned
```

### Single Appearance Villain
```
Villain: [5]
Elastic Columns: [issue:5]
Web Connectors: None (no second appearance to connect to)
Result: Single cell, no webs needed
```

### Villain Drops Out Early
```
Villain A: [1, 5, 10, 50]
Villain B: [1, 5]
Elastic Columns: [issue:1, gap, issue:5, gap, issue:10, gap, issue:50]
Villain A: █ ═ █ ═ █ ═ █
Villain B: █ ═ █ · · · ·
Result: Villain B shows empty cells after last appearance (no web beyond last appearance)
```

### No Gaps (All Consecutive)
```
Villain: [1, 2, 3, 4, 5]
Elastic Columns: [issue:1, issue:2, issue:3, issue:4, issue:5]
Web Connectors: None (no gap columns created)
Result: Linear grid (same as non-elastic mode)
```

---

## 🚀 Render Call Flow (Step-by-Step)

1. **Build elastic structure**
   - Call `buildElasticGridData(villains, allIssues)`
   - Returns: elasticColumns, chronoToElasticPos, sortedChronos

2. **Calculate web ranges for each villain**
   - For each villain, iterate through sorted appearances
   - For each pair (current, next), find their elastic column indices
   - Store: { from: index, to: index, gapSize: nextChrono - currentChrono }

3. **Render column headers**
   - For each elasticColumn with type='issue': render label
   - For each elasticColumn with type='gap': render light background

4. **Render villain rows**
   - For each villain, for each elasticColumn:
     - Check if column is within a web range (xIdx > web.from && xIdx < web.to)
     - If appearance: render filled cell (██)
     - If in web range: render connector line (═)
     - Otherwise: render empty cell (·)

5. **Attach tooltips**
   - On web connector lines: show "Gap: X issues"
   - On appearance cells: show issue number and villain name

---

## 🎨 Visual Design Specifications

### Gap Column Style (SIMPLIFIED)

| Element | Value | Notes |
|---------|-------|-------|
| **Gap Column Width** | 20px (1 unit) | Same as issue column - always fixed |
| **Gap Column Background** | `#f8f9fa` | Light grey, 30% opacity |
| **Gap Connector (line)** | Dashed line | `stroke-dasharray: '4,2'` |
| **Connector Color** | `#e74c3c` | Spider-Man red |
| **Connector Opacity** | 0.7 | Semi-transparent |
| **Connector Stroke Width** | 2px | Visible but not overwhelming |
| **Hover Tooltip** | Shows actual gap | "Gap: 14 issues" |

### Cell Dimensions
- **Issue Column**: 20px wide (contains appearance or empty cells)
- **Gap Column**: 20px wide (contains gap connector or empty space)
- **Appearance Cell**: 20px × 20px (filled with series color)
- **Empty Cell**: 20px × 20px (light grey)
- **X-axis Structure**: Alternates between issue columns and gap columns as needed

## 🧪 Test Cases

### Test Case 1: Single Villain, Consecutive Appearances
```javascript
Villain A: [1, 2, 3, 4, 5]
All Chronos: [1, 2, 3, 4, 5]

Elastic Columns: [issue:1, issue:2, issue:3, issue:4, issue:5]
No gap columns needed - all consecutive in chronology

Result: |1|2|3|4|5|
        |██|██|██|██|██|
```

### Test Case 2: Single Villain, With Gaps
```javascript
Villain A: [1, 5, 10]
All Chronos: [1, 5, 10]

Check gaps:
  1 → 5: gap of 4 (need gap column)
  5 → 10: gap of 5 (need gap column)

Elastic Columns: [issue:1, gap:1→5, issue:5, gap:5→10, issue:10]

Result: |1|-|5|-|10|
        |██|-|██|-|██|
        (- indicates gap connector in gap column)
```

### Test Case 3: Two Villains, Shared and Different Gaps
```javascript
Villain A: [1, 5, 10]
Villain B: [3, 5, 8]

All Chronos: [1, 3, 5, 8, 10]

Check for gap columns needed:
  After 1: Villain A goes 1→5 (gap!), add gap column
  After 3: Villain B goes 3→5 (gap!), add gap column  
  After 5: Villain B goes 5→8 (gap!), add gap column
  After 8: Villain A goes (doesn't have 8), Villain B ends, check next for A: 5→10 (but 8 in between, already have issue)
  After 8: No more chronos before 10, check gaps - yes, add gap column

Elastic Columns: [issue:1, gap, issue:3, gap, issue:5, gap, issue:8, gap, issue:10]

Result: |1|-|3|-|5|-|8|-|10|
        |██|-|  |-|██|-|  |-|██|  (Villain A)
        |  |-|██|-|██|-|██|-|  |  (Villain B)
```

### Test Case 4: Large Gap Same Treatment
```javascript
Villain: [1, 2, 100]
All Chronos: [1, 2, 100]

Check gaps:
  1 → 2: gap of 1 (consecutive! no gap column)
  2 → 100: gap of 98 (huge! but still just 1 gap column)

Elastic Columns: [issue:1, issue:2, gap:2→100, issue:100]

Result: |1|2|-|100|
        |██|██|-|██|
        (gap column has tooltip: "Gap: 98 issues")
```
```
Input: [1, 2, 3, 4, 5]
Expected Elastic Positions: [0, 1, 2, 3, 4]
Gap Connectors: 4 × single-dash connectors
```

### Test Case 2: Single Villain, Small Gaps
```
Input: [1, 3, 5, 7, 9]
Expected Elastic Positions: [0, 3, 6, 9, 12]
Gap Connectors: 4 × double-dash connectors (gap of 2)
```

### Test Case 3: Two Villains, Shared Issue
```
Villain A: [1, 5, 10]
Villain B: [3, 5, 8]

Unified Chrono Issues: [1, 3, 5, 8, 10]
Elastic Positions: 
  1 → 0
  3 → 3   (gap of 2)
  5 → 6   (gap of 2)
  8 → 9   (gap of 3)
  10 → 13 (gap of 2)

Villain A cells: positions [0, 6, 13]
Villain B cells: positions [3, 6, 9]
Both appear at position 6 (issue 5)
```

### Test Case 4: Large Gap Handling
```
Input: [1, 2, 100, 101]
Expected Elastic Positions: [0, 1, 8, 9]  (gap of 98 → ~7 units)
Gap Connector: Very long dashed line with low opacity
```

---

## 🔀 Integration with Existing Features

### Filter Compatibility
- ✅ **Min Appearances Filter**: Works - filters before elastic scale
- ✅ **Villain Selection**: Works - filters before elastic scale
- ✅ **Y-axis Sort**: Works - independent of X-axis
- ⚠️ **Trailing Grids Toggle**: Needs modification
  - Currently hides trailing cells after last appearance
  - With elastic filter: no "trailing" concept (gaps are removed)
  - **Decision**: Disable trailing toggle when elastic mode is active

### Zoom & Pan
- Current zoom applies uniform scaling
- Elastic mode: should zoom work the same way?
  - **Yes**: Treat elastic positions as the new coordinate system
  - Zoom multiplier applies to elastic units, not issue numbers

---

## 📋 Implementation Checklist

### Phase 1: Core Algorithm (No UI yet)
- [ ] Implement `buildElasticGridData(villains, issues)` function
- [ ] Build elastic column structure (interleaved issue and gap columns)
- [ ] Write unit tests for elastic column calculation
- [ ] Test with Sandman data
- [ ] Test with multi-villain alignment

### Phase 2: Rendering
- [ ] Modify `renderUnifiedGrid()` to accept elastic mode parameter
- [ ] Render both issue columns and gap columns
- [ ] Render appearance cells in issue columns
- [ ] Render gap connectors in gap columns (per villain)
- [ ] Update X-axis labels (only on issue columns)
- [ ] Add hover tooltips for gap connectors ("Gap: X issues")

### Phase 3: UI Controls
- [ ] Add "Elastic Filter" toggle button to grid controls
- [ ] Store elastic mode state in class property (`this.elasticMode`)
- [ ] Disable "Trailing Grids" toggle when elastic mode is on
- [ ] Add keyboard shortcut (e.g., 'E' key)

### Phase 4: Polish
- [ ] Smooth transition animation when toggling elastic mode
- [ ] Adjust zoom behavior for elastic column structure
- [ ] Add description text explaining elastic filter
- [ ] Update documentation

### Phase 5: Performance
- [ ] Optimize for large datasets (100+ villains, 1000+ issues)
- [ ] Consider caching elastic scale calculations
- [ ] Measure render time impact

---

## 🎪 Example Mock-up (ASCII Art)

### Standard Grid (Linear X-axis)
```
          1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20
Doc Ock:  ·  ·  █  ·  ·  ·  ·  ·  ·  ·  █  █  ·  ·  ·  ·  ·  ·  ·  ·
Sandman:  ·  ·  ·  █  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  █  █  ·
```

### Elastic Grid (Compressed X-axis with Gap Columns and Web Connectors)
```
          3  4  -  11 12 -  18 19
          ==========================
Doc Ock:  █  ·  ═  █  █  ═  ·  ·
Sandman:  ·  █  ═  ═  ═  ═  █  █
          ==========================
          
Legend:
  █ = Appearance (villain appears in this issue)
  ═ = Web connector (spans from appearance to next appearance)
  · = Empty (no appearances remain for this villain)
  - = Gap column (1 unit wide, shows when ANY villain has a gap)
  
Key Points:
- Web connectors fill EVERY column (issue and gap) between consecutive appearances
- Gap columns only appear when there's a chronological gap between issues
- Doc Ock: 3→4 are consecutive (no gap column), so 4 shows empty (·), not web; 4→11 has gap, so web (═) in gap column
- Sandman: 4 has appearance, web (═) through gap column to 11, then consecutive 11→12 with web, etc.
- Gap columns are structural - they appear when ANY villain needs them
```

---

## 🚀 Future Enhancements

### V1: Basic Elastic Filter
- Fixed 1-unit gap columns
- Single gap connector style (dashed red line)
- No customization

### V2: Advanced Options
- Toggle gap column visibility (show/hide)
- Alternative gap connector styles (dotted, solid, thick)
- **Variable web thickness based on gap size** (thicker line = larger gap)
- Color-coded gap lines by gap size
- Gap size threshold (e.g., only show gaps > N issues)
- Gap size legend

### V3: Smart Compression
- Auto-adjust gap units based on viewport width
- Collapse very large gaps to fixed max width
- "Show full timeline" button to temporarily expand

---

## 🐛 Known Challenges & Solutions

### Challenge 1: Alignment Precision
**Problem**: When multiple villains share an issue, their elastic positions must align perfectly.

**Solution**: Use a single unified elastic scale for ALL villains. Compute once, apply to all.

### Challenge 2: Label Overlap
**Problem**: With compressed X-axis, issue labels may overlap.

**Solution**: 
- Rotate labels 45°
- Only show labels on issue columns (not gap columns)
- Use abbreviated labels for tight spaces
- Show full label on hover

### Challenge 3: Performance with Many Villains
**Problem**: Drawing gap connectors for 100+ villains could be slow.

**Solution**:
- Reuse gap column structure across all villains
- Use CSS classes for connector styling
- Only render visible rows (viewport virtualization)

### Challenge 4: Gap Column Determination
**Problem**: How to decide which gaps need columns?

**Solution**: A gap column is needed after issue X if ANY villain has X as an appearance and their next appearance has a chronological gap > 1.

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────┐
│ Raw Issue Data                  │
│ (chronological positions)       │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Filter Villains                 │
│ (min appearances, selection)    │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Build Elastic Column Structure  │
│ - Collect all unique issues     │
│ - Sort chronologically          │
│ - Determine gap columns needed  │
│ - Build interleaved structure   │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Render Grid                     │
│ - Draw issue columns            │
│ - Draw gap columns              │
│ - Draw appearance cells         │
│ - Draw gap connectors           │
│ - Draw labels (issue cols only) │
└─────────────────────────────────┘
```
└─────────────────────────────────┘
```

---

## 🧮 Gap Column Sizing (SIMPLIFIED)

**Design Decision**: All gap columns are **exactly 1 unit wide** (same as issue columns).

### Rationale
1. **Consistency**: Every column (issue or gap) is the same width = uniform grid
2. **Simplicity**: No complex scaling calculations needed
3. **Readability**: Easy to distinguish gap columns from issue columns
4. **Performance**: Faster rendering with fixed-width structure
5. **Visual Clarity**: Gap connector lines are always the same length

### Implementation
```javascript
// Gap columns are always 1 unit wide
const GAP_COLUMN_WIDTH = cellSize; // 20px (same as issue column)
```

### Gap Size Information
- **Visual**: Gap column background (light grey) indicates a gap exists
- **Interactive**: Hover tooltip shows actual gap size ("Gap: 14 issues")
- **No scaling**: Gap of 2 and gap of 100 both get 1 unit gap column

---

## 🎯 Success Criteria

### Functionality
- ✅ Removes empty columns from grid
- ✅ Shows all villain appearances
- ✅ Aligns shared appearances across villains
- ✅ Draws gap connector lines in gap columns
- ✅ Gap columns are always 1 block wide (fixed size)
- ✅ Toggle elastic mode on/off

### Usability
- ✅ Clear visual indication of gaps
- ✅ Tooltips show exact gap size
- ✅ Works with existing filters
- ✅ Smooth toggle transition
- ✅ No performance degradation

### Design
- ✅ Matches Spider-Man theme colors
- ✅ Consistent with existing grid style
- ✅ Readable at default zoom level
- ✅ Accessible (ARIA labels)

---

## 📝 Next Steps

1. **Review this investigation** with stakeholders
2. **Approve design approach** (column-based structure with gap columns)
3. **Create feature branch**: `feature/elastic-x-axis-filter`
4. **Implement Phase 1**: Core algorithm with tests
5. **Implement Phase 2**: Rendering integration
6. **Implement Phase 3**: UI controls
7. **Testing**: Manual testing with sample data
8. **Deploy**: Merge to main after approval

---

## 📚 References

- Current Grid Implementation: [public/script.js](public/script.js#L725-L950)
- D3.js Scale Documentation: https://d3js.org/d3-scale
- Similar Visualizations: 
  - Gantt charts with variable spacing
  - Music notation with rest symbols
  - Timeline compression in project management tools

---

**Document Status**: ✅ Investigation Complete - Ready for Implementation Planning
