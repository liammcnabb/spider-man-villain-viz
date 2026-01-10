#!/usr/bin/env node

/**
 * Pipeline Runner
 * 
 * Runs the complete workflow: scrape → process → merge → publish
 * Usage: npm run pipeline -- --series "Series Name" --issues 1-20
 */

import { ScrapeRunner } from './utils/ScrapeRunner';
import { ProcessRunner } from './utils/ProcessRunner';
import { MergeRunner } from './utils/MergeRunner';
import { Publisher } from './utils/Publisher';
import { parseCommandArgs, ScrapeCommandOptions } from './utils/commandParser';
import { getDefaultIssuesForVolume } from './utils/cliParser';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

async function runPipeline(): Promise<void> {
  try {
    // Parse arguments for scrape command
    const args = process.argv;
    let scrapeOptions: ScrapeCommandOptions;
    
    try {
      // Modify args to look like scrape command for parsing
      const modifiedArgs = ['node', 'script.js', 'scrape', ...args.slice(2)];
      const parsed = parseCommandArgs(modifiedArgs);
      if (parsed.command !== 'scrape') {
        throw new Error('Failed to parse as scrape command');
      }
      scrapeOptions = parsed as ScrapeCommandOptions;
    } catch (e) {
      console.error('Failed to parse arguments:', e);
      console.log(`\nUsage: npm run pipeline -- --series "Series Name" [--issues spec]`);
      console.log(`\nExamples:`);
      console.log(`  npm run pipeline -- --series "Amazing Spider-Man Vol 1" --issues 1-20`);
      console.log(`  npm run pipeline -- --series "Untold Tales of Spider-Man Vol 1" --issues 1-10`);
      process.exit(1);
    }

    // Determine issues to scrape
    let issues: number[];
    if (scrapeOptions.issues.length > 0) {
      issues = scrapeOptions.issues;
    } else {
      issues = getDefaultIssuesForVolume(scrapeOptions.series);
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`SPIDER-MAN VILLAIN TIMELINE - COMPLETE PIPELINE`);
    console.log(`${'='.repeat(70)}\n`);

    // Step 1: Scrape
    console.log(`📍 STEP 1: SCRAPE`);
    console.log(`   Series: ${scrapeOptions.series}`);
    console.log(`   Issues: ${issues[0]}-${issues[issues.length - 1]} (${issues.length} total)\n`);
    
    const scraper = new ScrapeRunner(DATA_DIR);
    await scraper.run({
      series: scrapeOptions.series,
      issues: issues,
      outputPath: scrapeOptions.out
    });

    // Step 2: Process
    console.log(`\n📍 STEP 2: PROCESS`);
    console.log(`   Processing ${scrapeOptions.series}...\n`);
    
    const processor = new ProcessRunner(DATA_DIR);
    await processor.run({
      series: scrapeOptions.series,
      validate: true
    });

    // Step 3: Merge
    console.log(`\n📍 STEP 3: MERGE`);
    console.log(`   Combining all series datasets...\n`);
    
    const merger = new MergeRunner(DATA_DIR);
    await merger.run({});

    // Step 4: Publish
    console.log(`\n📍 STEP 4: PUBLISH`);
    console.log(`   Publishing to public/data...\n`);
    
    const publisher = new Publisher();
    await publisher.run({
      srcDir: DATA_DIR,
      destDir: path.join(process.cwd(), 'public', 'data')
    });

    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ PIPELINE COMPLETE!`);
    console.log(`${'='.repeat(70)}`);
    console.log(`\nNext step: npm run serve`);
    console.log(`Then browse: http://localhost:8000\n`);

  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n❌ Pipeline failed: ${error.message}\n`);
    } else {
      console.error(`\n❌ Pipeline failed with unknown error\n`);
    }
    process.exit(1);
  }
}

runPipeline();
