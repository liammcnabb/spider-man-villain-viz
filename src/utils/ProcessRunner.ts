/**
 * ProcessRunner - Handles data processing workflow
 * 
 * Responsibilities:
 * - Read raw.{Series}.json files
 * - Process villain data using existing dataProcessor logic
 * - Generate D3 config
 * - Output processed villains.{Series}.json and d3-config.{Series}.json
 * - Support CLI arguments: --series, --in, --out, --validate
 */

import * as fs from 'fs';
import * as path from 'path';
import { SeriesName } from './seriesName';
import type { RawVillainData, SerializedProcessedData, ProcessedData } from '../types';
import {
  processVillainData,
  serializeProcessedData
} from './dataProcessor';
import {
  D3ConfigBuilder
} from '../visualization/D3ConfigBuilder';

export interface ProcessOptions {
  series?: string;
  inputPath?: string;
  outputPath?: string;
  validate?: boolean;
}

export class ProcessRunner {
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
   * Derives series slug from series name or raw data using SeriesName utility
   */
  private deriveSeriesSlug(rawData: RawVillainData): string {
    const baseUrl = typeof (rawData as any).baseUrl === 'string' 
      ? (rawData as any).baseUrl as string 
      : '';
    
    if (baseUrl.includes('/wiki/')) {
      return baseUrl.split('/wiki/')[1].replace('_{issue}', '');
    }
    
    // Use SeriesName utility for consistent slug generation
    return new SeriesName(rawData.series).toSlug();
  }

  /**
   * Validates processed data (basic checks)
   */
  private validateData(data: ProcessedData): void {
    if (!data.villains || data.villains.length === 0) {
      throw new Error('Validation failed: No villains found in processed data');
    }
    if (!data.timeline || data.timeline.length === 0) {
      throw new Error('Validation failed: No timeline data found');
    }
    console.log(`✓ Validation passed: ${data.villains.length} villains, ${data.timeline.length} timeline entries`);
  }

  /**
   * Process raw data and generate outputs
   * 
   * @param options - Processing configuration options
   * @returns Promise resolving to serialized processed data
   */
  async run(options: ProcessOptions): Promise<SerializedProcessedData> {
    this.ensureDataDir();

    // Determine input path
    let inputPath: string;
    if (options.inputPath) {
      inputPath = options.inputPath;
    } else if (options.series) {
      // Derive from series name
      const seriesSlug = options.series.replace(/\s+/g, '_').replace(/Vol\s+/i, 'Vol_');
      inputPath = path.join(this.dataDir, `raw.${seriesSlug}.json`);
    } else {
      throw new Error('Must provide either --in (input path) or --series');
    }

    // Read raw data
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    console.log(`📖 Reading raw data from ${inputPath}...`);
    const rawDataContent = fs.readFileSync(inputPath, 'utf-8');
    const rawData: RawVillainData = JSON.parse(rawDataContent);

    // Process data
    console.log('⚙️  Processing villain data...');
    const processedData = processVillainData(rawData);
    const serialized = serializeProcessedData(processedData);

    // Validate if requested
    if (options.validate) {
      this.validateData(processedData);
    }

    // Determine output paths
    const seriesSlug = this.deriveSeriesSlug(rawData);
    const villainsOutputPath = options.outputPath 
      || path.join(this.dataDir, `villains.${seriesSlug}.json`);
    const d3ConfigOutputPath = path.join(
      this.dataDir, 
      `d3-config.${seriesSlug}.json`
    );

    // Save processed villain data
    fs.writeFileSync(
      villainsOutputPath,
      JSON.stringify(serialized, null, 2)
    );
    console.log(`✓ Saved processed data to ${villainsOutputPath}`);

    // Generate and save D3 config
    console.log('📊 Generating D3 visualization config...');
    const builder = new D3ConfigBuilder();
    const d3Config = builder.build(processedData);
    const d3ConfigJSON = builder.exportAsJSON(d3Config);
    
    fs.writeFileSync(
      d3ConfigOutputPath,
      JSON.stringify(d3ConfigJSON, null, 2)
    );
    console.log(`✓ Saved D3 config to ${d3ConfigOutputPath}`);

    return serialized;
  }

  /**
   * Process multiple series sequentially
   */
  async runMultipleSeries(seriesNames: string[]): Promise<void> {
    for (const series of seriesNames) {
      console.log(`\n=== Processing ${series} ===`);
      await this.run({ series, validate: true });
    }
    console.log('\n✅ Processing complete!');
  }
}
