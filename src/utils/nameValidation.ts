/**
 * Name validation utilities for antagonist filtering
 * 
 * Ensures consistent filtering of unnamed/unknown/invalid antagonist names
 * across all data processing layers (scraping, processing, etc.)
 */

/**
 * Checks if an antagonist name is unnamed, unidentified, or otherwise invalid
 * 
 * Filters:
 * - "unknown" (exact or prefix)
 * - "unnamed" (exact or prefix)
 * - "unidentified" (exact or prefix)
 * - "?" (single character placeholder)
 * 
 * This is applied at multiple layers:
 * 1. Scraper: Prevents unnamed entities from entering dataset
 * 2. Processor: Additional validation layer for robustness
 * 
 * @param name - Antagonist name to validate
 * @returns true if the name should be filtered (is unnamed/invalid), false if valid
 */
export function isUnnamedOrInvalidAntagonist(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return true; // Invalid input
  }

  const normalized = name.toLowerCase().trim();

  // Treat empty after trim as invalid
  if (!normalized) {
    return true;
  }

  // Check for exact matches or prefix patterns
  return (
    normalized === 'unknown' ||
    normalized === 'unnamed' ||
    normalized === 'unidentified' ||
    normalized === '?' ||
    normalized.startsWith('unknown ') ||
    normalized.startsWith('unnamed ') ||
    normalized.startsWith('unidentified ')
  );
}
