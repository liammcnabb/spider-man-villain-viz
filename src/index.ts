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
import { generateD3ConfigFromCombined } from './utils/generateD3FromCombined';
import {
  parseScrapeArgs,
  getDefaultIssuesForVolume
} from './utils/cliParser';
import { mergeDatasets } from './utils/mergeDatasets';

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
    
    // Helper to process one series end-to-end
    const processOneSeries = async (seriesName: string, issues: number[]) => {
      const scraper = new MarvelScraper();
      console.log(`🕷️  Starting Marvel Fandom scraper for ${seriesName}...`);
      if (issues.length > 0) {
        console.log(`   Scraping ${issues.length} issue(s): ${formatIssueList(issues)}`);
      }
      const rawData = await scraper.scrapeIssues(issues, seriesName);
      console.log(`✓ Scraped ${rawData.issues.length} issues`);
      
      console.log('Processing data...');
      const processedData = processVillainData(rawData);
      const serialized = serializeProcessedData(processedData);
      
      const baseUrl = typeof (rawData as any).baseUrl === 'string' ? (rawData as any).baseUrl as string : '';
      const slugFromBase = baseUrl.includes('/wiki/')
        ? baseUrl.split('/wiki/')[1].replace('_{issue}', '')
        : seriesName.replace(/\s+/g, '_').replace(/Vol\s+/i, 'Vol_');
      const seriesSlug = slugFromBase || 'series';

      const SERIES_VILLAINS_JSON = path.join(DATA_DIR, `villains.${seriesSlug}.json`);
      const SERIES_PUBLIC_VILLAINS_JSON = path.join(PUBLIC_DATA_DIR, `villains.${seriesSlug}.json`);
      const SERIES_CONFIG_JSON = path.join(DATA_DIR, `d3-config.${seriesSlug}.json`);
      const SERIES_PUBLIC_CONFIG_JSON = path.join(PUBLIC_DATA_DIR, `d3-config.${seriesSlug}.json`);

      // Save default files (legacy) and series-specific files
      fs.writeFileSync(
        VILLAINS_JSON,
        JSON.stringify(serialized, null, 2)
      );
      fs.writeFileSync(
        SERIES_VILLAINS_JSON,
        JSON.stringify(serialized, null, 2)
      );
      console.log(`✓ Saved to ${VILLAINS_JSON}`);
      console.log(`✓ Saved to ${SERIES_VILLAINS_JSON}`);

      console.log('Generating D3 visualization config...');
      const d3Config = generateD3Config(processedData);
      const d3ConfigJSON = exportD3ConfigJSON(d3Config);
      const configPath = path.join(DATA_DIR, 'd3-config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify(d3ConfigJSON, null, 2)
      );
      fs.writeFileSync(
        SERIES_CONFIG_JSON,
        JSON.stringify(d3ConfigJSON, null, 2)
      );
      console.log(`✓ Saved D3 config to ${configPath}`);
      console.log(`✓ Saved D3 config to ${SERIES_CONFIG_JSON}`);

      // Build combined villains dataset across all series-specific files
      try {
        const files = fs.readdirSync(DATA_DIR)
          .filter(f => f.startsWith('villains.') && f.endsWith('.json') && !f.includes('villains.json'));

        const datasets: any[] = [];
        for (const f of files) {
          try {
            const content = fs.readFileSync(path.join(DATA_DIR, f), 'utf-8');
            datasets.push(JSON.parse(content));
          } catch {}
        }

        // Use the separate merge logic to combine datasets
        const mergedResult = mergeDatasets(datasets);

        const combined = {
          series: 'Combined',
          processedAt: new Date().toISOString(),
          stats: {
            totalVillains: mergedResult.stats.totalVillains,
            mostFrequent: mergedResult.stats.mostFrequent,
            mostFrequentCount: mergedResult.stats.mostFrequentCount,
            averageFrequency: mergedResult.stats.averageFrequency
          },
          villains: mergedResult.villains,
          timeline: mergedResult.timeline,
          groups: mergedResult.groups
        };

        fs.writeFileSync(VILLAINS_JSON, JSON.stringify(combined, null, 2));
        console.log(`✓ Wrote combined default to ${VILLAINS_JSON}`);

        // Generate D3 config from combined timeline
        try {
          generateD3ConfigFromCombined(VILLAINS_JSON, path.join(DATA_DIR, 'd3-config.json'));
        } catch (d3Err) {
          console.error('Warning: Failed to generate D3 config from combined data:', d3Err);
        }
      } catch (combineErr) {
        console.error('Warning: Failed to generate combined default dataset:', combineErr);
      }

      copyDataToPublic();
      try {
        fs.copyFileSync(SERIES_VILLAINS_JSON, SERIES_PUBLIC_VILLAINS_JSON);
        fs.copyFileSync(SERIES_CONFIG_JSON, SERIES_PUBLIC_CONFIG_JSON);
        console.log('✓ Copied series-specific data files to public directory');
      } catch (err) {
        console.error('Warning: Failed to copy series-specific files to public directory:', err);
      }
    };
    
    // If --all-series is provided, run across supported series
    if (options.allSeries) {
      const supportedSeries = [
        'Amazing Spider-Man Vol 1',
        'Amazing Spider-Man Annual Vol 1',
        'Untold Tales of Spider-Man Vol 1'
      ];
      for (const seriesName of supportedSeries) {
        const issues = getDefaultIssuesForVolume(seriesName);
        console.log(`\n=== Scraping ${seriesName} (${issues[0]}-${issues[issues.length - 1]}) ===`);
        await processOneSeries(seriesName, issues);
      }
      console.log('\n✅ Scraping complete!');
      return;
    }

    // Single-series path
    let issues: number[];
    if (options.issues.length > 0) {
      issues = options.issues;
    } else {
      issues = getDefaultIssuesForVolume(options.volume);
    }
    await processOneSeries(options.volume, issues);
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
  --series, -s <name>    Alias for --volume
  --all-series, -a       Scrape all supported series sequentially
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
  npm run scrape -- --series "Amazing Spider-Man Annual Vol 1"  # Alias usage
  npm run scrape -- --all-series                                # Scrape all series
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
