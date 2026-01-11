/**
 * Unified D3.js configuration builder
 * 
 * Consolidates D3 config generation logic for both per-series and combined datasets.
 * Provides a single, well-typed interface for building D3 visualization configs.
 */

import * as fs from 'fs';
import type { ProcessedData, D3DataPoint, D3Config } from '../types';
import type { SerializedProcessedData } from '../types';
import { getSeriesColor } from '../utils/seriesName';

/**
 * Tier 1 Color Palette for Villain Nodes
 * Based on PalettAilor methodology - optimized for perceptual discriminability
 * Supports 40 major villains with maximum visual distinction
 * - Point Distinctness: CIEDE2000 ΔE ≥ 10
 * - Name Difference: Avoids similar color names
 * - Color Discrimination: Maximizes inter-class distance
 */
const COLOR_PALETTE = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#16a085', '#d35400', '#c0392b',
  '#8e44ad', '#27ae60', '#2980b9', '#f1c40f', '#34495e',
  '#e84393', '#00b894', '#0984e3', '#6c5ce7', '#fdcb6e',
  '#d63031', '#00cec9', '#fd79a8', '#a29bfe', '#ffeaa7',
  '#2d3436', '#fab1a0', '#ff7675', '#74b9ff', '#55efc4',
  '#81ecec', '#dfe6e9', '#b2bec3', '#636e72', '#ff6b6b',
  '#4ecdc4', '#45b7d1', '#f9ca24', '#eb3b5a', '#fa8231'
];

/**
 * D3 visualization configuration builder
 * 
 * Provides unified interface for building D3 configs from ProcessedData.
 * Handles both per-series and combined dataset configurations.
 */
export class D3ConfigBuilder {
  private width: number;
  private height: number;
  private margin: { top: number; right: number; bottom: number; left: number };

  /**
   * Creates a new D3ConfigBuilder instance
   * 
   * @param width - SVG width in pixels (default: 1200)
   * @param height - SVG height in pixels (default: 600)
   */
  constructor(width: number = 1200, height: number = 600) {
    this.width = width;
    this.height = height;
    this.margin = { top: 20, right: 20, bottom: 30, left: 60 };
  }

  /**
   * Generates color for villain based on name hash
   * Ensures consistent color assignment across visualization sessions
   * 
   * @param villainName - Name of the villain
   * @returns Hex color code
   */
  private getVillainColor(villainName: string): string {
    // Simple hash function to get consistent color for each villain
    let hash = 0;
    for (let i = 0; i < villainName.length; i++) {
      hash = ((hash << 5) - hash) + villainName.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    const colorIndex = Math.abs(hash) % COLOR_PALETTE.length;
    return COLOR_PALETTE[colorIndex];
  }

  /**
   * Transforms processed villain data for D3.js visualization
   * Extracts key fields needed for timeline rendering
   * 
   * @param data - Processed data from data processor
   * @returns Array of D3 data points
   */
  private formatDataForD3(data: ProcessedData): D3DataPoint[] {
    return data.timeline.map(timelineItem => ({
      issueNumber: timelineItem.issue,
      chronologicalPosition: timelineItem.chronologicalPosition,
      series: timelineItem.series,
      releaseDate: timelineItem.releaseDate,
      villainsInIssue: timelineItem.villains.map(v => v.names[0]),
      villainCount: timelineItem.villainCount
    }));
  }

  /**
   * Builds D3 configuration object from processed villain data
   * 
   * @param data - Processed villain data
   * @returns D3 configuration object with data, scales, and color mappings
   */
  build(data: ProcessedData): D3Config {
    const d3Data = this.formatDataForD3(data);
    
    // Build color map for all villains
    const colorMap = new Map<string, string>();
    for (const villain of data.villains) {
      const color = this.getVillainColor(villain.names[0]);
      colorMap.set(villain.names[0], color);
    }

    // Calculate scale domains
    // If chronologicalPosition exists, use it; otherwise fall back to issueNumber
    const hasChronological = d3Data.some(d => d.chronologicalPosition !== undefined);
    const maxX = hasChronological 
      ? Math.max(...d3Data.map(d => d.chronologicalPosition!))
      : Math.max(...d3Data.map(d => d.issueNumber));
    const maxVillains = Math.max(...d3Data.map(d => d.villainCount));

    return {
      data: d3Data,
      scales: {
        x: {
          domain: [1, maxX],
          range: [this.margin.left, this.width - this.margin.right]
        },
        y: {
          domain: [0, maxVillains],
          range: [this.height - this.margin.bottom, this.margin.top]
        }
      },
      colors: colorMap
    };
  }

  /**
   * Exports D3 configuration as JSON-serializable object
   * 
   * @param config - D3 configuration object
   * @returns JSON-serializable object suitable for file output
   */
  exportAsJSON(config: D3Config): object {
    return {
      data: config.data,
      scales: {
        x: {
          domain: config.scales.x.domain,
          range: config.scales.x.range
        },
        y: {
          domain: config.scales.y.domain,
          range: config.scales.y.range
        }
      },
      colors: Object.fromEntries(config.colors)
    };
  }

  /**
   * Generates SVG path command for line chart
   * 
   * @param data - D3 data points
   * @param xScale - X-axis scale
   * @param yScale - Y-axis scale
   * @returns SVG path string
   */
  generateLinePath(
    data: D3DataPoint[],
    xScale: { domain: number[]; range: number[] },
    yScale: { domain: number[]; range: number[] }
  ): string {
    const { domain: xDomain, range: xRange } = xScale;
    const { domain: yDomain, range: yRange } = yScale;

    // Create linear scaling functions
    const scaleX = (val: number): number => {
      const [minD, maxD] = xDomain as [number, number];
      const [minR, maxR] = xRange;
      return minR + ((val - minD) / (maxD - minD)) * (maxR - minR);
    };

    const scaleY = (val: number): number => {
      const [minD, maxD] = yDomain as [number, number];
      const [maxR, minR] = yRange; // Note: reversed for SVG coordinates
      return minR + ((val - minD) / (maxD - minD)) * (maxR - minR);
    };

    // Build path - use chronologicalPosition if available, otherwise issueNumber
    const pathSegments = data.map(d => {
      const xValue = d.chronologicalPosition !== undefined ? d.chronologicalPosition : d.issueNumber;
      return `${scaleX(xValue)},${scaleY(d.villainCount)}`;
    });

    return `M ${pathSegments.join(' L ')}`;
  }

  /**
   * Builds D3 config from combined (merged) serialized data
   * Used when working with already-merged villains.json files
   * For combined data, includes both villain colors and series color map for UI
   * 
   * @param combinedData - Serialized combined dataset
   * @returns D3 configuration object
   */
  buildFromSerializedData(combinedData: SerializedProcessedData): object {
    if (!Array.isArray(combinedData.timeline)) {
      throw new Error('No timeline found in combined data');
    }

    // Create D3 data points from serialized timeline
    const d3Data = combinedData.timeline.map((entry) => ({
      issueNumber: entry.issue,
      chronologicalPosition: entry.chronologicalPosition,
      series: entry.series,
      releaseDate: entry.releaseDate,
      villainsInIssue: Array.isArray(entry.villains) ? entry.villains : [],
      villainCount: entry.villainCount || (Array.isArray(entry.villains) ? entry.villains.length : 0)
    }));

    // Build color map for all villains
    const colorMap: Record<string, string> = {};
    if (Array.isArray(combinedData.villains)) {
      for (const villain of combinedData.villains) {
        // Use default color for combined data
        colorMap[villain.name] = '#e74c3c';
      }
    }

    // Series color map for UI visualization - extract unique series from timeline data
    const uniqueSeries = new Set<string>();
    for (const entry of d3Data) {
      if (entry.series) {
        uniqueSeries.add(entry.series);
      }
    }
    const seriesColorMap: Record<string, string> = {};
    for (const series of uniqueSeries) {
      seriesColorMap[series] = getSeriesColor(series);
    }

    // Calculate max villain count for y-scale
    const maxVillainCount = Math.max(...d3Data.map(d => d.villainCount || 0), 1);

    // Generate D3 config with series color map for UI
    return {
      data: d3Data,
      scales: {
        x: {
          domain: [1, d3Data.length],
          range: [this.margin.left, this.width - this.margin.right]
        },
        y: {
          domain: [0, maxVillainCount],
          range: [this.height - this.margin.bottom, this.margin.top]
        }
      },
      colors: colorMap,
      seriesColors: seriesColorMap
    };
  }

  /**
   * Generates D3 config from combined data file and saves to output path
   * Convenience method for file I/O operations
   * 
   * @param combinedJsonPath - Path to combined villains.json file
   * @param outputPath - Path to write D3 config JSON file
   */
  buildAndSaveFromCombined(combinedJsonPath: string, outputPath: string): void {
    try {
      const content = fs.readFileSync(combinedJsonPath, 'utf-8');
      const data = JSON.parse(content) as SerializedProcessedData;

      const d3Config = this.buildFromSerializedData(data);

      fs.writeFileSync(outputPath, JSON.stringify(d3Config, null, 2));
      console.log(`✓ Generated D3 config with ${(d3Config as any).data.length} data points`);
    } catch (error) {
      console.error('Error generating D3 config from combined data:', error);
      throw error;
    }
  }

}

/**
 * Histogram data point for new villains per year
 */
export interface HistogramDataPoint {
  year: number;
  count: number;
  villains: string[];
}

/**
 * Generates histogram data showing new villain debuts per year
 * 
 * @param data - Processed villain data with timeline
 * @returns Array of histogram data points grouped by year
 */
export function generateNewVillainsPerYear(
  data: ProcessedData
): HistogramDataPoint[] {
  // Map to track first appearance of each villain (by ID)
  const villainFirstAppearance = new Map<string, { year: number; name: string }>();
  
  // Build lookup of villain IDs to their first appearance year
  for (const villain of data.villains) {
    // Find the timeline entry for this villain's first appearance
    // Need to match the issue number AND the series (if specified)
    const firstIssue = data.timeline.find(t => {
      // Check if this issue contains the villain (by checking villain objects)
      const hasVillain = t.villains.some(v => v.id === villain.id);
      if (!hasVillain) {
        return false;
      }
      
      // Match issue number (firstAppearance is within the villain's series)
      return t.issue === villain.firstAppearance && 
             (!t.series || t.series === data.series || t.series === 'Combined');
    });
    
    if (firstIssue && firstIssue.releaseDate) {
      // Parse year from release date (format: "Month DD, YYYY")
      const yearMatch = firstIssue.releaseDate.match(/\d{4}$/);
      if (yearMatch) {
        const year = parseInt(yearMatch[0], 10);
        villainFirstAppearance.set(villain.id, {
          year,
          name: villain.name
        });
      }
    }
  }
  
  // Group by year
  const yearMap = new Map<number, string[]>();
  
  for (const [_, info] of villainFirstAppearance) {
    if (!yearMap.has(info.year)) {
      yearMap.set(info.year, []);
    }
    yearMap.get(info.year)!.push(info.name);
  }
  
  // Convert to array and sort by year
  const histogram: HistogramDataPoint[] = [];
  for (const [year, villains] of yearMap) {
    histogram.push({
      year,
      count: villains.length,
      villains: villains.sort()
    });
  }
  
  return histogram.sort((a, b) => a.year - b.year);
}
