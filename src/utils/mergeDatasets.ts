/**
 * Dataset merging and processing logic
 * 
 * Separates the data transformation logic from scraping/IO operations.
 * This allows processing of existing JSON files without re-scraping.
 */

export interface SerializedVillain {
  id: string;
  name: string;
  aliases?: string[];
  url?: string;
  imageUrl?: string;
  firstAppearance: number;
  firstAppearanceSeries?: string;
  appearances: number[];
  frequency: number;
}

export interface SerializedGroup {
  id: string;
  name: string;
  url?: string;
  appearances: number[];
  frequency: number;
}

export interface TimelineEntry {
  issue: number;
  releaseDate?: string;
  series?: string;
  villains?: string[];
  villainUrls?: string[];
  villainCount?: number;
  chronologicalPosition?: number;
  chronologicalPlacementHint?: string; // e.g., "between Amazing Spider-Man Vol 1 #6 and #7"
  groups?: any[];
}

export interface MergedDataset {
  villains: SerializedVillain[];
  groups: SerializedGroup[];
  timeline: TimelineEntry[];
  stats: {
    totalVillains: number;
    mostFrequent: string;
    mostFrequentCount: number;
    averageFrequency: number;
  };
}

/**
 * Applies chronological placement hints to adjust issue ordering
 * 
 * Issues with hints like "between Amazing Spider-Man Vol 1 #6 and #7" will be
 * positioned appropriately between those issues, overriding release date sorting.
 * 
 * @param timeline - Timeline sorted by release date
 * @returns Timeline with placement hints applied
 */
function applyChronologicalPlacementHints(timeline: TimelineEntry[]): TimelineEntry[] {
  // Separate entries with and without placement hints
  const withHints: TimelineEntry[] = [];
  const withoutHints: TimelineEntry[] = [];
  
  for (const entry of timeline) {
    if (entry.chronologicalPlacementHint) {
      withHints.push(entry);
    } else {
      withoutHints.push(entry);
    }
  }
  
  // If no hints, return original timeline
  if (withHints.length === 0) {
    return timeline;
  }
  
  // Build result starting with entries without hints
  const result: TimelineEntry[] = [...withoutHints];
  
  // Process each entry with a placement hint
  for (const hintEntry of withHints) {
    const hint = hintEntry.chronologicalPlacementHint!;
    
    // Parse hint: "between [Series] #X and #Y"
    const betweenPattern = /between\s+(.+?)\s*#(\d+)\s+and\s+#?(\d+)/i;
    const match = hint.match(betweenPattern);
    
    if (match) {
      const targetSeries = match[1].trim();
      const issue1 = parseInt(match[2], 10);
      const issue2 = parseInt(match[3], 10);
      
      // Find positions of issue1 and issue2 in result array
      let pos1 = -1;
      let pos2 = -1;
      
      for (let i = 0; i < result.length; i++) {
        const entry = result[i];
        // Normalize series names for comparison
        const entrySeries = (entry.series || '').toLowerCase();
        const hintSeries = targetSeries.toLowerCase();
        
        // Strategy: Try exact match first, then substring match
        // Remove version numbers and common suffixes for matching
        const normalizedEntry = entrySeries
          .replace(/vol\s+\d+/gi, '')
          .replace(/\(\d+\)/g, '')
          .trim();
        const normalizedTarget = hintSeries
          .replace(/vol\s+\d+/gi, '')
          .replace(/\(\d+\)/g, '')
          .trim();
        
        // Only match if the hint series description matches the entry series
        // e.g., "Amazing Spider-Man" should match "Amazing Spider-Man Vol 1" 
        // but NOT match "Amazing Spider-Man Annual Vol 1"
        const seriesMatch = 
          // Exact match (after normalization)
          normalizedEntry === normalizedTarget ||
          // Prefix match for specific patterns
          (normalizedEntry.startsWith(normalizedTarget + ' ') && !normalizedEntry.includes('annual'));
        
        if (seriesMatch) {
          if (entry.issue === issue1) {
            pos1 = i;
          }
          if (entry.issue === issue2) {
            pos2 = i;
          }
        }
      }
      
      // Insert between the two issues if we found both
      if (pos1 >= 0 && pos2 >= 0) {
        const insertPos = Math.max(pos1, pos2); // Insert after the first issue
        result.splice(insertPos, 0, hintEntry);
      } else if (pos1 >= 0) {
        // If we only found issue1, insert right after it
        result.splice(pos1 + 1, 0, hintEntry);
      } else if (pos2 >= 0) {
        // If we only found issue2, insert before it
        result.splice(pos2, 0, hintEntry);
      } else {
        // If we can't find either target issue, append at the end
        console.warn(
          `Could not find placement targets for hint: "${hint}" (series: ${hintEntry.series}, issue: ${hintEntry.issue}). Appending at end.`
        );
        result.push(hintEntry);
      }
    } else {
      // Couldn't parse hint, append at the end
      console.warn(
        `Could not parse chronological placement hint: "${hint}" (series: ${hintEntry.series}, issue: ${hintEntry.issue})`
      );
      result.push(hintEntry);
    }
  }
  
  return result;
}

/**
 * Merges multiple series datasets into a single combined dataset
 * Uses URL-based deduplication to properly handle multiple mantles of the same villain
 * 
 * @param datasets - Array of series data objects
 * @returns Merged and processed dataset
 */
export function mergeDatasets(datasets: any[]): MergedDataset {
  const villainMap = new Map<string, SerializedVillain>();
  const groupMap = new Map<string, SerializedGroup>();

  // Merge villains using URL-based deduplication
  for (const ds of datasets) {
    const villains: SerializedVillain[] = Array.isArray(ds?.villains) ? ds.villains : [];
    for (const v of villains) {
      const key = v.url || v.id;
      if (!villainMap.has(key)) {
        villainMap.set(key, {
          id: v.id,
          name: v.name,
          aliases: [...(v.aliases || [])],
          url: v.url,
          imageUrl: v.imageUrl,
          firstAppearance: v.firstAppearance,
          firstAppearanceSeries: undefined,
          appearances: [...(v.appearances || [])],
          frequency: 0
        });
      } else {
        const cur = villainMap.get(key)!;
        // Preserve imageUrl if this entry has one and current doesn't
        if (v.imageUrl && !cur.imageUrl) {
          cur.imageUrl = v.imageUrl;
        }
        const aliasSet = new Set([...(cur.aliases || []), ...(v.aliases || [])]);
        cur.aliases = Array.from(aliasSet);
        const appearSet = new Set([...(cur.appearances || []), ...(v.appearances || [])]);
        cur.appearances = Array.from(appearSet).sort((a, b) => a - b);
      }
    }

    const groups: SerializedGroup[] = Array.isArray(ds?.groups) ? ds.groups : [];
    for (const g of groups) {
      const gkey = g.name || g.id;
      if (!groupMap.has(gkey)) {
        groupMap.set(gkey, {
          id: g.id,
          name: g.name,
          url: g.url,
          appearances: [...(g.appearances || [])],
          frequency: 0
        });
      } else {
        const curg = groupMap.get(gkey)!;
        const appearSet = new Set([...(curg.appearances || []), ...(g.appearances || [])]);
        curg.appearances = Array.from(appearSet).sort((a, b) => a - b);
      }
    }
  }

  // Recalculate frequencies after merge
  for (const v of villainMap.values()) {
    v.frequency = (v.appearances || []).length;
  }
  for (const g of groupMap.values()) {
    g.frequency = (g.appearances || []).length;
  }

  // Merge timelines chronologically
  const allTimelines: TimelineEntry[] = [];
  for (const ds of datasets) {
    const timeline: TimelineEntry[] = Array.isArray(ds?.timeline) ? ds.timeline : [];
    const seriesName = ds?.series || 'Unknown';
    for (const entry of timeline) {
      allTimelines.push({
        ...entry,
        series: seriesName
      });
    }
  }

  // Sort by release date (chronological order) - initial sort
  const sortedTimeline = allTimelines.sort((a, b) => {
    if (!a.releaseDate && !b.releaseDate) return 0;
    if (!a.releaseDate) return 1;
    if (!b.releaseDate) return -1;
    return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
  });

  // Process chronological placement hints to adjust ordering
  // Issues with placement hints like "between X #6 and #7" should be inserted
  // at the appropriate position, not just sorted by release date
  const finalTimeline = applyChronologicalPlacementHints(sortedTimeline);

  // Add chronological position to each entry
  finalTimeline.forEach((entry, index) => {
    entry.chronologicalPosition = index + 1;
  });

  const combinedVillains = Array.from(villainMap.values());

  // Compute firstAppearance/series using URL-based matching
  // This ensures each villain mantle (identified by URL) gets only its own appearances
  for (const vill of combinedVillains) {
    const villainUrl = vill.url;

    const chronologicalAppearances: number[] = [];
    let earliestIssue: number | undefined;
    let earliestSeries: string | undefined;

    for (const entry of finalTimeline) {
      const entryVillainUrls: string[] = Array.isArray((entry as any).villainUrls) ? (entry as any).villainUrls : [];
      // Match by URL to properly attribute appearances to the correct villain mantle
      const isMatch = villainUrl && entryVillainUrls.includes(villainUrl);
      
      if (isMatch) {
        chronologicalAppearances.push(entry.issue);
        if (earliestIssue === undefined) {
          earliestIssue = entry.issue;
          earliestSeries = entry.series;
        }
      }
    }

    if (chronologicalAppearances.length > 0) {
      vill.appearances = chronologicalAppearances;
      vill.frequency = chronologicalAppearances.length;
    }

    if (earliestIssue !== undefined) {
      vill.firstAppearance = earliestIssue;
      vill.firstAppearanceSeries = earliestSeries;
    } else {
      const minIssue = (vill.appearances && vill.appearances.length > 0)
        ? Math.min(...vill.appearances)
        : vill.firstAppearance;
      vill.firstAppearance = minIssue;
    }
  }

  const combinedGroups = Array.from(groupMap.values());

  // Calculate stats
  const mostFrequent = combinedVillains.reduce(
    (prev, curr) => (curr.frequency > prev.frequency ? curr : prev),
    { id: '', name: '', aliases: [], url: undefined, firstAppearance: 0, appearances: [], frequency: 0 } as any
  );
  const averageFrequency = combinedVillains.length > 0
    ? combinedVillains.reduce((sum, v) => sum + v.frequency, 0) / combinedVillains.length
    : 0;

  return {
    villains: combinedVillains,
    groups: combinedGroups,
    timeline: finalTimeline,
    stats: {
      totalVillains: combinedVillains.length,
      mostFrequent: mostFrequent.name,
      mostFrequentCount: mostFrequent.frequency,
      averageFrequency: Math.round(averageFrequency * 100) / 100
    }
  };
}
