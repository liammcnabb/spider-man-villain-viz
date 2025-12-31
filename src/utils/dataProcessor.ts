/**
 * Data processing and normalization for Spider-Man villain data
 * 
 * Handles deduplication, normalization, and structuring of villain information.
 */

import type {
  IssueData,
  ProcessedVillain,
  TimelineData,
  VillainStats,
  ProcessedData,
  RawVillainData
} from '../types';

/**
 * Normalizes villain names to canonical form
 * 
 * Handles:
 * - Trimming whitespace
 * - Removing alias information in parentheses
 * - Standardizing capitalization
 * 
 * @param name - Raw villain name
 * @returns Normalized villain name
 */
export function normalizeVillainName(name: string): string {
  // Trim whitespace
  let normalized = name.trim();
  
  // Remove alias information in parentheses
  // e.g., "Green Goblin (Norman Osborn)" → "Green Goblin"
  normalized = normalized.replace(/\([^)]*\)/g, '').trim();
  
  // Remove trailing punctuation
  normalized = normalized.replace(/[,;:\.]+$/, '').trim();
  
  // Standardize spacing (remove multiple spaces)
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized;
}

/**
 * Generates unique ID from villain name
 * 
 * @param name - Villain name
 * @returns URL-friendly ID
 */
export function generateVillainId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Processes raw scraped data into normalized, structured format
 * 
 * @param rawData - Data directly from scraper
 * @returns Processed data with stats and timeline
 */
export function processVillainData(
  rawData: RawVillainData
): ProcessedData {
  // Validate input
  if (!rawData || !Array.isArray(rawData.issues)) {
    throw new Error('Invalid raw data format');
  }

  // Build villain index
  const villainMap = new Map<string, ProcessedVillain>();
  
  for (const issue of rawData.issues) {
    for (const rawName of issue.antagonists) {
      if (!rawName || rawName.trim().length === 0) {
        continue; // Skip empty names
      }

      const normalized = normalizeVillainName(rawName);
      
      if (normalized.length === 0) {
        continue; // Skip names that become empty after normalization
      }

      if (!villainMap.has(normalized)) {
        // New villain
        villainMap.set(normalized, {
          id: generateVillainId(normalized),
          names: [normalized],
          firstAppearance: issue.issueNumber,
          appearances: [issue.issueNumber],
          frequency: 1
        });
      } else {
        // Existing villain
        const villain = villainMap.get(normalized)!;
        if (!villain.appearances.includes(issue.issueNumber)) {
          villain.appearances.push(issue.issueNumber);
          villain.frequency++;
        }
      }
    }
  }

  // Sort appearances chronologically
  for (const villain of villainMap.values()) {
    villain.appearances.sort((a, b) => a - b);
  }

  // Generate timeline
  const timeline = generateTimeline(
    rawData.issues,
    villainMap
  );

  // Generate statistics
  const stats = generateStats(villainMap, rawData.issues);

  return {
    series: rawData.series,
    processedAt: new Date().toISOString(),
    villains: Array.from(villainMap.values()),
    timeline,
    stats
  };
}

/**
 * Generates timeline of villain appearances by issue
 * 
 * @param issues - Original issue data
 * @param villainMap - Normalized villain map
 * @returns Timeline array
 */
function generateTimeline(
  issues: IssueData[],
  villainMap: Map<string, ProcessedVillain>
): TimelineData[] {
  return issues.map(issue => {
    // Find villains for this issue
    const villainsInIssue: ProcessedVillain[] = [];
    
    for (const villain of villainMap.values()) {
      if (villain.appearances.includes(issue.issueNumber)) {
        villainsInIssue.push(villain);
      }
    }

    return {
      issue: issue.issueNumber,
      villains: villainsInIssue,
      villainCount: villainsInIssue.length
    };
  });
}

/**
 * Generates statistics from processed villain data
 * 
 * @param villainMap - Normalized villain map
 * @param originalIssues - Original issue data
 * @returns Statistics object
 */
function generateStats(
  villainMap: Map<string, ProcessedVillain>,
  originalIssues: IssueData[]
): VillainStats {
  const villainArray = Array.from(villainMap.values());
  
  // Find most frequent
  const mostFrequent = villainArray.length > 0 
    ? villainArray.reduce((prev, current) =>
        (current.frequency > prev.frequency) ? current : prev
      )
    : { id: '', names: [], frequency: 0, firstAppearance: 0, appearances: [] };

  // Calculate average
  const averageFrequency = villainArray.length > 0
    ? villainArray.reduce((sum, v) => sum + v.frequency, 0) / villainArray.length
    : 0;

  // Build first appearances map
  const firstAppearances = new Map<number, string[]>();
  for (const villain of villainArray) {
    const issue = villain.firstAppearance;
    if (!firstAppearances.has(issue)) {
      firstAppearances.set(issue, []);
    }
    firstAppearances.get(issue)!.push(villain.names[0]);
  }

  return {
    totalVillains: villainArray.length,
    mostFrequent,
    averageFrequency,
    firstAppearances
  };
}

/**
 * Exports processed data as JSON-serializable object
 * 
 * @param data - Processed data
 * @returns JSON-compatible object
 */
export function serializeProcessedData(
  data: ProcessedData
): object {
  return {
    series: data.series,
    processedAt: data.processedAt,
    stats: {
      totalVillains: data.stats.totalVillains,
      mostFrequent: data.stats.mostFrequent.names[0],
      mostFrequentCount: data.stats.mostFrequent.frequency,
      averageFrequency: Math.round(
        data.stats.averageFrequency * 100
      ) / 100
    },
    villains: data.villains.map(v => ({
      id: v.id,
      name: v.names[0],
      aliases: v.names.slice(1),
      firstAppearance: v.firstAppearance,
      appearances: v.appearances,
      frequency: v.frequency
    })),
    timeline: data.timeline.map(t => ({
      issue: t.issue,
      villainCount: t.villainCount,
      villains: t.villains.map(v => v.names[0])
    }))
  };
}
