/**
 * ScrapeRunner - Handles scraping workflow
 * 
 * Responsibilities:
 * - Scrape raw data from Marvel Fandom
 * - Output raw per-series JSON only (no processing)
 * - Support CLI arguments: --series, --issues, --out
 */

import * as fs from 'fs';
import * as path from 'path';
import { MarvelScraper } from '../scraper/marvelScraper';
import { SeriesName } from './seriesName';
import type { RawVillainData } from '../types';

export interface ScrapeOptions {
  series: string;
  issues: number[];
  outputPath?: string;
}

export class ScrapeRunner {
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.join(process.cwd(), 'data');
  }

  /**
   * Ensures data directory exists
   */
  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log(`Created data directory: ${this.dataDir}`);
    }
  }

  /**
   * Formats issue list for display
   */
  private formatIssueList(issues: number[], maxDisplay: number = 5): string {
    if (issues.length <= maxDisplay) {
      return issues.join(', ');
    }
    return `${issues[0]}-${issues[issues.length - 1]} (${issues.length} total)`;
  }

  /**
   * Derives series slug from base URL or series name using SeriesName utility
   */
  private deriveSeriesSlug(rawData: RawVillainData, seriesName: string): string {
    const baseUrl = typeof (rawData as any).baseUrl === 'string' 
      ? (rawData as any).baseUrl as string 
      : '';
    
    if (baseUrl.includes('/wiki/')) {
      return baseUrl.split('/wiki/')[1].replace('_{issue}', '');
    }
    
    // Use SeriesName utility for consistent slug generation
    return new SeriesName(seriesName).toSlug();
  }

  /**
   * Run the scraper and save raw data
   * 
   * @param options - Scrape configuration options
   * @returns Promise resolving to scraped raw data
   */
  async run(options: ScrapeOptions): Promise<RawVillainData> {
    this.ensureDataDir();

    const scraper = new MarvelScraper();
    console.log(`🕷️  Starting Marvel Fandom scraper for ${options.series}...`);
    
    if (options.issues.length > 0) {
      console.log(`   Scraping ${options.issues.length} issue(s): ${this.formatIssueList(options.issues)}`);
    }

    const rawData = await scraper.scrapeIssues(options.issues, options.series);
    console.log(`✓ Scraped ${rawData.issues.length} issues`);

    // Determine output path
    const seriesSlug = this.deriveSeriesSlug(rawData, options.series);
    const outputPath = options.outputPath 
      || path.join(this.dataDir, `raw.${seriesSlug}.json`);

    // Merge with existing data if file exists
    let mergedData = rawData;
    if (fs.existsSync(outputPath)) {
      try {
        const existingContent = fs.readFileSync(outputPath, 'utf8');
        const existingData: RawVillainData = JSON.parse(existingContent);
        
        // Create a map of issue numbers to issue data for quick lookup
        const issueMap = new Map<number, any>();
        
        // Add existing issues to map
        for (const issue of existingData.issues) {
          issueMap.set(issue.issueNumber, issue);
        }
        
        // Override with newly scraped issues
        for (const issue of rawData.issues) {
          issueMap.set(issue.issueNumber, issue);
        }
        
        // Convert back to sorted array
        const mergedIssues = Array.from(issueMap.values())
          .sort((a, b) => a.issueNumber - b.issueNumber);
        
        mergedData = {
          ...rawData,
          issues: mergedIssues
        };
        
        console.log(`✓ Merged with existing data (${existingData.issues.length} existing + ${rawData.issues.length} new = ${mergedIssues.length} total)`);
      } catch (error) {
        console.warn(`⚠️  Failed to merge with existing data, will overwrite: ${error}`);
      }
    }

    // Save merged data
    fs.writeFileSync(
      outputPath,
      JSON.stringify(mergedData, null, 2)
    );
    console.log(`✓ Saved raw data to ${outputPath}`);

    return mergedData;
  }

  /**
   * Run scraper for multiple series sequentially
   */
  async runMultipleSeries(seriesConfigs: Array<{ series: string; issues: number[] }>): Promise<void> {
    for (const config of seriesConfigs) {
      console.log(`\n=== Scraping ${config.series} (${config.issues[0]}-${config.issues[config.issues.length - 1]}) ===`);
      await this.run({
        series: config.series,
        issues: config.issues
      });
    }
    console.log('\n✅ Scraping complete!');
  }
}
