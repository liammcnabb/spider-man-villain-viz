/**
 * Type definitions for Spider-Man Villain Timeline project
 */

export interface IssueData {
  issueNumber: number;
  title: string;
  publicationDate?: string;
  antagonists: string[];
}

export interface ProcessedVillain {
  id: string;
  names: string[];
  firstAppearance: number;
  appearances: number[];
  frequency: number;
}

export interface TimelineData {
  issue: number;
  villains: ProcessedVillain[];
  villainCount: number;
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
}
