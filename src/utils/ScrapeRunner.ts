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
   * Derives series slug from base URL or series name
   */
  private deriveSeriesSlug(rawData: RawVillainData, seriesName: string): string {
    const baseUrl = typeof (rawData as any).baseUrl === 'string' 
      ? (rawData as any).baseUrl as string 
      : '';
    
    const slugFromBase = baseUrl.includes('/wiki/')
      ? baseUrl.split('/wiki/')[1].replace('_{issue}', '')
      : seriesName.replace(/\s+/g, '_').replace(/Vol\s+/i, 'Vol_');
    
    return slugFromBase || seriesName.replace(/\s+/g, '_').replace(/Vol\s+/i, 'Vol_');
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

    // Save raw data
    fs.writeFileSync(
      outputPath,
      JSON.stringify(rawData, null, 2)
    );
    console.log(`✓ Saved raw data to ${outputPath}`);

    return rawData;
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
