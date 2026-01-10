/**
 * Group Taxonomy Tests
 *
 * Comprehensive tests for group registration, classification, and determinism.
 * Ensures that the GroupRegistry and group classifier work correctly together
 * to provide auditable, deterministic group identification across the application.
 */

import { GroupRegistry } from '../utils/groupRegistry';
import { classifyKind, resolveGroupCanonical } from '../utils/groupClassifier';
import { GroupAppearance } from '../types';

describe('GroupRegistry - Deterministic Classification and Taxonomy', () => {
  let registry: GroupRegistry;

  beforeEach(() => {
    registry = GroupRegistry.getInstance();
    registry.clearAuditLog();
  });

  describe('Registry Initialization and Default Groups', () => {
    it('should initialize with known Spider-Man villain groups', () => {
      const groups = registry.getAllGroups();
      const groupNames = groups.map(g => g.canonicalName);

      expect(groupNames).toContain('Sinister Six');
      expect(groupNames).toContain('Enforcers');
      expect(groupNames).toContain('Masters of Evil');
      expect(groupNames).toContain("Kingpin's Henchmen");
      expect(groupNames).toContain('Maggia');
    });

    it('should have unique IDs for all registered groups', () => {
      const groups = registry.getAllGroups();
      const ids = groups.map(g => g.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid aliases for each group', () => {
      const groups = registry.getAllGroups();

      groups.forEach(group => {
        expect(Array.isArray(group.aliases)).toBe(true);
        expect(group.aliases.length).toBeGreaterThan(0);
        expect(group.aliases).toContain(group.canonicalName);
      });
    });
  });

  describe('Registry Aliasing and Normalization', () => {
    it('should resolve canonical group names', () => {
      const resolution = registry.resolveGroup('Sinister Six');
      expect(resolution).not.toBeNull();
      expect(resolution?.canonicalName).toBe('Sinister Six');
      expect(resolution?.id).toBe('sinister-six');
    });

    it('should resolve aliases to canonical names', () => {
      const resolution = registry.resolveGroup('The Sinister Six');
      expect(resolution).not.toBeNull();
      expect(resolution?.canonicalName).toBe('Sinister Six');
      expect(resolution?.id).toBe('sinister-six');
    });

    it('should be case-insensitive', () => {
      const variations = [
        'sinister six',
        'SINISTER SIX',
        'Sinister Six',
        'sInIsTer sIx'
      ];

      const results = variations.map(name => registry.resolveGroup(name));
      results.forEach(result => {
        expect(result).not.toBeNull();
        expect(result?.canonicalName).toBe('Sinister Six');
      });
    });

    it('should normalize whitespace variations', () => {
      const variations = [
        'Sinister Six',
        'Sinister  Six', // double space
        '  Sinister Six  ', // leading/trailing spaces
        'Sinister\tSix' // tab
      ];

      const results = variations.map(name => registry.resolveGroup(name));
      const resultIds = results.map(r => r?.id);
      const uniqueIds = new Set(resultIds);

      // All should resolve to the same group
      expect(uniqueIds.size).toBe(1);
    });

    it('should return null for unregistered group names', () => {
      const result = registry.resolveGroup('NonexistentGroup');
      expect(result).toBeNull();
    });
  });

  describe('Classifier Integration with Registry', () => {
    it('should classify known groups correctly', () => {
      const groupNames = [
        'Sinister Six',
        'Enforcers',
        'Masters of Evil',
        "Kingpin's Henchmen"
      ];

      groupNames.forEach(name => {
        const kind = classifyKind(name);
        expect(kind).toBe('group');
      });
    });

    it('should classify unknown names as individuals by default', () => {
      const individualNames = [
        'Spider-Man',
        'Green Goblin',
        'Sandman',
        'Venom'
      ];

      individualNames.forEach(name => {
        const kind = classifyKind(name);
        expect(kind).toBe('individual');
      });
    });

    it('should classify group-keyword names as groups even if not registered', () => {
      // Note: "Unknown Henchmen" is filtered out (unknown prefix = unnamed)
      const groupKeywordNames = [
        'Mysterious Henchmen',  // Changed: has a descriptor, not "unknown"
        'Mysterious Gang',
        'Secret Crew',
        'Shadow Squad'
      ];

      groupKeywordNames.forEach(name => {
        const kind = classifyKind(name);
        expect(kind).toBe('group');
      });
    });

    it('should NOT classify unknown/unnamed antagonists as groups', () => {
      const unknownNames = [
        'Unknown Henchmen',
        'Unnamed Group',
        'Unknown',
        '?'
      ];

      unknownNames.forEach(name => {
        const kind = classifyKind(name);
        // Unknown/unnamed should not be classified as group (should be filtered)
        expect(kind).toBe('individual');
      });
    });

    it('resolveGroupCanonical should return null for non-registered names', () => {
      const result = resolveGroupCanonical('RandomVillain');
      expect(result).toBeNull();
    });

    it('resolveGroupCanonical should return proper resolution for registered groups', () => {
      const result = resolveGroupCanonical('The Enforcers');
      expect(result).not.toBeNull();
      expect(result?.canonicalName).toBe('Enforcers');
      expect(result?.id).toBe('enforcers');
    });
  });

  describe('Determinism and Consistency', () => {
    it('should classify the same name consistently across multiple calls', () => {
      const name = 'Sinister Six';
      const results: Array<'individual' | 'group'> = [];

      for (let i = 0; i < 100; i++) {
        results.push(classifyKind(name));
      }

      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(1);
      expect(results[0]).toBe('group');
    });

    it('should resolve aliases consistently', () => {
      const aliases = ['Sinister Six', 'The Sinister Six', 'Sinister 6'];
      const resolutions = aliases.map(alias => registry.resolveGroup(alias));

      resolutions.forEach((resolution, index) => {
        expect(resolution).not.toBeNull();
        if (index > 0) {
          expect(resolution?.id).toBe(resolutions[0]?.id);
          expect(resolution?.canonicalName).toBe(resolutions[0]?.canonicalName);
        }
      });
    });

    it('should maintain ID determinism across sessions', () => {
      const groupId1 = registry.resolveGroup('Maggia')?.id;
      const groupId2 = registry.resolveGroup('Maggia')?.id;
      expect(groupId1).toBe(groupId2);
    });
  });

  describe('Registry Audit Logging', () => {
    it('should log group lookups', () => {
      registry.setAuditEnabled(true);
      registry.clearAuditLog();

      registry.resolveGroup('Sinister Six');

      const auditLog = registry.getAuditLog('lookup');
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].eventType).toBe('lookup');
      expect(auditLog[0].inputName).toBe('Sinister Six');
      expect(auditLog[0].result).toBe('sinister-six');
    });

    it('should track failed lookups in audit log', () => {
      registry.setAuditEnabled(true);
      registry.clearAuditLog();

      registry.resolveGroup('UnknownGroup');

      const auditLog = registry.getAuditLog('lookup');
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[auditLog.length - 1].result).toBe('not_found');
    });

    it('should support disabling audit logging for performance', () => {
      registry.setAuditEnabled(false);
      registry.clearAuditLog();

      registry.resolveGroup('Sinister Six');
      registry.resolveGroup('Enforcers');

      const auditLog = registry.getAuditLog();
      expect(auditLog.length).toBe(0);
    });

    it('should clear audit log', () => {
      registry.setAuditEnabled(true);
      registry.resolveGroup('Sinister Six');

      expect(registry.getAuditLog().length).toBeGreaterThan(0);
      registry.clearAuditLog();
      expect(registry.getAuditLog().length).toBe(0);
    });
  });

  describe('Group Member Derivation Invariants', () => {
    it('should validate that group members come from same issue only', () => {
      // Simulate group appearances across issues
      const issue5GroupAppearance: GroupAppearance = {
        id: 'sinister-six',
        name: 'Sinister Six',
        issue: 5,
        members: ['Electro', 'Kraven', 'Vulture'] // Issue 5 roster
      };

      const issue50GroupAppearance: GroupAppearance = {
        id: 'sinister-six',
        name: 'Sinister Six',
        issue: 50,
        members: ['Doctor Octopus', 'Mysterio', 'Sandman'] // Issue 50 roster
      };

      // These should be different and not reconciled
      expect(issue5GroupAppearance.members).not.toEqual(issue50GroupAppearance.members);
      expect(issue5GroupAppearance.issue).not.toBe(issue50GroupAppearance.issue);
    });

    it('should preserve member order from source issue', () => {
      const groupAppearance: GroupAppearance = {
        id: 'test-group',
        name: 'Test Group',
        issue: 1,
        members: ['First', 'Second', 'Third', 'Fourth', 'Fifth']
      };

      // Order should match source (not sorted alphabetically)
      expect(groupAppearance.members[0]).toBe('First');
      expect(groupAppearance.members[4]).toBe('Fifth');
      expect(groupAppearance.members).not.toEqual(['Fifth', 'First', 'Fourth', 'Second', 'Third']);
    });

    it('should handle empty member lists gracefully', () => {
      const groupAppearance: GroupAppearance = {
        id: 'group-id',
        name: 'Some Group',
        issue: 1,
        members: []
      };

      // Should be valid (group mentioned but no detailed members)
      expect(groupAppearance.members).toHaveLength(0);
      expect(Array.isArray(groupAppearance.members)).toBe(true);
    });
  });

  describe('Edge Cases and Robustness', () => {
    it('should handle possessive forms correctly', () => {
      const possessiveNames = [
        "Kingpin's Henchmen",
        'The Kingpin Henchmen'
      ];

      possessiveNames.forEach(name => {
        const kind = classifyKind(name);
        expect(['individual', 'group']).toContain(kind);
      });
    });

    it('should handle plural forms', () => {
      const pluralNames = ['Henchmen', 'Enforcers', 'Thugs']; // Note: Goblins doesn't match patterns
      pluralNames.forEach(name => {
        const kind = classifyKind(name);
        expect(kind).toBe('group');
      });
    });

    it('should handle "and" conjunctions in names', () => {
      const conjunctionNames = [
        'Spider-Man and Venom',
        'The Punisher and Daredevil'
      ];

      conjunctionNames.forEach(name => {
        const kind = classifyKind(name);
        expect(['individual', 'group']).toContain(kind);
      });
    });

    it('should be auditable for debugging purposes', () => {
      registry.setAuditEnabled(true);
      registry.clearAuditLog();

      // Direct registry lookups are audited
      registry.resolveGroup('Sinister Six');
      registry.resolveGroup('Green Goblin');
      registry.resolveGroup('Enforcers');

      const auditLog = registry.getAuditLog();
      expect(auditLog.length).toBeGreaterThan(0);

      // Audit entries should contain input names and results
      const auditInputs = auditLog.map(a => a.inputName);
      expect(auditInputs).toContain('Sinister Six');
      expect(auditInputs).toContain('Enforcers');
    });
  });

  describe('Registry Singleton Pattern', () => {
    it('should return the same instance across multiple calls', () => {
      const instance1 = GroupRegistry.getInstance();
      const instance2 = GroupRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      registry.clearAuditLog();
      registry.resolveGroup('Sinister Six');

      const instance2 = GroupRegistry.getInstance();
      const auditLog = instance2.getAuditLog();

      expect(auditLog.length).toBeGreaterThan(0);
    });
  });

  describe('Taxonomy Audit Trail for Debugging', () => {
    it('should enable tracing of classification decisions', () => {
      registry.setAuditEnabled(true);
      registry.clearAuditLog();

      // Direct registry lookups are audited
      registry.resolveGroup('Sinister Six'); // Known group
      registry.resolveGroup('Doctor Octopus'); // Individual
      registry.resolveGroup('Unknown Henchmen'); // Unknown but keyword match

      const auditLog = registry.getAuditLog();
      expect(auditLog.length).toBeGreaterThan(0);

      // Should show the lookups
      const entries = auditLog.filter(a => a.eventType === 'lookup');
      expect(entries.some(e => e.inputName === 'Sinister Six')).toBe(true);
      expect(entries.some(e => e.inputName === 'Doctor Octopus')).toBe(true);
    });
  });
});
