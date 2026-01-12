/**
 * Appearance Metadata Extraction Utility
 * 
 * Extracts metadata from parenthetical notes in character listings
 * Examples: "(First appearance)", "(dies)", "(Appears in flashback)"
 */

import type { AppearanceMetadata } from '../types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Metadata patterns to match (case-insensitive)
 * Priority patterns are extracted first
 */
const METADATA_PATTERNS: Array<{
  field: keyof AppearanceMetadata;
  patterns: RegExp[];
  priority: 'HIGH' | 'MEDIUM';
}> = [
  {
    field: 'firstAppearance',
    patterns: [/\bfirst appearance\b(?!\s+chronologically)/i, /\bdebut\b/i, /\b1st appearance\b/i],
    priority: 'HIGH'
  },
  {
    field: 'firstAppearanceChronological',
    patterns: [/\bfirst appearance chronologically\b/i],
    priority: 'HIGH'
  },
  {
    field: 'death',
    patterns: [/\bdies\b/i, /\bkilled\b/i, /\bdeath\b/i, /\bdeceased\b/i],
    priority: 'HIGH'
  },
  {
    field: 'finalAppearance',
    patterns: [/\bfinal appearance\b/i, /\blast appearance\b/i, /\blast seen\b/i],
    priority: 'HIGH'
  },
  {
    field: 'mentionedOnly',
    patterns: [/\bmentioned\s+only\b/i, /\bmentioned\b/i, /\breferenced\b/i],
    priority: 'MEDIUM'
  },
  {
    field: 'behindTheScenes',
    patterns: [/\bbehind the scenes\b/i, /\boff-panel\b/i, /\boff-screen\b/i],
    priority: 'MEDIUM'
  },
  {
    field: 'flashback',
    patterns: [/\bflashback\b/i, /\bin flashback\b/i, /\bappears in flashback\b/i],
    priority: 'MEDIUM'
  },
  {
    field: 'cameo',
    patterns: [/\bcameo\b/i, /\bcameo appearance\b/i],
    priority: 'MEDIUM'
  },
  {
    field: 'voiceOnly',
    patterns: [/\bvoice only\b/i, /\bvoice\b/i, /\bheard only\b/i],
    priority: 'MEDIUM'
  }
];

/**
 * Extracts parenthetical content from character listing text
 * Example: "Lucky Lobo ⏵ (First appearance) (Destroyed)" → ["First appearance", "Destroyed"]
 * 
 * @param fullText - Full character listing text including name and metadata
 * @returns Array of parenthetical content strings
 */
function extractParentheticals(fullText: string): string[] {
  const parentheticals: string[] = [];
  const regex = /\(([^)]+)\)/g;
  let match;
  
  while ((match = regex.exec(fullText)) !== null) {
    const content = match[1].trim();
    if (content.length > 0) {
      parentheticals.push(content);
    }
  }
  
  return parentheticals;
}

/**
 * Extracts appearance metadata from character listing text
 * 
 * @param fullText - Full character listing text (including name and parentheticals)
 * @param _characterName - Character name for logging purposes (unused but kept for API compatibility)
 * @returns Object with metadata and uncaptured strings
 */
export function extractAppearanceMetadata(
  fullText: string,
  _characterName: string,
  labels?: string[]
): { metadata: AppearanceMetadata; uncaptured: string[] } {
  // Prefer explicit green_text labels when available
  if (labels && labels.length > 0) {
    return extractAppearanceMetadataFromLabels(labels);
  }

  // Fallback: legacy parenthetical parsing
  const metadata: AppearanceMetadata = {};
  const parentheticals = extractParentheticals(fullText);
  const uncaptured: string[] = [];

  if (parentheticals.length > 0) {
    metadata.rawMetadata = parentheticals;
  }

  for (const parenthetical of parentheticals) {
    let matched = false;
    for (const { field, patterns } of METADATA_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(parenthetical)) {
          (metadata as any)[field] = true;
          matched = true;
        }
      }
    }
    if (!matched) {
      uncaptured.push(parenthetical);
    }
  }

  if (uncaptured.length > 0) {
    metadata.uncategorized = uncaptured;
  }

  return { metadata, uncaptured };
}

/**
 * Extracts appearance metadata from explicit label spans (e.g., elements with class 'green_text')
 * This avoids misclassifying parenthetical real names or descriptors as metadata.
 */
export function extractAppearanceMetadataFromLabels(labels: string[]): { metadata: AppearanceMetadata; uncaptured: string[] } {
  const metadata: AppearanceMetadata = {};
  const uncaptured: string[] = [];

  // Normalize labels (trim and lowercase for matching)
  const normalized = labels
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (normalized.length > 0) {
    metadata.rawMetadata = normalized;
  }

  for (const label of normalized) {
    const lower = label.toLowerCase();

    // High-priority signals
    if (/(^|\b)first appearance(?!\s+chronologically)\b/.test(lower) || /\bdebut\b/.test(lower)) {
      metadata.firstAppearance = true;
      continue;
    }
    if (/first appearance chronologically/.test(lower)) {
      metadata.firstAppearanceChronological = true;
      continue;
    }
    if (/(^|\b)dies\b|\bkilled\b|\bdeath\b|\bdeceased\b/.test(lower)) {
      metadata.death = true;
      continue;
    }
    if (/final appearance|last appearance|last seen/.test(lower)) {
      metadata.finalAppearance = true;
      continue;
    }

    // Medium-priority/other
    if (/mentioned only|\bmentioned\b|\breferenced\b/.test(lower)) {
      metadata.mentionedOnly = true;
      continue;
    }
    if (/behind the scenes|off-panel|off-screen/.test(lower)) {
      metadata.behindTheScenes = true;
      continue;
    }
    if (/flashback|appears in flashback/.test(lower)) {
      metadata.flashback = true;
      continue;
    }
    if (/\bcameo\b/.test(lower)) {
      metadata.cameo = true;
      continue;
    }
    if (/voice only|\bvoice\b|heard only/.test(lower)) {
      metadata.voiceOnly = true;
      continue;
    }

    // Unknown label captured for later analysis
    uncaptured.push(label);
  }

  if (uncaptured.length > 0) {
    metadata.uncategorized = uncaptured;
  }

  return { metadata, uncaptured };
}

/**
 * Logs uncaptured metadata to a file for review and future enhancement
 * 
 * @param issueNumber - Issue number where metadata was found
 * @param characterName - Character name
 * @param uncaptured - Array of uncaptured metadata strings
 */
export function logUncapturedMetadata(
  issueNumber: number,
  characterName: string,
  uncaptured: string[]
): void {
  if (uncaptured.length === 0) return;
  
  const logDir = path.join(process.cwd(), 'logs');
  const logFile = path.join(logDir, 'uncaptured-metadata.json');
  
  // Ensure logs directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // Load existing log or create new
  let logData: Array<{
    issueNumber: number;
    characterName: string;
    uncaptured: string[];
    timestamp: string;
  }> = [];
  
  if (fs.existsSync(logFile)) {
    try {
      const content = fs.readFileSync(logFile, 'utf-8');
      logData = JSON.parse(content);
    } catch (error) {
      console.warn(`Failed to read uncaptured metadata log: ${error}`);
    }
  }
  
  // Add new entry
  logData.push({
    issueNumber,
    characterName,
    uncaptured,
    timestamp: new Date().toISOString()
  });
  
  // Write back to file
  try {
    fs.writeFileSync(logFile, JSON.stringify(logData, null, 2), 'utf-8');
  } catch (error) {
    console.warn(`Failed to write uncaptured metadata log: ${error}`);
  }
}
