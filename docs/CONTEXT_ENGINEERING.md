# Context Engineering Integration

This file documents how the Spider-Man Villain Timeline project implements the Context Engineering Protocol.

## Protocol Integration

### 1. Tool System

The project implements three main tools as per Context Engineering standards:

#### Tool 1: Marvel Fandom Scraper
- **Location**: `src/scraper/marvelScraper.ts`
- **Input**: Issue range (startIssue, endIssue)
- **Output**: RawVillainData with antagonist lists
- **Responsibility**: Extract data from external source

#### Tool 2: Data Processor
- **Location**: `src/utils/dataProcessor.ts`
- **Input**: RawVillainData
- **Output**: ProcessedData with normalized villains
- **Responsibility**: Transform and validate data

#### Tool 3: Visualization Generator
- **Location**: `src/visualization/d3Graph.ts`
- **Input**: ProcessedData
- **Output**: D3 configuration and SVG paths
- **Responsibility**: Prepare data for rendering

### 2. Context Building

The project builds context through:

**User Request** → Context determination → Tool orchestration

```
User provides issue range
    ↓
System builds context:
  - Required issues
  - Data validation rules
  - Output format requirements
    ↓
Tools executed in sequence:
  1. Scraper (fetches data)
  2. Processor (transforms data)
  3. Visualizer (prepares for rendering)
```

### 3. Feedback Loop

Metrics collected at each stage:

**Scraping Feedback**:
- Success rate per issue
- Network latency
- HTML parsing accuracy
- Villains extracted per issue

**Processing Feedback**:
- Normalization success rate
- Duplicate detection rate
- Data validation pass rate
- Villain frequency distribution

**Visualization Feedback**:
- Scale generation accuracy
- Color palette coverage
- Render time performance
- Data point density

### 4. Proof Steps

The project implements proof verification:

**Proof of Data Extraction**:
- Verify issue count matches request
- Verify antagonist lists are non-empty
- Verify URL generation is correct

**Proof of Normalization**:
- Verify villains are deduplicated
- Verify all appearances tracked
- Verify stats calculations are correct

**Proof of Visualization**:
- Verify D3 scales match data domain
- Verify colors are distinct
- Verify timeline is chronological

## Type System

All data flows through strict TypeScript types:

```typescript
// Input types
IssueData → RawVillainData

// Processing types
RawVillainData → ProcessedData
ProcessedVillain → VillainStats

// Visualization types
ProcessedData → D3DataPoint
D3DataPoint → D3Config
```

## Error Handling Strategy

Following Context Engineering principles:

1. **Graceful Degradation**: If one issue fails to scrape, continue with others
2. **Logging**: All errors logged for feedback analysis
3. **Validation**: Data validated at each stage
4. **Recovery**: Normalized data marked with source quality

## Configuration Management

Context Engineering defines configuration as external to code:

**Environment Variables** (in `.env`):
```
MARVEL_FANDOM_BASE=https://marvel.fandom.com
SCRAPE_ISSUES_START=1
SCRAPE_ISSUES_END=20
SCRAPE_TIMEOUT=10000
DATA_OUTPUT_PATH=./data/villains.json
```

**Runtime Configuration** (in `public/script.js`):
```javascript
const VIZ_CONFIG = {
    margin: { top: 30, right: 30, bottom: 40, left: 70 },
    animationDuration: 750,
    tooltipDelay: 100
};
```

## Modularity & Separation of Concerns

Each component is independent and can be modified without affecting others:

- **Scraper**: Can change HTML parsing without affecting processor
- **Processor**: Can change normalization rules without affecting visualizer
- **Visualizer**: Can change D3 configuration without affecting processor
- **Frontend**: Can change UI without affecting backend

## Extension Points

Following Context Engineering extensibility:

### Add New Series
```typescript
// In marvelScraper.ts
async scrapeUltimateSpiderMan(startIssue: number, endIssue: number)
```

### Add New Metrics
```typescript
// In dataProcessor.ts
function generateMetrics(data: ProcessedData)
```

### Add New Visualizations
```typescript
// In src/visualization/newVizType.ts
function generateNewVisualizationType(config: D3Config)
```

## Documentation Structure

Following Context Engineering documentation standards:

- **ARCHITECTURE.md**: System design and component relationships
- **GUIDELINES.md**: Code standards and best practices
- **SETUP.md**: Installation and configuration
- **This file**: Context Engineering implementation details
- **Code comments**: Implementation-level documentation via JSDoc

## Quality Assurance

Context Engineering emphasizes measurable improvement:

**Metrics Collected**:
- Scraping success rate
- Data quality score
- Parsing accuracy
- Normalization effectiveness
- Visualization render time

**Continuous Improvement**:
- Monitor feedback metrics
- Identify bottlenecks
- Optimize tool efficiency
- Validate proof steps

## References

- Main template: [Context Engineering Template](../../context-engineering-template/)
- Architecture guide: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Code guidelines: [GUIDELINES.md](./GUIDELINES.md)
- Setup instructions: [SETUP.md](./SETUP.md)
