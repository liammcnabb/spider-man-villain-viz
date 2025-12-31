/**
 * D3.js visualization configuration and data transformation
 */

import type { ProcessedData, D3DataPoint, D3Config } from '../types';

/**
 * Color palette for villain nodes
 * Generated from a perceptually uniform color scheme
 */
const COLOR_PALETTE = [
  '#e74c3c', // Red
  '#3498db', // Blue
  '#2ecc71', // Green
  '#f39c12', // Orange
  '#9b59b6', // Purple
  '#1abc9c', // Turquoise
  '#e67e22', // Dark Orange
  '#34495e', // Dark Gray
  '#16a085', // Dark Turquoise
  '#d35400', // Pumpkin
  '#c0392b', // Dark Red
  '#8e44ad', // Dark Purple
  '#27ae60', // Dark Green
  '#2980b9', // Dark Blue
  '#f1c40f'  // Yellow
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
  const maxIssue = Math.max(...d3Data.map(d => d.issueNumber));
  const maxVillains = Math.max(...d3Data.map(d => d.villainCount));

  const margin = { top: 20, right: 20, bottom: 30, left: 60 };

  return {
    data: d3Data,
    scales: {
      x: {
        domain: [1, maxIssue],
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

  // Build path
  const pathSegments = data.map(d =>
    `${scaleX(d.issueNumber)},${scaleY(d.villainCount)}`
  );

  return `M ${pathSegments.join(' L ')}`;
}
