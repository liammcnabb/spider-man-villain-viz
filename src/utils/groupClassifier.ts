/**
 * Group classifier utility
 *
 * Identifies antagonist names that denote a group/team rather than an individual.
 *
 * Design:
 * - Uses GroupRegistry as the single source of truth for known groups
 * - Falls back to keyword-pattern matching for dynamic/unknown groups
 * - Maintains deterministic and auditable classification
 * - Supports logging for debugging and verification
 */

import { GroupRegistry } from './groupRegistry';

export interface GroupClassifierConfig {
  explicitGroups: string[]; // Exact names that are known groups (legacy, now from registry)
  keywordPatterns: RegExp[]; // Patterns that imply a group name
}

/**
 * Fallback keyword patterns for groups not in the registry.
 * This is a safety net for dynamic or newly encountered group names.
 */
const FALLBACK_PATTERNS: RegExp[] = [
  /\bHenchmen\b/i,
  /\bGang\b/i,
  /\bCrew\b/i,
  /\bSquad\b/i,
  /\bSyndicate\b/i,
  /\bEnforcers\b/i,
  /\bSix\b/i, // Common in team names like Sinister Six
  /\bTeam\b/i,
  /\bBrigade\b/i,
  /\bGuard\b/i,
  /\bForce\b/i,
  /\bThieves\b/i,
  /\bAssociation\b/i,
  /\bSociety\b/i,
  /\bLeague\b/i,
  /\bAlliance\b/i,
  /\bThugs\b/i,
  /\bMercenaries\b/i,
  /\bSoldiers\b/i,
  /\bMinions\b/i
];

/**
 * Default config (legacy support)
 */
const DEFAULT_CONFIG: GroupClassifierConfig = {
  explicitGroups: [],
  keywordPatterns: FALLBACK_PATTERNS
};

/**
 * Normalize a name for comparison
 */
function normalize(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Check if a name is "unknown" or unnamed (should be filtered out)
 */
function isUnknownOrUnnamed(name: string): boolean {
  const n = normalize(name).toLowerCase();
  return (
    n === 'unknown' ||
    n === 'unnamed' ||
    n.startsWith('unknown ') ||
    n.startsWith('unnamed ') ||
    n === '?'
  );
}

/**
 * Returns true if the provided antagonist name is a group/team.
 * First checks the GroupRegistry, then falls back to keyword pattern matching.
 *
 * @param name - Antagonist name
 * @param config - Optional classifier configuration (legacy parameter, mostly unused now)
 * @returns true if name is identified as a group
 */
export function isGroupName(name: string, _config: GroupClassifierConfig = DEFAULT_CONFIG): boolean {
  const n = normalize(name);
  
  // Reject unknown/unnamed entities - these should be filtered out entirely
  if (isUnknownOrUnnamed(n)) {
    return false;  // Not a group (not identifiable at all)
  }
  
  const registry = GroupRegistry.getInstance();

  // Check GroupRegistry first (primary source of truth)
  if (registry.isKnownGroup(n)) {
    return true;
  }

  // Fallback: check keyword patterns for dynamic/unknown groups
  return FALLBACK_PATTERNS.some(p => p.test(n));
}

/**
 * Classify to entity kind based on name, with audit trail.
 * Returns 'group' if the name matches a known group or group pattern,
 * otherwise returns 'individual'.
 *
 * @param name - Antagonist name
 * @returns 'group' or 'individual'
 */
export function classifyKind(name: string): 'individual' | 'group' {
  return isGroupName(name) ? 'group' : 'individual';
}

/**
 * Resolve a group name to its canonical form and ID from the registry.
 * Returns null if the name is not a known group.
 *
 * @param name - Antagonist name
 * @returns Object with id and canonicalName, or null if not found
 */
export function resolveGroupCanonical(
  name: string
): { id: string; canonicalName: string } | null {
  const registry = GroupRegistry.getInstance();
  return registry.resolveGroup(name);
}

/**
 * Get all known groups from the registry
 */
export function getRegisteredGroups() {
  const registry = GroupRegistry.getInstance();
  return registry.getAllGroups();
}
