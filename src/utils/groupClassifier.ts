/**
 * Group classifier utility
 *
 * Identifies antagonist names that denote a group/team rather than an individual.
 * Heuristics rely on explicit names and keyword patterns. This avoids extra scraping.
 *
 * The list is intentionally conservative to prevent false positives.
 */

export interface GroupClassifierConfig {
  explicitGroups: string[]; // Exact names that are known groups
  keywordPatterns: RegExp[]; // Patterns that imply a group name
}

const DEFAULT_CONFIG: GroupClassifierConfig = {
  explicitGroups: [
    'Sinister Six',
    'Enforcers',
    "Kingpin's Henchmen",
    'Maggia',
    'The Syndicate',
    'Wild Pack',
    'Maggia Enforcers',
    'Thieves Guild',
    'Hydra',
    'AIM',
    'Roxxon Security',
    'Hammerhead Gang',
    'Scorpion Gang'
  ],
  keywordPatterns: [
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
    /\bForce\b/i
  ]
};

/**
 * Normalize a name for comparison
 */
function normalize(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Returns true if the provided antagonist name is a group/team.
 *
 * @param name - Antagonist name
 * @param config - Optional classifier configuration
 */
export function isGroupName(name: string, config: GroupClassifierConfig = DEFAULT_CONFIG): boolean {
  const n = normalize(name);

  if (config.explicitGroups.some(g => g.toLowerCase() === n.toLowerCase())) {
    return true;
  }

  return config.keywordPatterns.some(p => p.test(n));
}

/**
 * Classify to entity kind based on name
 */
export function classifyKind(name: string): 'individual' | 'group' {
  return isGroupName(name) ? 'group' : 'individual';
}
