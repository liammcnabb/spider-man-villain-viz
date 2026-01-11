# Spider-Man Villain Timeline - Data Flow Diagram

## Scraping Process Flow

```mermaid
graph TD
    A["npm run scrape --all-series"] --> B["Load all series configs"]
    
    B --> C1["Scrape Vol 1 Issues"]
    B --> C2["Scrape Annual Issues"]
    B --> C3["Scrape Untold Tales Issues"]
    
    C1 --> D1["Create data/villains.Amazing_Spider-Man_Vol_1.json"]
    C1 --> D1b["Create data/d3-config.Amazing_Spider-Man_Vol_1.json"]
    
    C2 --> D2["Create data/villains.Amazing_Spider-Man_Annual_Vol_1.json"]
    C2 --> D2b["Create data/d3-config.Amazing_Spider-Man_Annual_Vol_1.json"]
    
    C3 --> D3["Create data/villains.Untold_Tales_of_Spider-Man_Vol_1.json"]
    C3 --> D3b["Create data/d3-config.Untold_Tales_of_Spider-Man_Vol_1.json"]
    
    D1 --> E["COMBINE STEP"]
    D2 --> E
    D3 --> E
    
    D1b --> F["COMBINE D3 STEP"]
    D2b --> F
    D3b --> F
    
    E --> G["Merge villain data from all series"]
    G --> H["Calculate combined stats"]
    H --> I["Create data/villains.json"]
    
    F --> J["Merge D3 configs from all series"]
    J --> K["Create data/d3-config.json"]
    
    I --> L["Copy to public/data/"]
    K --> L
    
    L --> M["Success!"]
```

## Data Merge Logic (Current Implementation)

```mermaid
graph TD
    A["Load all series data files"] --> B["Create villainMap"]
    
    B --> C["For each series dataset"]
    C --> D["For each villain in series"]
    
    D --> E["Check if villain already in map<br/>by URL or name"]
    E -->|Already exists| F["Add new appearances<br/>Update frequency"]
    E -->|New villain| G["Create new villain entry"]
    
    F --> H["Merge appearance lists"]
    G --> H
    
    H --> I["Calculate firstAppearance<br/>from chronological timeline"]
    
    I --> J["Write combined villains.json"]
```

## Current Issue Flow

```mermaid
graph TD
    A["Fresh scrape starts"] --> B["Individual series files created"]
    B --> C["Combine step begins"]
    C --> D["villainMap created"]
    
    D --> E{"Villain merging logic<br/>working correctly?"}
    E -->|Bug: Incorrect deduplication| F["Villains lost or duplicated"]
    E -->|Bug: Appearances not merged| G["Villain disappears after merge"]
    
    F --> H["Combined villains.json<br/>has missing/duplicate entries"]
    G --> H
    
    H --> I["Output shows<br/>Doctor Octopus missing<br/>The Rose duplicated"]
```

## Key Files in Data Flow

| File | Purpose | Created By |
|------|---------|-----------|
| `src/index.ts` | Main scraping orchestrator | Core logic |
| `src/scraper/marvelScraper.ts` | Individual series scraper | Series-specific scraping |
| `data/villains.*.json` | Single series villain data | marvelScraper + processVillainData |
| `data/d3-config.*.json` | Single series D3 config | D3ConfigBuilder.build() |
| `data/d3-config.json`   | Combined D3 config     | D3ConfigBuilder.buildAndSaveFromCombined() |
| `data/villains.json` | **Combined data from all series** | **Merge logic in src/index.ts** |
| `data/d3-config.json` | **Combined D3 config** | **Merge logic in src/index.ts** |
| `public/data/*` | Mirror of data files | Copy step |

## Suspected Issue Location

The problem likely occurs in `src/index.ts` where:
1. Individual series datasets are loaded
2. Villain data is merged using a map (villainMap, groupMap)
3. Combined data is written to files

**Critical sections to investigate:**
- Lines where villainMap is populated
- Deduplication logic using URL/name as key
- How appearances are merged from multiple series
- Timeline merging and firstAppearance calculation
