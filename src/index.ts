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

// Configuration
const DATA_DIR = path.join(__dirname, '..', 'data');
const PUBLIC_DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const VILLAINS_JSON = path.join(DATA_DIR, 'villains.json');
const PUBLIC_VILLAINS_JSON = path.join(PUBLIC_DATA_DIR, 'villains.json');

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
    
    console.log('🕷️  Starting Marvel Fandom scraper...');
    const scraper = new MarvelScraper();
    
    // Scrape issues 1-20
    const rawData = await scraper.scrapeAmazingSpiderManVol1(1, 441);
    
    console.log(`✓ Scraped ${rawData.issues.length} issues`);
    
    // Process data
    console.log('Processing data...');
    const processedData = processVillainData(rawData);
    
    // Serialize for JSON storage
    const serialized = serializeProcessedData(processedData);
    
    // Save to file
    fs.writeFileSync(
      VILLAINS_JSON,
      JSON.stringify(serialized, null, 2)
    );
    
    console.log(`✓ Saved to ${VILLAINS_JSON}`);
    
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
    
    console.log(`✓ Saved D3 config to ${configPath}`);
    
    // Copy files to public directory for HTTP server
    copyDataToPublic();
    
    console.log('\n✅ Scraping complete!');
    
  } catch (error) {
    console.error('❌ Scraping failed:', error);
    process.exit(1);
  }
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

Usage: npm run dev [command]

Commands:
  scrape    Extract villain data from Marvel Fandom (default)
  help      Show this help message
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
