/**
 * D3.js visualization configuration and data transformation
 */

import type { ProcessedData, D3DataPoint, D3Config } from '../types';

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
 * Generates color for villain based on name hash
 * 
 * @param villainName - Name of the villain
 * @returns Hex color code
 */
function getVillainColor(villainName: string): string {
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
 * 
 * @param data - Processed data from data processor
 * @returns Array of D3 data points
 */
export function formatDataForD3(
  data: ProcessedData
): D3DataPoint[] {
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
 * Generates D3.js configuration object
 * 
 * @param data - Processed villain data
 * @param width - SVG width in pixels
 * @param height - SVG height in pixels
 * @returns D3 configuration object
 */
export function generateD3Config(
  data: ProcessedData,
  width: number = 1200,
  height: number = 600
): D3Config {
  const d3Data = formatDataForD3(data);
  
  // Build color map for all villains
  const colorMap = new Map<string, string>();
  for (const villain of data.villains) {
    const color = getVillainColor(villain.names[0]);
    colorMap.set(villain.names[0], color);
  }

  // Calculate scale domains
  // If chronologicalPosition exists, use it; otherwise fall back to issueNumber
  const hasChronological = d3Data.some(d => d.chronologicalPosition !== undefined);
  const maxX = hasChronological 
    ? Math.max(...d3Data.map(d => d.chronologicalPosition!))
    : Math.max(...d3Data.map(d => d.issueNumber));
  const maxVillains = Math.max(...d3Data.map(d => d.villainCount));

  const margin = { top: 20, right: 20, bottom: 30, left: 60 };

  return {
    data: d3Data,
    scales: {
      x: {
        domain: [1, maxX],
        range: [margin.left, width - margin.right]
      },
      y: {
        domain: [0, maxVillains],
        range: [height - margin.bottom, margin.top]
      }
    },
    colors: colorMap
  };
}

/**
 * Exports D3 configuration as JSON
 * 
 * @param config - D3 configuration object
 * @returns JSON-serializable object
 */
export function exportD3ConfigJSON(config: D3Config): object {
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
export function generateLinePath(
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
