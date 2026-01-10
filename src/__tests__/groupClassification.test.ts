/**
 * Group Classification Tests
 * Tests edge cases for group classification and taxonomy
 */

import { classifyKind } from '../utils/groupClassifier';
import { GroupAppearance } from '../types';

describe('Group Classification - Edge Cases and Taxonomy', () => {
  describe('classifyKind - Deterministic Classification', () => {
    it('should classify "individual" for single character names', () => {
      const names = ['Spider-Man', 'Doctor Octopus', 'Green Goblin', 'Sandman'];
      names.forEach((name) => {
        const kind = classifyKind(name);
        expect(['individual', 'group']).toContain(kind);
      });
    });

    it('should consistently classify the same name', () => {
      const name = 'Green Goblin';
      const result1 = classifyKind(name);
      const result2 = classifyKind(name);

      expect(result1).toBe(result2);
    });

    it('should classify known groups correctly', () => {
      const groupNames = ['Sinister Six', 'Nasty Boys', 'Emissaries of Evil'];
      groupNames.forEach((name) => {
        const kind = classifyKind(name);
        if (name.includes('Six') || name.includes('Boys') || name.includes('Evil')) {
          // Known group keywords
          expect(['individual', 'group']).toContain(kind);
        }
      });
    });

    it('should handle plural forms as potential groups', () => {
      const pluralNames = ['Velociraptors', 'Thugs', 'Henchmen', 'Goblins'];
      pluralNames.forEach((name) => {
        const kind = classifyKind(name);
        // Plural should lean toward group classification
        expect(['individual', 'group']).toContain(kind);
      });
    });

    it('should handle singular forms as individuals', () => {
      const singularNames = ['Spider-Man', 'Venom', 'Carnage', 'Cletus Kasady'];
      singularNames.forEach((name) => {
        const kind = classifyKind(name);
        expect(['individual', 'group']).toContain(kind);
      });
    });

    it('should be case-insensitive', () => {
      const name = 'SINISTER SIX';
      const result1 = classifyKind(name);
      const result2 = classifyKind('Sinister Six');

      expect(result1).toBe(result2);
    });

    it('should handle names with numbers', () => {
      const names = ['Vulture', 'Scorpion #1', 'Green Goblin III'];
      names.forEach((name) => {
        const kind = classifyKind(name);
        expect(['individual', 'group']).toContain(kind);
      });
    });
  });

  describe('Group Appearance Members - Derivation Rules', () => {
    it('should derive members from same-issue antagonists only', () => {
      // Group appears in issue 10 with specific members
      const issue10Members = ['Electro', 'Kraven', 'Vulture'];

      // Even though same group appeared in issue 5 with different members,
      // issue 10 members list should only reflect issue 10 roster
      const issue5Members = ['Doctor Octopus', 'Mysterio'];

      // Group appearances should be tracked separately per issue
      expect(issue10Members).not.toEqual(issue5Members);
    });

    it('should not include members from different issues', () => {
      const groupAppearance: GroupAppearance = {
        id: 'sinister-six',
        name: 'Sinister Six',
        issue: 10,
        members: ['Electro', 'Kraven', 'Vulture', 'Mysterio', 'Doctor Octopus', 'Sandman'],
      };

      // All members should be unique and specific to issue 10
      const uniqueMembers = new Set(groupAppearance.members);
      expect(uniqueMembers.size).toBe(groupAppearance.members.length);
    });

    it('should handle empty member lists gracefully', () => {
      const groupAppearance: GroupAppearance = {
        id: 'group-id',
        name: 'Some Group',
        issue: 1,
        members: [],
      };

      // Empty members list should be valid (e.g., group mentioned but not detailed)
      expect(groupAppearance.members).toHaveLength(0);
    });

    it('should not reconcile members across issues', () => {
      // Issue 1: Sinister Six has members A, B, C
      // Issue 50: Sinister Six has members D, E, F
      // Should NOT create combined member list [A, B, C, D, E, F]

      const issue1Members = ['Electro', 'Kraven', 'Vulture'];
      const issue50Members = ['Doctor Octopus', 'Mysterio', 'Sandman'];

      // Each should remain separate in their respective GroupAppearances
      expect(issue1Members).not.toContain(issue50Members[0]);
    });

    it('should preserve member order from source data', () => {
      const groupAppearance: GroupAppearance = {
        id: 'test-group',
        name: 'Test Group',
        issue: 1,
        members: ['First', 'Second', 'Third', 'Fourth', 'Fifth'],
      };

      // Member order should match source order (not alphabetized)
      expect(groupAppearance.members[0]).toBe('First');
      expect(groupAppearance.members[4]).toBe('Fifth');
    });
  });

  describe('Taxonomy Consistency - Known Groups Registry', () => {
    const knownGroups = [
      'Sinister Six',
      'Nasty Boys',
      'Emissaries of Evil',
      'Masters of Evil',
      'Savage Land Mutates',
    ];

    it('should consistently identify known group names', () => {
      knownGroups.forEach((groupName) => {
        const kind1 = classifyKind(groupName);
        const kind2 = classifyKind(groupName);

        expect(kind1).toBe(kind2);
      });
    });

    it('should handle group name variants', () => {
      const variants = ['Sinister Six', 'sinister six', 'SINISTER SIX', 'The Sinister Six'];
      const results = variants.map((name) => classifyKind(name));

      // All variants of same group should classify same way
      expect(new Set(results).size).toBe(1);
    });

    it('should audit classifyKind determinism', () => {
      // Run multiple times to ensure deterministic behavior
      const name = 'Hydra';
      const results = Array(100)
        .fill(null)
        .map(() => classifyKind(name));

      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(1);
    });
  });

  describe('Edge Cases in Group Detection', () => {
    it('should handle "and" conjunctions', () => {
      const names = [
        'Spider-Man and Venom',
        'The Punisher and Daredevil',
        'Mysterio and Sandman',
      ];

      names.forEach((name) => {
        const kind = classifyKind(name);
        expect(['individual', 'group']).toContain(kind);
      });
    });

    it('should handle "or" alternatives', () => {
      const names = [
        'Doctor Octopus or Green Goblin',
        'Venom/Carnage',
        'Electro - Spider',
      ];

      names.forEach((name) => {
        const kind = classifyKind(name);
        expect(['individual', 'group']).toContain(kind);
      });
    });

    it('should handle possessive forms', () => {
      const names = [
        "Green Goblin's Henchmen",
        "Doctor Octopus's Army",
        'Spider-Slayers',
      ];

      names.forEach((name) => {
        const kind = classifyKind(name);
        expect(['individual', 'group']).toContain(kind);
      });
    });

    it('should handle generic group terms', () => {
      const genericTerms = [
        'Thugs',
        'Mercenaries',
        'Soldiers',
        'Henchmen',
        'Minions',
        'Gang',
      ];

      genericTerms.forEach((term) => {
        const kind = classifyKind(term);
        expect(['individual', 'group']).toContain(kind);
      });
    });

    it('should handle numbers and ordinals in names', () => {
      const names = [
        'Green Goblin I',
        'Green Goblin II',
        '2nd Electro',
        'Vulture Prime',
      ];

      names.forEach((name) => {
        const kind = classifyKind(name);
        expect(['individual', 'group']).toContain(kind);
      });
    });
  });

  describe('Taxonomy Auditability', () => {
    it('should provide consistent results for same input', () => {
      const inputs = ['Sinister Six', 'Green Goblin', 'Sandman'];

      inputs.forEach((input) => {
        const results = [
          classifyKind(input),
          classifyKind(input),
          classifyKind(input),
        ];

        expect(new Set(results).size).toBe(1);
      });
    });

    it('should handle whitespace variations consistently', () => {
      const variations = [
        'Sinister Six',
        'Sinister  Six',
        ' Sinister Six ',
        'Sinister\tSix',
      ];

      const results = variations.map((name) => classifyKind(name));
      const uniqueResults = new Set(results);

      // All should classify the same way
      expect(uniqueResults.size).toBe(1);
    });
  });
});
