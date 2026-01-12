/**
 * Data processing and normalization for Spider-Man villain data
 * 
 * Handles deduplication, normalization, and structuring of villain information.
 * 
 * IDENTITY POLICY:
 * - Entities are keyed by URL (when available) or normalized name (fallback)
 * - NO retroactive reconciliation: entities created with name-only keys remain separate
 *   from entities created with URL keys, even if names match
 * - This preserves historical identity: early name-only appearances stay distinct from
 *   later URL-identified appearances
 * - identitySource field tracks the basis of each entity's identity ('url' or 'name')
 */

import type {
  IssueData,
  ProcessedVillain,
  TimelineData,
  VillainStats,
  ProcessedData,
  RawVillainData,
  GroupAppearance,
  ProcessedGroup,
  SerializedProcessedData
} from '../types';
// GroupRegistry no longer used for roster enforcement
import { classifyKind } from './groupClassifier';
import { isUnnamedOrInvalidAntagonist } from './nameValidation';

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
 * Extracts canonical identifier from Marvel Fandom URL
 * Removes query parameters and anchors to get clean character page URL
 * 
 * @param url - Full Marvel Fandom URL
 * @returns Canonical URL or undefined if no URL provided
 */
export function getCanonicalUrl(url?: string): string | undefined {
  if (!url) return undefined;
  
  try {
    // Remove query params and anchors
    const cleanUrl = url.split('?')[0].split('#')[0];
    return cleanUrl;
  } catch {
    return url;
  }
}

/**
 * Generates unique ID from villain name
 * 
 * @param name - Villain name
 * @returns URL-friendly ID
 */
export function generateVillainId(nameOrUrl: string): string {
  // If input is a URL, extract the slug from the end
  // e.g., https://marvel.fandom.com/wiki/Carolyn_Trainer_(Earth-616) -> Carolyn_Trainer_(Earth-616)
  if (nameOrUrl.includes('marvel.fandom.com/wiki/')) {
    const slug = nameOrUrl.split('marvel.fandom.com/wiki/')[1];
    return slug ? slug.split('?')[0].split('#')[0] : nameOrUrl; // Remove query params and anchors
  }
  
  // Fallback for non-URL inputs (backward compatibility)
  return nameOrUrl
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Selects the most prominent (frequently used) name from name frequency map
 * 
 * @param nameFrequency - Map of name variants to their usage count
 * @returns Most frequently used name
 */
function selectMostProminentName(nameFrequency: Map<string, number>): string {
  let maxCount = 0;
  let prominentName = '';
  
  for (const [name, count] of nameFrequency.entries()) {
    if (count > maxCount) {
      maxCount = count;
      prominentName = name;
    }
  }
  
  return prominentName;
}

/**
 * Processes raw scraped data into normalized, structured format
 * Uses URLs as canonical identifiers to handle villains with multiple names
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

  // Build villain index using URL as primary key, fallback to normalized name
  // Track name frequency to determine most prominent alias
  const villainMapByUrl = new Map<string, ProcessedVillain>();
  const villainMapByName = new Map<string, ProcessedVillain>();
  const nameFrequencyByKey = new Map<string, Map<string, number>>();
  const groupMapByKey = new Map<string, ProcessedGroup>();
  
  for (const issue of rawData.issues) {
    for (const antagonist of issue.antagonists) {
      const rawName: string = typeof antagonist === 'string' ? antagonist : antagonist.name;
      const url: string | undefined = typeof antagonist === 'object' ? getCanonicalUrl(antagonist.url) : undefined;
      const imageUrl: string | undefined = typeof antagonist === 'object' ? antagonist.imageUrl : undefined;
      
      if (!rawName || rawName.trim().length === 0) {
        continue; // Skip empty names
      }
      
      // Skip unnamed/unidentified/unknown antagonists (these should not be tracked)
      if (isUnnamedOrInvalidAntagonist(rawName)) {
        continue; // Skip unidentified antagonists
      }

      const normalized = normalizeVillainName(rawName);
      const kind = classifyKind(normalized);
      
      if (normalized.length === 0) {
        continue; // Skip names that become empty after normalization
      }

      // Determine key: use URL if available, otherwise use normalized name
      const key = url || normalized;
      const useUrlKey = !!url;
      // Route to group or villain map based on classification
      if (kind === 'group') {
        if (!groupMapByKey.has(key)) {
          groupMapByKey.set(key, {
            id: generateVillainId(url || normalized),
            name: normalized,
            url: url,
            appearances: [issue.issueNumber],
            frequency: 1
          });
        } else {
          const group = groupMapByKey.get(key)!;
          if (!group.appearances.includes(issue.issueNumber)) {
            group.appearances.push(issue.issueNumber);
            group.frequency++;
          }
        }
        continue; // Skip adding groups to villain maps
      }

      const map = useUrlKey ? villainMapByUrl : villainMapByName;

      if (!map.has(key)) {
        // New villain
        const nameFrequency = new Map<string, number>();
        nameFrequency.set(normalized, 1);
        nameFrequencyByKey.set(key, nameFrequency);
        
        map.set(key, {
          id: generateVillainId(url || normalized),
          name: normalized, // Will be updated to most prominent name later
          names: [normalized],
          url: url,
          imageUrl: imageUrl,
          identitySource: useUrlKey ? 'url' : 'name', // Track identity basis
          firstAppearance: issue.issueNumber,
          appearances: [issue.issueNumber],
          frequency: 1,
          kind: 'individual'
        });
      } else {
        // Existing villain - add appearance and track name variant
        const villain = map.get(key)!;
        const nameFrequency = nameFrequencyByKey.get(key)!;
        
        // Preserve imageUrl if this appearance has one and villain doesn't yet
        if (imageUrl && !villain.imageUrl) {
          villain.imageUrl = imageUrl;
        }
        
        // Track how many times this specific name variant appears
        nameFrequency.set(normalized, (nameFrequency.get(normalized) || 0) + 1);
        
        if (!villain.names.includes(normalized)) {
          villain.names.push(normalized);
        }
        if (!villain.appearances.includes(issue.issueNumber)) {
          villain.appearances.push(issue.issueNumber);
          villain.frequency++;
        }
      }
    }
  }

  // Merge both maps, prioritizing URL-based entries
  // Set most prominent name as primary name for each villain
  const allVillains = new Map<string, ProcessedVillain>();
  
  // Add all URL-based villains first
  for (const [key, villain] of villainMapByUrl) {
    const nameFrequency = nameFrequencyByKey.get(key)!;
    villain.name = selectMostProminentName(nameFrequency);
    allVillains.set(villain.id, villain);
  }
  
  // Add name-based villains (those without URLs)
  for (const [key, villain] of villainMapByName) {
    if (!allVillains.has(villain.id)) {
      const nameFrequency = nameFrequencyByKey.get(key)!;
      villain.name = selectMostProminentName(nameFrequency);
      allVillains.set(villain.id, villain);
    }
  }

  // Sort appearances chronologically
  for (const villain of allVillains.values()) {
    villain.appearances.sort((a, b) => a - b);
  }
  // Sort group appearances chronologically
  for (const group of groupMapByKey.values()) {
    group.appearances.sort((a, b) => a - b);
  }

  // Generate timeline
  const { timeline } = generateTimeline(
    rawData.issues,
    allVillains,
    groupMapByKey,
    rawData.series
  );

  // Generate statistics
  const stats = generateStats(allVillains);

  return {
    series: rawData.series,
    processedAt: new Date().toISOString(),
    villains: Array.from(allVillains.values()),
    timeline,
    stats,
    groups: Array.from(groupMapByKey.values())
  };
}

/**
 * Generates timeline of villain appearances by issue
 * 
 * @param issues - Original issue data
 * @param villainMap - Normalized villain map
 * @param groupMap - Normalized group map
 * @param seriesName - Name of the series (for series field in timeline)
 * @returns Timeline array
 */
function generateTimeline(
  issues: IssueData[],
  villainMap: Map<string, ProcessedVillain>,
  groupMap: Map<string, ProcessedGroup>,
  seriesName: string = ''
): { timeline: TimelineData[]; groupsByIssue: Map<number, GroupAppearance[]> } {
  const groupsByIssue = new Map<number, GroupAppearance[]>();

  const timeline = issues.map((issue, index) => {
    const issueNumber = issue.issueNumber;

    // Individuals in this issue (from villain map)
    const villainsInIssue: ProcessedVillain[] = [];
    for (const villain of villainMap.values()) {
      if (villain.appearances.includes(issueNumber)) {
        villainsInIssue.push(villain);
      }
    }

    // Groups in this issue, with members derived from same-issue villains only
    // CRITICAL: Members list MUST reflect only the individuals present in THIS issue,
    // not aggregated across all appearances of the group. This ensures:
    // - Issue 5: Group X has members [A, B, C]
    // - Issue 50: Group X has members [D, E, F]
    // - Each group appearance has its own distinct member list per issue
    const groupAppearances: GroupAppearance[] = [];
    for (const group of groupMap.values()) {
      if (group.appearances.includes(issueNumber)) {
        // Derive members from INDIVIDUAL villains present in THIS issue only
        // Exclude other groups (kind !== 'group') to prevent nested groups in member lists
        // Use the villain's names array (which includes all name variants) to ensure
        // cross-series matching works even when different series use different names
        const members = villainsInIssue
          .filter(v => v.kind === 'individual')
          .flatMap(v => v.names || [v.name]); // Include all name variants

        groupAppearances.push({
          id: group.id,
          name: group.name,
          url: group.url,
          issue: issueNumber,
          members
        });
      }
    }

    if (groupAppearances.length > 0) {
      groupsByIssue.set(issueNumber, groupAppearances);
    }

    return {
      issue: issueNumber,
      releaseDate: issue.releaseDate,
      chronologicalPlacementHint: issue.chronologicalPlacementHint,
      series: seriesName,
      chronologicalPosition: index + 1,
      villains: villainsInIssue,
      villainCount: villainsInIssue.length,
      groups: groupAppearances.length > 0 ? groupAppearances : undefined
    };
  });

  return { timeline, groupsByIssue };
}

/**
 * Generates statistics from processed villain data
 * 
 * @param villainMap - Normalized villain map
 * @returns Statistics object
 */
function generateStats(
  villainMap: Map<string, ProcessedVillain>
): VillainStats {
  const villainArray = Array.from(villainMap.values());
  
  // Find most frequent
  const mostFrequent = villainArray.length > 0 
    ? villainArray.reduce((prev, current) =>
        (current.frequency > prev.frequency) ? current : prev
      )
    : { id: '', name: '', names: [], identitySource: 'name' as const, frequency: 0, firstAppearance: 0, appearances: [] };

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
    firstAppearances.get(issue)!.push(villain.name);
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
): SerializedProcessedData {
  return {
    series: data.series,
    processedAt: data.processedAt,
    stats: {
      totalVillains: data.stats.totalVillains,
      mostFrequent: data.stats.mostFrequent.name,
      mostFrequentCount: data.stats.mostFrequent.frequency,
      averageFrequency: Math.round(
        data.stats.averageFrequency * 100
      ) / 100
    },
    villains: data.villains.map(v => ({
      id: v.id,
      name: v.name,
      aliases: v.names.filter(n => n !== v.name), // Exclude primary name from aliases
      url: v.url,
      imageUrl: v.imageUrl,
      identitySource: v.identitySource,
      firstAppearance: v.firstAppearance,
      appearances: v.appearances,
      frequency: v.frequency
    })),
    timeline: data.timeline.map(t => ({
      issue: t.issue,
      releaseDate: t.releaseDate,
      chronologicalPlacementHint: t.chronologicalPlacementHint,
      villainCount: t.villainCount,
      villains: t.villains.map(v => v.name),
      villainUrls: t.villains.map(v => v.url), // Track villain URLs for proper mantle identification during merge
      villainIds: t.villains.map(v => v.id),
      series: t.series,
      chronologicalPosition: t.chronologicalPosition,
      groups: t.groups?.map(g => ({ name: g.name, members: g.members }))
    })),
    groups: data.groups?.map(g => ({
      id: g.id,
      name: g.name,
      url: g.url,
      appearances: g.appearances,
      frequency: g.frequency
    }))
  };
}
