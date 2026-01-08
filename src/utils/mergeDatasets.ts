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
          firstAppearance: v.firstAppearance,
          firstAppearanceSeries: undefined,
          appearances: [...(v.appearances || [])],
          frequency: 0
        });
      } else {
        const cur = villainMap.get(key)!;
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

  // Sort by release date (chronological order)
  const sortedTimeline = allTimelines.sort((a, b) => {
    if (!a.releaseDate && !b.releaseDate) return 0;
    if (!a.releaseDate) return 1;
    if (!b.releaseDate) return -1;
    return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
  });

  // Add chronological position to each entry
  sortedTimeline.forEach((entry, index) => {
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

    for (const entry of sortedTimeline) {
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
    timeline: sortedTimeline,
    stats: {
      totalVillains: combinedVillains.length,
      mostFrequent: mostFrequent.name,
      mostFrequentCount: mostFrequent.frequency,
      averageFrequency: Math.round(averageFrequency * 100) / 100
    }
  };
}
