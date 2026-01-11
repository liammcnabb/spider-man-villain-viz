/**
 * D3.js visualization configuration and data transformation
 * 
 * This module provides backward-compatible exports of D3 config functions
 * for code that directly imports from d3Graph. New code should use D3ConfigBuilder.
 */

import type { ProcessedData, D3DataPoint, D3Config } from '../types';
import { D3ConfigBuilder } from './D3ConfigBuilder';

/**
 * Legacy function: Transforms processed villain data for D3.js visualization
 * Use D3ConfigBuilder for new code.
 * 
 * @deprecated Use D3ConfigBuilder.build() instead
 * @param data - Processed data from data processor
 * @returns Array of D3 data points
 */
export function formatDataForD3(
  data: ProcessedData
): D3DataPoint[] {
  const builder = new D3ConfigBuilder();
  const config = builder.build(data);
  return config.data;
}

/**
 * Legacy function: Generates D3.js configuration object
 * Use D3ConfigBuilder for new code.
 * 
 * @deprecated Use D3ConfigBuilder.build() instead
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
  const builder = new D3ConfigBuilder(width, height);
  return builder.build(data);
}

/**
 * Legacy function: Exports D3 configuration as JSON
 * Use D3ConfigBuilder for new code.
 * 
 * @deprecated Use D3ConfigBuilder.exportAsJSON() instead
 * @param config - D3 configuration object
 * @returns JSON-serializable object
 */
export function exportD3ConfigJSON(config: D3Config): object {
  const builder = new D3ConfigBuilder();
  return builder.exportAsJSON(config);
}

/**
 * Legacy function: Generates SVG path command for line chart
 * Use D3ConfigBuilder for new code.
 * 
 * @deprecated Use D3ConfigBuilder.generateLinePath() instead
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
  const builder = new D3ConfigBuilder();
  return builder.generateLinePath(data, xScale, yScale);
}
