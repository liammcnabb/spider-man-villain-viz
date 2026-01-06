/**
 * Type definitions for Spider-Man Villain Timeline project
 */

export type EntityKind = 'individual' | 'group';

export interface Antagonist {
  name: string;
  url?: string; // Marvel Fandom URL to uniquely identify character
  kind?: EntityKind; // Optional classification; defaults to 'individual' if omitted
}

export interface IssueData {
  issueNumber: number;
  title: string;
  publicationDate?: string;
  antagonists: Antagonist[];
}

export interface ProcessedVillain {
  id: string;
  name: string; // Primary name (most frequently used alias)
  names: string[]; // All name variants/aliases
  url?: string; // Canonical Marvel Fandom URL
  firstAppearance: number;
  appearances: number[];
  frequency: number;
  kind?: EntityKind; // Present for compatibility; should be 'individual'
}

export interface TimelineData {
  issue: number;
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
