/**
 * CLI Argument Parser for Spider-Man Villain Timeline
 * 
 * Parses command-line arguments for the scrape command
 */

import { SeriesName } from './seriesName';

// Configuration constants
const DEFAULT_FALLBACK_RANGE = 20; // Default issue count for unknown volumes

export interface ScrapeOptions {
  volume: string;
  issues: number[];
  allSeries?: boolean;
}

/**
 * Parses issue specification string into an array of issue numbers
 * 
 * Supports:
 * - Single issues: "1", "5", "10"
 * - Ranges: "1-20", "50-100"
 * - Combined: "1-20,50-60,100"
 * 
 * @param issueSpec - Issue specification string
 * @returns Array of unique issue numbers, sorted
 * @throws Error if specification is invalid
 */
export function parseIssueSpec(issueSpec: string): number[] {
  const issues = new Set<number>();
  
  // Split by comma for multiple ranges/issues
  const parts = issueSpec.split(',').map(p => p.trim());
  
  for (const part of parts) {
    if (!part) continue;
    
    // Check if it's a range (e.g., "1-20")
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim());
      
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      
      if (isNaN(start) || isNaN(end)) {
        throw new Error(`Invalid range: ${part}`);
      }
      
      if (start < 1 || end < start) {
        throw new Error(`Invalid range: ${part} (start must be >= 1, end must be >= start)`);
      }
      
      // Add all issues in range
      for (let i = start; i <= end; i++) {
        issues.add(i);
      }
    } else {
      // Single issue number
      const issueNum = parseInt(part, 10);
      
      if (isNaN(issueNum)) {
        throw new Error(`Invalid issue number: ${part}`);
      }
      
      if (issueNum < 1) {
        throw new Error(`Issue number must be >= 1: ${issueNum}`);
      }
      
      issues.add(issueNum);
    }
  }
  
  if (issues.size === 0) {
    throw new Error('No valid issues specified');
  }
  
  // Convert to sorted array
  return Array.from(issues).sort((a, b) => a - b);
}

/**
 * Parses command-line arguments for the scrape command
 * 
 * Supports:
 * - --issues <spec>: Issue specification (ranges, specific issues, or both)
 * - --volume <name>: Volume name (default: "Amazing Spider-Man Vol 1")
 * 
 * @param args - Command-line arguments (process.argv)
 * @returns Parsed scrape options
 */
export function parseScrapeArgs(args: string[]): ScrapeOptions {
  const options: ScrapeOptions = {
    volume: 'Amazing Spider-Man Vol 1',
    issues: [],
    allSeries: false
  };
  
  // Find the scrape command index
  const scrapeIndex = args.findIndex(arg => arg === 'scrape');
  if (scrapeIndex === -1) {
    return options;
  }
  
  // Parse arguments after 'scrape'
  for (let i = scrapeIndex + 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--issues' || arg === '-i') {
      // Get the next argument as the issue spec
      if (i + 1 < args.length) {
        const issueSpec = args[i + 1];
        options.issues = parseIssueSpec(issueSpec);
        i++; // Skip next argument since we consumed it
      } else {
        throw new Error('--issues flag requires an argument');
      }
    } else if (arg === '--volume' || arg === '-v' || arg === '--series' || arg === '-s') {
      // Get the next argument as the volume name
      if (i + 1 < args.length) {
        options.volume = args[i + 1];
        i++; // Skip next argument since we consumed it
      } else {
        throw new Error('--volume/--series flag requires an argument');
      }
    } else if (arg === '--all-series' || arg === '-a') {
      options.allSeries = true;
    }
  }
  
  return options;
}

/**
 * Generates a default issue range for a volume
 * 
 * @param volume - Volume name (supports both space and underscore formats)
 * @returns Array of issue numbers for the volume's full range
 */
export function getDefaultIssuesForVolume(volume: string): number[] {
  // Normalize series name to handle both space and underscore formats
  const seriesName = new SeriesName(volume);
  
  const volumeRanges: { [key: string]: [number, number] } = {
    'Amazing Spider-Man Vol 1': [1, 441],
    'Amazing Spider-Man Vol 2': [1, 58],
    'Amazing Spider-Man Vol 3': [1, 20],
    'Amazing Spider-Man Vol 4': [1, 32],
    'Amazing Spider-Man Vol 5': [1, 93],
    'Untold Tales of Spider-Man Vol 1': [1, 25],
    'Amazing Spider-Man Annual Vol 1': [1, 28]
  };

  // Look up using normalized display format (with spaces)
  const range = volumeRanges[seriesName.toDisplay()];
  if (!range) {
    // Default to first N issues if volume not found
    console.warn(`Unknown volume: ${volume}, defaulting to issues 1-${DEFAULT_FALLBACK_RANGE}`);
    return Array.from({ length: DEFAULT_FALLBACK_RANGE }, (_, i) => i + 1);
  }
  
  const [start, end] = range;
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
