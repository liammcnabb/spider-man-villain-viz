/**
 * MergeRunner - Handles merging workflow
 * 
 * Responsibilities:
 * - Merge series-specific villain files into combined villains.json
 * - Generate combined d3-config.json from merged data
 * - Support CLI arguments: --inputs (glob pattern), --out
 */

import * as fs from 'fs';
import * as path from 'path';
import type { SerializedProcessedData } from '../types';
import { mergeDatasets } from './mergeDatasets';
import { D3ConfigBuilder } from '../visualization/D3ConfigBuilder';

export interface MergeOptions {
  inputsPattern?: string; // Pattern for input files (default: 'villains.*.json')
  outputPath?: string;    // Output path for merged villains.json
  dataDir?: string;       // Directory containing input files
}

export class MergeRunner {
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
   * Get series-specific villain files matching pattern
   */
  private getSeriesFiles(pattern: string): string[] {
    const files = fs.readdirSync(this.dataDir)
      .filter(f => {
        // Match pattern: villains.{Series}.json (exclude villains.json itself)
        if (pattern === 'villains.*.json') {
          return f.startsWith('villains.') && 
                 f.endsWith('.json') && 
                 f !== 'villains.json';
        }
        // Custom pattern matching
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(f);
      })
      .map(f => path.join(this.dataDir, f));
    
    return files;
  }

  /**
   * Load datasets from files
   */
  private loadDatasets(files: string[]): SerializedProcessedData[] {
    const datasets: SerializedProcessedData[] = [];
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const data = JSON.parse(content);
        datasets.push(data);
        console.log(`  ✓ Loaded ${path.basename(file)}`);
      } catch (error) {
        console.error(`  ✗ Failed to load ${path.basename(file)}:`, error);
      }
    }
    
    return datasets;
  }

  /**
   * Merge series-specific datasets into combined output
   * 
   * @param options - Merge configuration options
   */
  async run(options: MergeOptions = {}): Promise<SerializedProcessedData> {
    this.ensureDataDir();

    const pattern = options.inputsPattern || 'villains.*.json';
    const outputPath = options.outputPath || path.join(this.dataDir, 'villains.json');
    const d3ConfigPath = path.join(this.dataDir, 'd3-config.json');

    console.log(`🔀 Merging series datasets...`);
    console.log(`   Pattern: ${pattern}`);
    console.log(`   Source directory: ${this.dataDir}`);

    // Get series files
    const files = this.getSeriesFiles(pattern);

    if (files.length === 0) {
      throw new Error(`No series files found matching pattern: ${pattern}`);
    }

    console.log(`   Found ${files.length} series file(s):`);

    // Load datasets
    const datasets = this.loadDatasets(files);

    if (datasets.length === 0) {
      throw new Error('No valid datasets loaded');
    }

    // Merge datasets using existing merge logic
    console.log(`⚙️  Merging ${datasets.length} dataset(s)...`);
    const mergedResult = mergeDatasets(datasets);

    // Create combined output structure with proper type conversions
    const combined: SerializedProcessedData = {
      series: 'Combined',
      processedAt: new Date().toISOString(),
      stats: {
        totalVillains: mergedResult.stats.totalVillains,
        mostFrequent: mergedResult.stats.mostFrequent,
        mostFrequentCount: mergedResult.stats.mostFrequentCount,
        averageFrequency: mergedResult.stats.averageFrequency
      },
      villains: mergedResult.villains.map(v => ({
        id: v.id,
        name: v.name,
        aliases: v.aliases || [],
        url: v.url,
        imageUrl: v.imageUrl,
        identitySource: (v.url ? 'url' : 'name') as 'url' | 'name',
        firstAppearance: v.firstAppearance,
        appearances: v.appearances,
        frequency: v.frequency
      })),
      timeline: mergedResult.timeline.map(t => ({
        issue: t.issue,
        releaseDate: t.releaseDate,
        chronologicalPlacementHint: t.chronologicalPlacementHint,
        villainCount: t.villainCount || 0,
        villains: t.villains || [],
        villainUrls: t.villainUrls || [],
        villainIds: mergedResult.villains
          .filter(v => (t.villains || []).includes(v.name))
          .map(v => v.id),
        series: t.series,
        chronologicalPosition: t.chronologicalPosition,
        groups: t.groups
      })),
      groups: mergedResult.groups
    };

    // Save merged villains data
    fs.writeFileSync(outputPath, JSON.stringify(combined, null, 2));
    console.log(`✓ Saved merged data to ${outputPath}`);

    // Generate D3 config from combined data
    console.log('📊 Generating combined D3 config...');
    try {
      const builder = new D3ConfigBuilder();
      builder.buildAndSaveFromCombined(outputPath, d3ConfigPath);
      console.log(`✓ Saved combined D3 config to ${d3ConfigPath}`);
    } catch (error) {
      console.error('⚠️  Warning: Failed to generate D3 config from merged data:', error);
    }

    return combined;
  }
}
