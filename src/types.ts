/**
 * Type definitions for Spider-Man Villain Timeline project
 */

export type EntityKind = 'individual' | 'group';

export interface Antagonist {
  name: string;
  url?: string; // Marvel Fandom URL to uniquely identify character
  imageUrl?: string; // Character portrait/image from Marvel Fandom
  kind?: EntityKind; // Optional classification; defaults to 'individual' if omitted
}

export interface IssueData {
  issueNumber: number;
  title: string;
  publicationDate?: string;
  releaseDate?: string; // Publication date from Marvel Fandom for chronology
  chronologicalPlacementHint?: string; // e.g., "between Amazing Spider-Man #6 and #7"
  antagonists: Antagonist[];
}

/**
 * Identity Policy:
 * - Entities keyed by URL (when available) vs name (fallback) remain separate historically
 * - No retroactive reconciliation: name-only entities from early issues stay distinct
 *   from URL-identified entities added in later issues, even if names match
 * - identitySource tracks the basis of identity for transparency
 */
export interface ProcessedVillain {
  id: string;
  name: string; // Primary name (most frequently used alias)
  names: string[]; // All name variants/aliases
  url?: string; // Canonical Marvel Fandom URL
  imageUrl?: string; // Character portrait/image from Marvel Fandom
  identitySource: 'url' | 'name'; // Basis of entity identity: URL-keyed or name-keyed
  firstAppearance: number;
  appearances: number[];
  frequency: number;
  kind?: EntityKind; // Present for compatibility; should be 'individual'
}

export interface TimelineData {
  issue: number;
  releaseDate?: string; // Publication date for chronology
  series?: string; // Series name for multi-series timelines
  chronologicalPosition?: number; // Position when sorted by release date
  chronologicalPlacementHint?: string; // e.g., "between Amazing Spider-Man Vol 1 #6 and #7"
  villains: ProcessedVillain[];
  villainCount: number;
  groups?: GroupAppearance[]; // Optional: group appearances for this issue
}

export interface VillainStats {
  totalVillains: number;
  mostFrequent: ProcessedVillain;
  averageFrequency: number;
  firstAppearances: Map<number, string[]>;
}

export interface D3DataPoint {
  issueNumber: number;
  chronologicalPosition?: number;
  series?: string;
  releaseDate?: string;
  villainsInIssue: string[];
  villainCount: number;
}

export interface D3Config {
  data: D3DataPoint[];
  scales: {
    x: D3Scale;
    y: D3Scale;
  };
  colors: Map<string, string>;
}

export interface D3Scale {
  domain: (number | undefined)[];
  range: number[];
}

export interface RawVillainData {
  series: string;
  baseUrl: string;
  issues: IssueData[];
}

export interface ProcessedData {
  series: string;
  processedAt: string;
  villains: ProcessedVillain[];
  timeline: TimelineData[];
  stats: VillainStats;
  groups?: ProcessedGroup[]; // Optional summary of groups across timeline
}

/**
 * Group-related types
 */
export interface GroupAppearance {
  id: string;
  name: string;
  url?: string;
  issue: number;
  members: string[]; // Names of individual antagonists present when the group appears
}

export interface ProcessedGroup {
  id: string;
  name: string;
  url?: string;
  appearances: number[];
  frequency: number;
}

/**
 * Type for serialized processed data output
 * Represents the JSON structure written to files by serializeProcessedData()
 */
export interface SerializedProcessedData {
  series: string;
  processedAt: string;
  stats: {
    totalVillains: number;
    mostFrequent: string;
    mostFrequentCount: number;
    averageFrequency: number;
  };
  villains: Array<{
    id: string;
    name: string;
    aliases: string[];
    url?: string;
    imageUrl?: string;
    identitySource: 'url' | 'name';
    firstAppearance: number;
    appearances: number[];
    frequency: number;
  }>;
  timeline: Array<{
    issue: number;
    releaseDate?: string;
    chronologicalPlacementHint?: string;
    villainCount: number;
    villains: string[];
    villainUrls: (string | undefined)[];
    villainIds: string[];
    series?: string;
    chronologicalPosition?: number;
    groups?: Array<{ name: string; members: string[] }>;
  }>;
  groups?: Array<{
    id: string;
    name: string;
    url?: string;
    appearances: number[];
    frequency: number;
  }>;
}
