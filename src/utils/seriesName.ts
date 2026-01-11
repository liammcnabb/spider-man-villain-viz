/**
 * SeriesName - Utility for handling series name format inconsistencies
 * 
 * Handles conversion between different series name formats:
 * - Display format: "Amazing Spider-Man Vol 1" (spaces, human-readable)
 * - Slug format: "Amazing_Spider-Man_Vol_1" (underscores, for filenames/URLs)
 * 
 * Ensures consistent comparison and formatting across the codebase.
 */

export class SeriesName {
  private readonly canonical: string; // Normalized internal representation (display format)

  /**
   * Creates a SeriesName from any format (spaces or underscores)
   * 
   * @param name - Series name in any format
   */
  constructor(name: string) {
    this.canonical = SeriesName.normalize(name);
  }

  /**
   * Normalizes a series name to canonical format (display format with spaces)
   * 
   * @param name - Series name to normalize
   * @returns Normalized series name with spaces
   */
  static normalize(name: string): string {
    if (!name) return '';
    
    // Replace underscores with spaces, collapse multiple spaces
    return name
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Gets the display format (human-readable with spaces)
   * 
   * @returns Display format: "Amazing Spider-Man Vol 1"
   */
  toDisplay(): string {
    return this.canonical;
  }

  /**
   * Gets the slug format (for filenames and URLs with underscores)
   * 
   * @returns Slug format: "Amazing_Spider-Man_Vol_1"
   */
  toSlug(): string {
    return this.canonical.replace(/\s+/g, '_');
  }

  /**
   * Gets the canonical format (same as display)
   * 
   * @returns Canonical format with spaces
   */
  toString(): string {
    return this.canonical;
  }

  /**
   * Checks equality with another series name (format-agnostic)
   * 
   * @param other - Series name to compare (string or SeriesName)
   * @returns True if names match after normalization
   */
  equals(other: string | SeriesName): boolean {
    const otherNormalized = other instanceof SeriesName 
      ? other.canonical 
      : SeriesName.normalize(other);
    
    return this.canonical.toLowerCase() === otherNormalized.toLowerCase();
  }

  /**
   * Checks if this series name matches any in a list
   * 
   * @param names - List of series names to check against
   * @returns True if any name matches
   */
  matchesAny(names: Array<string | SeriesName>): boolean {
    return names.some(name => this.equals(name));
  }

  /**
   * Static method to check if two series names match (format-agnostic)
   * 
   * @param name1 - First series name
   * @param name2 - Second series name
   * @returns True if names match after normalization
   */
  static areEqual(name1: string, name2: string): boolean {
    return SeriesName.normalize(name1).toLowerCase() === 
           SeriesName.normalize(name2).toLowerCase();
  }

  /**
   * Creates a SeriesName from a file path
   * Extracts series name from patterns like "villains.Amazing_Spider-Man_Vol_1.json"
   * 
   * @param filePath - File path containing series name
   * @returns SeriesName instance or null if no match found
   */
  static fromFilePath(filePath: string): SeriesName | null {
    // Match patterns like: villains.{SeriesName}.json or raw.{SeriesName}.json
    const match = filePath.match(/(?:villains|raw|d3-config)\.([^.]+)\.json/);
    if (match && match[1]) {
      return new SeriesName(match[1]);
    }
    return null;
  }

  /**
   * Gets a list of all supported series (canonical display format)
   * 
   * @returns Array of SeriesName instances for all supported series
   */
  static getSupportedSeries(): SeriesName[] {
    return [
      new SeriesName('Amazing Spider-Man Vol 1'),
      new SeriesName('Amazing Spider-Man Annual Vol 1'),
      new SeriesName('Untold Tales of Spider-Man Vol 1'),
      new SeriesName('Peter Parker, The Spectacular Spider-Man Vol 1'),
      new SeriesName('Web of Spider-Man Vol 1'),
      new SeriesName('Spider-Man Vol 1'),
      new SeriesName('Sensational Spider-Man Vol 1'),
      new SeriesName('Spider-Man Unlimited Vol 1')
    ];
  }

  /**
   * Checks if a series name is supported
   * 
   * @param name - Series name to check
   * @returns True if series is supported
   */
  static isSupported(name: string): boolean {
    const seriesName = new SeriesName(name);
    return SeriesName.getSupportedSeries().some(s => s.equals(seriesName));
  }
}

/**
 * Series color mapping (supports both formats)
 */
export const SERIES_COLORS: Record<string, string> = {
  'Amazing Spider-Man Vol 1': '#e74c3c',
  'Amazing_Spider-Man_Vol_1': '#e74c3c',
  'Amazing Spider-Man Annual Vol 1': '#9b59b6',
  'Amazing_Spider-Man_Annual_Vol_1': '#9b59b6',
  'Untold Tales of Spider-Man Vol 1': '#3498db',
  'Untold_Tales_of_Spider-Man_Vol_1': '#3498db',
  'Peter Parker, The Spectacular Spider-Man Vol 1': '#e67e22',
  'Peter_Parker,_The_Spectacular_Spider-Man_Vol_1': '#e67e22',
  'Web of Spider-Man Vol 1': '#1abc9c',
  'Web_of_Spider-Man_Vol_1': '#1abc9c',
  'Spider-Man Vol 1': '#2ecc71',
  'Spider-Man_Vol_1': '#2ecc71',
  'Sensational Spider-Man Vol 1': '#f1c40f',
  'Sensational_Spider-Man_Vol_1': '#f1c40f',
  'Spider-Man Unlimited Vol 1': '#8e44ad',
  'Spider-Man_Unlimited_Vol_1': '#8e44ad'
};

/**
 * Gets color for a series (format-agnostic)
 * 
 * @param seriesName - Series name in any format
 * @returns Hex color code or default gray
 */
export function getSeriesColor(seriesName: string): string {
  const series = new SeriesName(seriesName);
  
  // Try both display and slug formats
  return SERIES_COLORS[series.toDisplay()] 
      || SERIES_COLORS[series.toSlug()] 
      || '#999';
}
