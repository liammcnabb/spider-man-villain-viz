/**
 * Type definitions for Spider-Man Villain Timeline project
 */

export type EntityKind = 'individual' | 'group';

/**
 * Appearance metadata extracted from parenthetical notes in character listings
 * Examples: "(First appearance)", "(dies)", "(Appears in flashback)"
 */
export interface AppearanceMetadata {
  firstAppearance?: boolean;        // "First appearance"
  firstAppearanceChronological?: boolean; // "First appearance chronologically"
  finalAppearance?: boolean;        // "Final appearance"
  death?: boolean;                  // "dies", "killed", "death"
  mentionedOnly?: boolean;          // "Mentioned only"
  behindTheScenes?: boolean;        // "Behind the scenes"
  flashback?: boolean;              // "Appears in flashback", "flashback"
  cameo?: boolean;                  // "Cameo appearance"
  voiceOnly?: boolean;              // "Voice only"
  rawMetadata?: string[];           // All parenthetical strings found
  uncategorized?: string[];         // Metadata not matching known patterns
}

export interface Antagonist {
  name: string;
  url?: string; // Marvel Fandom URL to uniquely identify character
  imageUrl?: string; // Character portrait/image from Marvel Fandom
  kind?: EntityKind; // Optional classification; defaults to 'individual' if omitted
  metadata?: AppearanceMetadata; // Appearance metadata from character listing
}

/**
 * Story arc type classification based on scope and duration
 */
export type ArcType = 'arc' | 'crossover' | 'event' | 'saga' | 'double' | 'unknown';

/**
 * Represents a story arc or saga that spans multiple issues
 * 
 * Identity Policy:
 * - url: Marvel Fandom category URL (primary key)
 * - id: Derived from URL slug (secondary identifier)
 * - name: Display name from category page
 */
export interface StoryArc {
  url: string;                   // Primary key: Marvel Fandom category URL
  id: string;                    // Derived URL-safe identifier (e.g., "clone-saga")
  name: string;                  // Display name (e.g., "Clone Saga")
  type?: ArcType;                // Classification (optional, can be inferred later)
  issues?: number[];             // Issue numbers that are part of this arc
  series?: string[];             // Series involved (for multi-series arcs)
  startIssue?: number;           // First issue (chronologically)
  endIssue?: number;             // Last issue (chronologically)
  issueCount?: number;           // Total issues in this arc
}

export interface IssueData {
  issueNumber: number;
  title: string;
  publicationDate?: string;
  releaseDate?: string; // Publication date from Marvel Fandom for chronology
  chronologicalPlacementHint?: string; // e.g., "between Amazing Spider-Man #6 and #7"
  antagonists: Antagonist[];
  storyArcs?: StoryArc[];        // Story arcs this issue belongs to
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
