/**
 * Main entry point for Spider-Man Villain Timeline
 * 
 * Handles CLI commands:
 * - scrape: Extract raw data from Marvel Fandom
 * - process: Process raw data into villain datasets
 * - merge: Merge series-specific datasets into combined output
 * - publish: Copy data files to public directory
 * - serve: Start visualization server
 * - help: Show help information
 */

import { ScrapeRunner } from './utils/ScrapeRunner';
import { ProcessRunner } from './utils/ProcessRunner';
import { MergeRunner } from './utils/MergeRunner';
import { Publisher } from './utils/Publisher';
import { startStaticServer } from './utils/StaticServer';
import { parseCommandArgs, CommandOptions } from './utils/commandParser';
import { getDefaultIssuesForVolume } from './utils/cliParser';

/**
 * Display help information
 */
function showHelp(): void {
  console.log(`
Spider-Man Villain Timeline - CLI Tool

USAGE:
  npm run <command> [options]

COMMANDS:
  scrape      Extract raw data from Marvel Fandom
  process     Process raw data into villain datasets
  merge       Merge series-specific datasets into combined output
  publish     Copy data files to public directory
  serve       Start HTTP server for visualization
  help        Show this help message

SCRAPE COMMAND:
  npm run scrape -- [options]

  Options:
    --series, -s <name>     Series to scrape (default: "Amazing Spider-Man Vol 1")
    --issues, -i <spec>     Issues to scrape (ranges, specific issues, or both)
                            Examples:
                              1-20              Issues 1 through 20
                              1,5,10,20         Specific issues
                              1-20,50-60        Multiple ranges
    --out, -o <path>        Output path for raw data (default: data/raw.{Series}.json)
    --all-series, -a        Scrape all supported series sequentially

  Examples:
    npm run scrape -- --issues 1-20
    npm run scrape -- --series "Untold Tales of Spider-Man Vol 1" --issues 1-25
    npm run scrape -- --all-series

PROCESS COMMAND:
  npm run process -- [options]

  Options:
    --series, -s <name>     Series to process (derives input path)
    --in <path>             Input raw data path (alternative to --series)
    --out, -o <path>        Output path for processed data
    --validate              Run validation checks on processed data

  Examples:
    npm run process -- --series "Amazing Spider-Man Vol 1"
    npm run process -- --in data/raw.Amazing_Spider-Man_Vol_1.json --validate

MERGE COMMAND:
  npm run merge -- [options]

  Options:
    --inputs, -i <pattern>  Glob pattern for input files (default: "villains.*.json")
    --out, -o <path>        Output path (default: data/villains.json)

  Examples:
    npm run merge
    npm run merge -- --inputs "villains.Amazing*.json"

PUBLISH COMMAND:
  npm run publish -- [options]

  Options:
    --src, -s <path>        Source directory (default: data/)
    --dest, -d <path>       Destination directory (default: public/data/)

  Examples:
    npm run publish
    npm run publish -- --src data --dest public/data

SERVE COMMAND:
  npm run serve -- [options]

  Options:
    --port, -p <number>     Port number (default: 8000)

  Examples:
    npm run serve
    npm run serve -- --port 3000

SUPPORTED SERIES:
  - Amazing Spider-Man Vol 1 (issues 1-441)
  - Amazing Spider-Man Annual Vol 1 (issues 1-28)
  - Untold Tales of Spider-Man Vol 1 (issues 1-25)
  `);
}

/**
 * Handle scrape command
 */
async function handleScrape(options: CommandOptions): Promise<void> {
  if (options.command !== 'scrape') return;

  const scraper = new ScrapeRunner();

  if (options.allSeries) {
    // Scrape all supported series
    const supportedSeries = [
      { series: 'Amazing Spider-Man Vol 1', issues: getDefaultIssuesForVolume('Amazing Spider-Man Vol 1') },
      { series: 'Amazing Spider-Man Annual Vol 1', issues: getDefaultIssuesForVolume('Amazing Spider-Man Annual Vol 1') },
      { series: 'Untold Tales of Spider-Man Vol 1', issues: getDefaultIssuesForVolume('Untold Tales of Spider-Man Vol 1') }
    ];
    await scraper.runMultipleSeries(supportedSeries);
  } else {
    // Determine issues to scrape
    let issues: number[];
    if (options.issues.length > 0) {
      issues = options.issues;
    } else {
      issues = getDefaultIssuesForVolume(options.series);
    }

    await scraper.run({
      series: options.series,
      issues: issues,
      outputPath: options.out
    });
  }

  console.log('\n✅ Scrape complete!');
}

/**
 * Handle process command
 */
async function handleProcess(options: CommandOptions): Promise<void> {
  if (options.command !== 'process') return;

  const processor = new ProcessRunner();

  await processor.run({
    series: options.series,
    inputPath: options.in,
    outputPath: options.out,
    validate: options.validate
  });

  console.log('\n✅ Processing complete!');
}

/**
 * Handle merge command
 */
async function handleMerge(options: CommandOptions): Promise<void> {
  if (options.command !== 'merge') return;

  const merger = new MergeRunner();

  await merger.run({
    inputsPattern: options.inputs,
    outputPath: options.out
  });

  console.log('\n✅ Merge complete!');
}

/**
 * Handle publish command
 */
async function handlePublish(options: CommandOptions): Promise<void> {
  if (options.command !== 'publish') return;

  const publisher = new Publisher();

  await publisher.run({
    srcDir: options.src,
    destDir: options.dest
  });

  console.log('\n✅ Publish complete!');
}

/**
 * Handle serve command
 */
async function handleServe(options: CommandOptions): Promise<void> {
  if (options.command !== 'serve') return;

  try {
    await startStaticServer({
      port: options.port,
      directory: 'public',
      verbose: false
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Main function - handles CLI commands
 */
async function main(): Promise<void> {
  try {
    const options = parseCommandArgs(process.argv);

    switch (options.command) {
      case 'scrape':
        await handleScrape(options);
        break;
      case 'process':
        await handleProcess(options);
        break;
      case 'merge':
        await handleMerge(options);
        break;
      case 'publish':
        await handlePublish(options);
        break;
      case 'serve':
        await handleServe(options);
        break;
      case 'help':
        showHelp();
        break;
      default:
        console.error(`Unknown command: ${(options as any).command}`);
        console.error('Run with "help" for usage information');
        process.exit(1);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Unknown error:', error);
    }
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

