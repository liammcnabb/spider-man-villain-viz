/**
 * Group Registry
 *
 * Manages a curated list of known groups and their aliases, ensuring deterministic
 * and auditable group classification. This registry is the single source of truth
 * for what constitutes a "group" vs an "individual".
 *
 * Design:
 * - Groups are registered with canonical names, aliases, and a unique ID
 * - All lookups are case-insensitive and normalize whitespace
 * - Maintains an audit trail of all registrations and lookups for debugging
 * - Singleton pattern to ensure consistency across the application
 */

export interface GroupRegistryEntry {
  /**
   * Unique ID for the group (used in data output)
   * Generated from canonical name: lowercase, replace spaces/punctuation with hyphens
   */
  id: string;

  /**
   * Canonical name of the group (the "true" name)
   */
  canonicalName: string;

  /**
   * Alternative names/aliases that should map to this canonical group
   */
  aliases: string[];

  /**
   * Optional URL to the group's wiki page
   */
  url?: string;

  /**
   * Human-readable description or notes about this group
   */
  description?: string;

  // No roster constraints: groups are recognized by name/alias only

  /**
   * When this entry was added to the registry
   */
  registeredAt: Date;
}

export interface AuditEntry {
  /**
   * Timestamp of the audit event
   */
  timestamp: Date;

  /**
   * Type of event: 'lookup', 'register', 'resolve'
   */
  eventType: 'lookup' | 'register' | 'resolve';

  /**
   * Input name that was looked up or registered
   */
  inputName: string;

  /**
   * Result of the operation (canonical name or 'not_found')
   */
  result: string;

  /**
   * Optional reason or additional context
   */
  context?: string;
}

/**
 * GroupRegistry: Singleton registry for group identification and aliasing
 */
export class GroupRegistry {
  private static instance: GroupRegistry;

  /**
   * Map of normalized names (lowercase, trimmed) to GroupRegistryEntry
   */
  private groupMap: Map<string, GroupRegistryEntry> = new Map();

  /**
   * Audit log for all lookups and registrations
   */
  private auditLog: AuditEntry[] = [];

  /**
   * Flag to enable/disable audit logging (for performance)
   */
  private auditEnabled: boolean = true;

  private constructor() {
    this.initializeDefaultGroups();
  }

  /**
   * Get the singleton instance of GroupRegistry
   */
  static getInstance(): GroupRegistry {
    if (!GroupRegistry.instance) {
      GroupRegistry.instance = new GroupRegistry();
    }
    return GroupRegistry.instance;
  }

  /**
   * Initialize with default/known groups
   */
  private initializeDefaultGroups(): void {
    // Core villain teams from Spider-Man canon
    this.registerGroup(
      'Sinister Six',
      'sinister-six',
      ['Sinister Six', 'The Sinister Six', 'Sinister 6'],
      'https://marvel.fandom.com/wiki/Sinister_Six'
    );

    this.registerGroup(
      'Enforcers',
      'enforcers',
      ['Enforcers', 'The Enforcers'],
      'https://marvel.fandom.com/wiki/Enforcers_(Earth-616)'
    );

    this.registerGroup(
      'Masters of Evil',
      'masters-of-evil',
      ['Masters of Evil', 'The Masters of Evil'],
      'https://marvel.fandom.com/wiki/Masters_of_Evil'
    );

    this.registerGroup(
      'Emissaries of Evil',
      'emissaries-of-evil',
      ['Emissaries of Evil', 'The Emissaries of Evil'],
      'https://marvel.fandom.com/wiki/Emissaries_of_Evil'
    );

    this.registerGroup(
      'Nasty Boys',
      'nasty-boys',
      ['Nasty Boys', 'The Nasty Boys'],
      'https://marvel.fandom.com/wiki/Nasty_Boys'
    );

    this.registerGroup(
      "Kingpin's Henchmen",
      'kingpin-henchmen',
      [
        "Kingpin's Henchmen",
        "Kingpin's Men",
        'Kingpin Henchmen',
        'Kingpin Minions'
      ],
      'https://marvel.fandom.com/wiki/Kingpin_(Wilson_Fisk)'
    );

    this.registerGroup(
      'Maggia',
      'maggia',
      ['Maggia', 'The Maggia', 'Maggia Family'],
      'https://marvel.fandom.com/wiki/Maggia'
    );

    this.registerGroup(
      'The Syndicate',
      'the-syndicate',
      ['The Syndicate', 'Syndicate'],
      'https://marvel.fandom.com/wiki/The_Syndicate'
    );

    this.registerGroup(
      'Wild Pack',
      'wild-pack',
      ['Wild Pack', 'The Wild Pack'],
      'https://marvel.fandom.com/wiki/Wild_Pack'
    );

    this.registerGroup(
      'Thieves Guild',
      'thieves-guild',
      ['Thieves Guild', 'The Thieves Guild'],
      'https://marvel.fandom.com/wiki/Thieves_Guild'
    );

    this.registerGroup(
      'Hydra',
      'hydra',
      ['Hydra', 'HYDRA'],
      'https://marvel.fandom.com/wiki/HYDRA'
    );

    this.registerGroup(
      'AIM',
      'aim',
      ['AIM', 'A.I.M.', 'Advanced Idea Mechanics'],
      'https://marvel.fandom.com/wiki/Advanced_Idea_Mechanics'
    );

    this.registerGroup(
      'Roxxon Security',
      'roxxon-security',
      ['Roxxon Security', 'Roxxon Guard'],
      'https://marvel.fandom.com/wiki/Roxxon_Corporation'
    );

    this.registerGroup(
      'Hammerhead Gang',
      'hammerhead-gang',
      ['Hammerhead Gang', "Hammerhead's Gang", 'Hammerhead Crew'],
      'https://marvel.fandom.com/wiki/Hammerhead_(Marvel)'
    );

    this.registerGroup(
      'Scorpion Gang',
      'scorpion-gang',
      ['Scorpion Gang', 'Scorpion Crew'],
      'https://marvel.fandom.com/wiki/Scorpion_(Marvel)'
    );

    this.registerGroup(
      'Savage Land Mutates',
      'savage-land-mutates',
      ['Savage Land Mutates', 'The Savage Land Mutates'],
      'https://marvel.fandom.com/wiki/Savage_Land_Mutates'
    );

    this.registerGroup(
      'Circus of Crime',
      'circus-of-crime',
      ['Circus of Crime', 'The Circus of Crime'],
      'https://marvel.fandom.com/wiki/Circus_of_Crime'
    );

    // Suppress initial audit entries from default initialization
    this.auditLog = [];
  }

  /**
   * Register a new group with its canonical name and aliases
   */
  registerGroup(
    canonicalName: string,
    id: string,
    aliases: string[],
    url?: string,
    description?: string
  ): void {
    const entry: GroupRegistryEntry = {
      id,
      canonicalName,
      aliases,
      url,
      description,
      registeredAt: new Date()
    };

    // Store under canonical name
    const normalizedCanonical = this.normalize(canonicalName);
    this.groupMap.set(normalizedCanonical, entry);

    // Store under each alias
    for (const alias of aliases) {
      const normalizedAlias = this.normalize(alias);
      this.groupMap.set(normalizedAlias, entry);
    }

    if (this.auditEnabled) {
      this.auditLog.push({
        timestamp: new Date(),
        eventType: 'register',
        inputName: canonicalName,
        result: id,
        context: `Registered ${aliases.length} aliases`
      });
    }
  }

  /**
   * Look up a group by name, returning its canonical name and ID if found
   * Returns null if the name is not recognized as a group
   */
  resolveGroup(name: string): { id: string; canonicalName: string } | null {
    const normalized = this.normalize(name);
    const entry = this.groupMap.get(normalized);

    if (this.auditEnabled) {
      this.auditLog.push({
        timestamp: new Date(),
        eventType: 'lookup',
        inputName: name,
        result: entry ? entry.id : 'not_found'
      });
    }

    return entry ? { id: entry.id, canonicalName: entry.canonicalName } : null;
  }

  /**
   * Check if a name is registered as a group
   */
  isKnownGroup(name: string): boolean {
    const normalized = this.normalize(name);
    return this.groupMap.has(normalized);
  }

  /**
   * Get the canonical name for a group (or the input name if not a known group)
   */
  getCanonicalName(name: string): string {
    const resolution = this.resolveGroup(name);
    return resolution ? resolution.canonicalName : name;
  }

  /**
   * Get a group entry by name (returns full entry details)
   */
  getGroupEntry(name: string): GroupRegistryEntry | null {
    const normalized = this.normalize(name);
    return this.groupMap.get(normalized) || null;
  }

  /**
   * List all registered groups (canonical names only)
   */
  getAllGroups(): GroupRegistryEntry[] {
    const seen = new Set<string>();
    const result: GroupRegistryEntry[] = [];

    for (const entry of this.groupMap.values()) {
      if (!seen.has(entry.id)) {
        seen.add(entry.id);
        result.push(entry);
      }
    }

    return result;
  }

  /**
   * Get the audit log (optionally filtered by event type)
   */
  getAuditLog(eventType?: 'lookup' | 'register' | 'resolve'): AuditEntry[] {
    return eventType
      ? this.auditLog.filter(entry => entry.eventType === eventType)
      : this.auditLog;
  }

  /**
   * Clear the audit log (useful for testing)
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Enable or disable audit logging
   */
  setAuditEnabled(enabled: boolean): void {
    this.auditEnabled = enabled;
  }

  /**
   * Normalize a name for consistent lookup:
   * - Trim whitespace
   * - Convert to lowercase
   * - Collapse multiple spaces to single space
   */
  private normalize(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Reset registry to default state (for testing)
   */
  reset(): void {
    this.groupMap.clear();
    this.auditLog = [];
    this.initializeDefaultGroups();
  }
}

export default GroupRegistry;
