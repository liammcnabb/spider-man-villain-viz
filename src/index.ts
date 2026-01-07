/**
 * Main entry point for Spider-Man Villain Timeline
 * 
 * Handles CLI commands:
 * - scrape: Extract data from Marvel Fandom
 * - serve: Start visualization server
 */

import * as fs from 'fs';
import * as path from 'path';

import { MarvelScraper } from './scraper/marvelScraper';
import {
  processVillainData,
  serializeProcessedData
} from './utils/dataProcessor';
import {
  generateD3Config,
  exportD3ConfigJSON
} from './visualization/d3Graph';
import {
  parseScrapeArgs,
  getDefaultIssuesForVolume
} from './utils/cliParser';

// Configuration
const DATA_DIR = path.join(__dirname, '..', 'data');
// Use process.cwd() to ensure correct path when running via ts-node
const PUBLIC_DATA_DIR = path.join(process.cwd(), 'public', 'data');
const VILLAINS_JSON = path.join(DATA_DIR, 'villains.json');
const PUBLIC_VILLAINS_JSON = path.join(PUBLIC_DATA_DIR, 'villains.json');
const MAX_ISSUES_TO_DISPLAY = 5; // Maximum number of issues to list individually in output

/**
 * Ensures data directory exists
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created data directory: ${DATA_DIR}`);
  }
  if (!fs.existsSync(PUBLIC_DATA_DIR)) {
    fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
    console.log(`Created public data directory: ${PUBLIC_DATA_DIR}`);
  }
}

/**
 * Copies data files to public directory for HTTP server
 */
function copyDataToPublic(): void {
  try {
    fs.copyFileSync(VILLAINS_JSON, PUBLIC_VILLAINS_JSON);
    const configPath = path.join(DATA_DIR, 'd3-config.json');
    const publicConfigPath = path.join(PUBLIC_DATA_DIR, 'd3-config.json');
    fs.copyFileSync(configPath, publicConfigPath);
    console.log('✓ Copied data files to public directory');
  } catch (error) {
    console.error('Warning: Failed to copy data to public directory:', error);
  }
}

/**
 * Runs the scraper and saves results
 */
async function runScraper(): Promise<void> {
  try {
    ensureDataDir();
    
    // Parse command-line arguments
    const options = parseScrapeArgs(process.argv);
    
    // Determine which issues to scrape
    let issues: number[];
    if (options.issues.length > 0) {
      issues = options.issues;
      console.log(`🕷️  Starting Marvel Fandom scraper for ${options.volume}...`);
      console.log(`   Scraping ${issues.length} issue(s): ${formatIssueList(issues)}`);
    } else {
      // Default: scrape all issues for the volume
      issues = getDefaultIssuesForVolume(options.volume);
      console.log(`🕷️  Starting Marvel Fandom scraper for ${options.volume}...`);
      console.log(`   Scraping default range: issues ${issues[0]}-${issues[issues.length - 1]}`);
    }
    
    const scraper = new MarvelScraper();
    
    // Scrape the specified issues
    const rawData = await scraper.scrapeIssues(issues, options.volume);
    
    console.log(`✓ Scraped ${rawData.issues.length} issues`);
    
    // Process data
    console.log('Processing data...');
    const processedData = processVillainData(rawData);
    
    // Serialize for JSON storage
    const serialized = serializeProcessedData(processedData);
    
    // Determine series-specific filenames (additive, non-destructive)
    const baseUrl = typeof (rawData as any).baseUrl === 'string' ? (rawData as any).baseUrl as string : '';
    const slugFromBase = baseUrl.includes('/wiki/')
      ? baseUrl.split('/wiki/')[1].replace('_{issue}', '')
      : options.volume.replace(/\s+/g, '_').replace(/Vol\s+/i, 'Vol_');
    const seriesSlug = slugFromBase || 'series';

    const SERIES_VILLAINS_JSON = path.join(DATA_DIR, `villains.${seriesSlug}.json`);
    const SERIES_PUBLIC_VILLAINS_JSON = path.join(PUBLIC_DATA_DIR, `villains.${seriesSlug}.json`);

    const SERIES_CONFIG_JSON = path.join(DATA_DIR, `d3-config.${seriesSlug}.json`);
    const SERIES_PUBLIC_CONFIG_JSON = path.join(PUBLIC_DATA_DIR, `d3-config.${seriesSlug}.json`);

    // Save default files (legacy behavior: will be replaced by combined below)
    fs.writeFileSync(
      VILLAINS_JSON,
      JSON.stringify(serialized, null, 2)
    );
    // Save series-specific additive files
    fs.writeFileSync(
      SERIES_VILLAINS_JSON,
      JSON.stringify(serialized, null, 2)
    );

    console.log(`✓ Saved to ${VILLAINS_JSON}`);
    console.log(`✓ Saved to ${SERIES_VILLAINS_JSON}`);
    
    // Log statistics
    console.log('\n📊 Statistics:');
    console.log(`   Total Villains: ${processedData.stats.totalVillains}`);
    console.log(
      `   Most Frequent: ${processedData.stats.mostFrequent.names[0]} 
       (${processedData.stats.mostFrequent.frequency} appearances)`
    );
    console.log(
      `   Average Frequency: 
       ${Math.round(processedData.stats.averageFrequency * 100) / 100}`
    );
    
    // Generate D3 config
    console.log('Generating D3 visualization config...');
    const d3Config = generateD3Config(processedData);
    const d3ConfigJSON = exportD3ConfigJSON(d3Config);

    const configPath = path.join(DATA_DIR, 'd3-config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(d3ConfigJSON, null, 2)
    );
    // Save series-specific config (additive)
    fs.writeFileSync(
      SERIES_CONFIG_JSON,
      JSON.stringify(d3ConfigJSON, null, 2)
    );
    
    console.log(`✓ Saved D3 config to ${configPath}`);
    console.log(`✓ Saved D3 config to ${SERIES_CONFIG_JSON}`);
    
    // Build combined villains dataset across all series-specific files
    try {
      const files = fs.readdirSync(DATA_DIR)
        .filter(f => f.startsWith('villains.') && f.endsWith('.json'));

      type SerializedVillain = {
        id: string;
        name: string;
        aliases: string[];
        url?: string;
        firstAppearance: number;
        appearances: number[];
        frequency: number;
      };

      type SerializedGroup = {
        id: string;
        name: string;
        url?: string;
        appearances: number[];
        frequency: number;
      };

      const datasets: any[] = [];
      for (const f of files) {
        try {
          const content = fs.readFileSync(path.join(DATA_DIR, f), 'utf-8');
          datasets.push(JSON.parse(content));
        } catch {}
      }
      // Ensure current dataset is included even if files list misses it
      datasets.push(serialized);

      // Merge villains by URL if present, else by id
      const villainMap = new Map<string, SerializedVillain>();
      const groupMap = new Map<string, SerializedGroup>();

      for (const ds of datasets) {
        const villains: SerializedVillain[] = Array.isArray(ds?.villains) ? ds.villains : [];
        for (const v of villains) {
          const key = v.url || v.id;
          if (!villainMap.has(key)) {
            // clone
            villainMap.set(key, {
              id: v.id,
              name: v.name,
              aliases: [...(v.aliases || [])],
              url: v.url,
              firstAppearance: v.firstAppearance,
              appearances: [...(v.appearances || [])],
              frequency: 0
            });
          } else {
            const cur = villainMap.get(key)!;
            // merge aliases and choose existing name
            const aliasSet = new Set([...(cur.aliases || []), ...(v.aliases || [])]);
            cur.aliases = Array.from(aliasSet);
            // union appearances
            const appearSet = new Set([...(cur.appearances || []), ...(v.appearances || [])]);
            cur.appearances = Array.from(appearSet).sort((a, b) => a - b);
            // earliest first appearance
            cur.firstAppearance = Math.min(cur.firstAppearance, v.firstAppearance);
          }
        }

        const groups: SerializedGroup[] = Array.isArray(ds?.groups) ? ds.groups : [];
        for (const g of groups) {
          const gkey = g.name || g.id;
          if (!groupMap.has(gkey)) {
            groupMap.set(gkey, {
              id: g.id,
              name: g.name,
              url: g.url,
              appearances: [...(g.appearances || [])],
              frequency: 0
            });
          } else {
            const curg = groupMap.get(gkey)!;
            const appearSet = new Set([...(curg.appearances || []), ...(g.appearances || [])]);
            curg.appearances = Array.from(appearSet).sort((a, b) => a - b);
          }
        }
      }

      // Recompute frequency as count of unique appearances
      for (const v of villainMap.values()) {
        v.frequency = (v.appearances || []).length;
      }
      for (const g of groupMap.values()) {
        g.frequency = (g.appearances || []).length;
      }

      const combinedVillains = Array.from(villainMap.values());
      const combinedGroups = Array.from(groupMap.values());

      // Compute combined stats
      const totalVillains = combinedVillains.length;
      const mostFrequent = combinedVillains.reduce((prev, curr) => (curr.frequency > prev.frequency ? curr : prev),
        { id: '', name: '', aliases: [], url: undefined, firstAppearance: 0, appearances: [], frequency: 0 } as SerializedVillain);
      const averageFrequency = totalVillains > 0
        ? combinedVillains.reduce((sum, v) => sum + v.frequency, 0) / totalVillains
        : 0;

      const combined = {
        series: 'Combined',
        processedAt: new Date().toISOString(),
        stats: {
          totalVillains,
          mostFrequent: mostFrequent.name,
          mostFrequentCount: mostFrequent.frequency,
          averageFrequency: Math.round(averageFrequency * 100) / 100
        },
        villains: combinedVillains,
        // Keep current timeline and groups optional for visualization continuity
        timeline: (serialized as any).timeline || [],
        groups: combinedGroups
      };

      // Overwrite default villains.json with combined
      fs.writeFileSync(VILLAINS_JSON, JSON.stringify(combined, null, 2));
      console.log(`✓ Wrote combined default to ${VILLAINS_JSON}`);
    } catch (combineErr) {
      console.error('Warning: Failed to generate combined default dataset:', combineErr);
    }

    // Copy files to public directory for HTTP server (default + series-specific)
    copyDataToPublic();
    try {
      fs.copyFileSync(SERIES_VILLAINS_JSON, SERIES_PUBLIC_VILLAINS_JSON);
      fs.copyFileSync(SERIES_CONFIG_JSON, SERIES_PUBLIC_CONFIG_JSON);
      console.log('✓ Copied series-specific data files to public directory');
    } catch (err) {
      console.error('Warning: Failed to copy series-specific files to public directory:', err);
    }
    
    console.log('\n✅ Scraping complete!');
    
  } catch (error) {
    console.error('❌ Scraping failed:', error);
    process.exit(1);
  }
}

/**
 * Formats issue list for display
 */
function formatIssueList(issues: number[]): string {
  if (issues.length <= MAX_ISSUES_TO_DISPLAY) {
    return issues.join(', ');
  }
  return `${issues[0]}-${issues[issues.length - 1]} (${issues.length} total)`;
}

/**
 * Main function - handles CLI commands
 */
async function main(): Promise<void> {
  const command = process.argv[2] || 'scrape';
  
  switch (command) {
    case 'scrape':
      await runScraper();
      break;
      
    case 'help':
      console.log(`
Spider-Man Villain Timeline

Usage: npm run scrape [options]

Options:
  --issues, -i <spec>    Issues to scrape (ranges, specific issues, or both)
                         Examples:
                           1-20              Scrape issues 1 through 20
                           1,5,10,20         Scrape specific issues
                           1-20,50-60        Scrape multiple ranges
                           1-20,50,60-70     Combine ranges and specific issues
  
  --volume, -v <name>    Volume to scrape (default: "Amazing Spider-Man Vol 1")
                         Examples:
                           "Amazing Spider-Man Vol 1"
                           "Amazing Spider-Man Vol 2"
  
  help                   Show this help message

Examples:
  npm run scrape                                    # Scrape all issues (1-441)
  npm run scrape -- --issues 1-20                   # Scrape issues 1-20
  npm run scrape -- --issues 1,5,10,20              # Scrape specific issues
  npm run scrape -- --issues 1-20,50-60             # Scrape multiple ranges
  npm run scrape -- --volume "Amazing Spider-Man Vol 2" --issues 1-58
      `);
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "npm run dev help" for usage information');
      process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
