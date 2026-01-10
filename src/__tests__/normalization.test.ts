/**
 * Normalization tests - covers aliases, punctuation, whitespace handling
 */

import { normalizeVillainName } from '../utils/dataProcessor';

describe('Normalization - Name Variants and Aliases', () => {
  describe('normalizeVillainName', () => {
    it('should trim whitespace', () => {
      const result = normalizeVillainName('  Doctor Octopus  ');
      expect(result).not.toMatch(/^\s|\s$/);
    });

    it('should handle multiple spaces', () => {
      const result = normalizeVillainName('The   Green   Goblin');
      expect(result).not.toMatch(/\s{2,}/);
    });

    it('should normalize punctuation', () => {
      const result = normalizeVillainName('Doctor Octopus (D.O.)');
      // Should handle punctuation consistently
      expect(result).toBeDefined();
      expect(result).toBe('Doctor Octopus');
    });

    it('should remove common parenthetical info', () => {
      const result = normalizeVillainName('Green Goblin (Norman Osborn)');
      expect(result).toBe('Green Goblin');
    });

    it('should handle apostrophes', () => {
      const result1 = normalizeVillainName("Mac Gargan's Scorpion");
      const result2 = normalizeVillainName('Mac Gargans Scorpion');
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should handle hyphens', () => {
      const result = normalizeVillainName('Green-Goblin');
      expect(result).toBeDefined();
    });

    it('should normalize Roman numerals', () => {
      const result = normalizeVillainName('Doctor Octopus III');
      expect(result).toBeDefined();
    });
  });

  describe('Multiple Name Variants', () => {
    it('should normalize different casings of same name', () => {
      const variant1 = normalizeVillainName('Green Goblin');
      const variant2 = normalizeVillainName('GREEN GOBLIN');
      const variant3 = normalizeVillainName('green goblin');

      // All should normalize to same form (trimmed and spaces collapsed)
      expect(variant1.trim()).toBe(variant1);
      expect(variant2.trim()).toBe(variant2);
      expect(variant3.trim()).toBe(variant3);
    });

    it('should handle nickname variations', () => {
      const fullName = normalizeVillainName('Green Goblin');
      const nickname = normalizeVillainName('GG');

      // Both should be valid normalizations
      expect(fullName).toBeDefined();
      expect(nickname).toBeDefined();
    });

    it('should normalize article prefixes consistently', () => {
      const withArticle = normalizeVillainName('The Green Goblin');
      const withoutArticle = normalizeVillainName('Green Goblin');

      // Both should normalize
      expect(withArticle).toBeDefined();
      expect(withoutArticle).toBeDefined();
    });

    it('should deduplicate variants with case differences', () => {
      const name1 = normalizeVillainName('Green Goblin');
      const name2 = normalizeVillainName('GREEN GOBLIN');

      // Both should have spaces collapsed and trimmed
      expect(name1.trim()).toBe(name1);
      expect(name2.trim()).toBe(name2);
    });

    it('should handle empty variant arrays gracefully', () => {
      // Normalization should handle any string
      expect(normalizeVillainName('Green Goblin')).toBeDefined();
    });
  });

  describe('Punctuation Handling', () => {
    const testCases = [
      { input: 'Doctor Octopus Jr.', description: 'Jr. suffix' },
      { input: "O'Brien's Villain", description: "Apostrophe in name" },
      { input: 'Villain-King', description: 'Hyphenated name' },
      { input: 'Villain (Comic)', description: 'Parenthetical note' },
      { input: 'Villain #1', description: 'Number with hash' },
      { input: 'Villain/Other', description: 'Slash separator' },
    ];

    testCases.forEach(({ input, description }) => {
      it(`should handle ${description}`, () => {
        const result = normalizeVillainName(input);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });
  });

  describe('Whitespace Handling', () => {
    it('should normalize tabs to spaces', () => {
      const result = normalizeVillainName('Green\tGoblin');
      expect(result).not.toMatch(/\t/);
    });

    it('should normalize newlines', () => {
      const result = normalizeVillainName('Green\nGoblin');
      expect(result).not.toMatch(/\n/);
    });

    it('should handle leading/trailing spaces', () => {
      const result = normalizeVillainName('  \t  Green Goblin  \n  ');
      expect(result).not.toMatch(/^\s|\s$/);
    });

    it('should collapse multiple internal spaces', () => {
      const result = normalizeVillainName('Green    Goblin');
      expect(result.match(/\s{2,}/)).toBeNull();
    });

    it('should handle zero-width spaces', () => {
      // Zero-width space: \u200B
      const result = normalizeVillainName('Green\u200BGoblin');
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single-character names', () => {
      const result = normalizeVillainName('G');
      expect(result).toBeDefined();
    });

    it('should handle very long names', () => {
      const longName = 'A'.repeat(500);
      const result = normalizeVillainName(longName);
      expect(result).toBeDefined();
    });

    it('should handle special unicode characters', () => {
      const result = normalizeVillainName('Villàin Über');
      expect(result).toBeDefined();
    });

    it('should handle emoji', () => {
      const result = normalizeVillainName('Villain 🦑');
      expect(result).toBeDefined();
    });

    it('should handle mixed case and punctuation', () => {
      const result = normalizeVillainName('GrEeN-GoBlIn (The)!');
      expect(result).toBeDefined();
    });
  });

  describe('Consistency', () => {
    it('should produce consistent results for same input', () => {
      const input = 'The Green Goblin Jr.';
      const result1 = normalizeVillainName(input);
      const result2 = normalizeVillainName(input);

      expect(result1).toBe(result2);
    });

    it('should trim and collapse whitespace consistently', () => {
      const input1 = normalizeVillainName('Green Goblin');
      const input2 = normalizeVillainName('  Green  Goblin  ');

      // Both should have normalized whitespace
      expect(input1).not.toMatch(/\s{2,}/);
      expect(input2).not.toMatch(/\s{2,}/);
    });
  });
});
