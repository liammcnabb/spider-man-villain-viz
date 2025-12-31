/**
 * Data Processor Unit Tests
 * 
 * Proof steps that verify data processing functions work correctly
 */

import {
  normalizeVillainName,
  generateVillainId,
  processVillainData
} from '../utils/dataProcessor';

import type { IssueData, RawVillainData } from '../types';

describe('Data Processor - Proof Steps', () => {
  
  describe('normalizeVillainName', () => {
    it('should trim whitespace from villain names', () => {
      expect(normalizeVillainName('  Green Goblin  '))
        .toBe('Green Goblin');
    });

    it('should remove alias information in parentheses', () => {
      expect(normalizeVillainName('Green Goblin (Norman Osborn)'))
        .toBe('Green Goblin');
    });

    it('should remove trailing punctuation', () => {
      expect(normalizeVillainName('Doctor Octopus,'))
        .toBe('Doctor Octopus');
    });

    it('should normalize spacing', () => {
      expect(normalizeVillainName('Spider  Man'))
        .toBe('Spider Man');
    });

    it('should handle complex cases', () => {
      const input = '  Venom (Eddie Brock),  ';
      expect(normalizeVillainName(input))
        .toBe('Venom');
    });
  });

  describe('generateVillainId', () => {
    it('should generate URL-friendly IDs', () => {
      expect(generateVillainId('Green Goblin'))
        .toBe('green-goblin');
    });

    it('should remove special characters', () => {
      expect(generateVillainId("Doctor Octopus's"))
        .toBe('doctor-octopuss');
    });

    it('should handle multiple spaces', () => {
      expect(generateVillainId('The Green Goblin'))
        .toBe('the-green-goblin');
    });

    it('should be consistent', () => {
      const id1 = generateVillainId('Green Goblin');
      const id2 = generateVillainId('Green Goblin');
      expect(id1).toBe(id2);
    });
  });

  describe('processVillainData', () => {
    it('should extract unique villains', () => {
      const rawData: RawVillainData = {
        series: 'Amazing Spider-Man Vol 1',
        baseUrl: 'https://example.com',
        issues: [
          {
            issueNumber: 1,
            title: 'Issue 1',
            antagonists: ['Green Goblin', 'Doctor Octopus']
          },
          {
            issueNumber: 2,
            title: 'Issue 2',
            antagonists: ['Green Goblin', 'Venom']
          }
        ]
      };

      const result = processVillainData(rawData);
      
      expect(result.villains.length).toBe(3);
      expect(result.villains.map(v => v.names[0]))
        .toContain('Green Goblin');
    });

    it('should track appearances correctly', () => {
      const rawData: RawVillainData = {
        series: 'Test Series',
        baseUrl: 'https://example.com',
        issues: [
          { issueNumber: 1, title: 'Issue 1', antagonists: ['Villain A'] },
          { issueNumber: 2, title: 'Issue 2', antagonists: ['Villain A'] },
          { issueNumber: 3, title: 'Issue 3', antagonists: ['Villain A'] }
        ]
      };

      const result = processVillainData(rawData);
      const villainA = result.villains.find(v => v.names[0] === 'Villain A');
      
      expect(villainA?.frequency).toBe(3);
      expect(villainA?.appearances).toEqual([1, 2, 3]);
    });

    it('should calculate statistics correctly', () => {
      const rawData: RawVillainData = {
        series: 'Test Series',
        baseUrl: 'https://example.com',
        issues: [
          { issueNumber: 1, title: 'Issue 1', antagonists: ['Villain A', 'Villain B'] },
          { issueNumber: 2, title: 'Issue 2', antagonists: ['Villain A'] }
        ]
      };

      const result = processVillainData(rawData);
      
      expect(result.stats.totalVillains).toBe(2);
      expect(result.stats.mostFrequent.names[0]).toBe('Villain A');
      expect(result.stats.mostFrequent.frequency).toBe(2);
    });

    it('should generate timeline correctly', () => {
      const rawData: RawVillainData = {
        series: 'Test Series',
        baseUrl: 'https://example.com',
        issues: [
          { issueNumber: 1, title: 'Issue 1', antagonists: ['Villain A', 'Villain B'] },
          { issueNumber: 2, title: 'Issue 2', antagonists: ['Villain A'] }
        ]
      };

      const result = processVillainData(rawData);
      
      expect(result.timeline.length).toBe(2);
      expect(result.timeline[0].villainCount).toBe(2);
      expect(result.timeline[1].villainCount).toBe(1);
    });

    it('should handle empty antagonist lists', () => {
      const rawData: RawVillainData = {
        series: 'Test Series',
        baseUrl: 'https://example.com',
        issues: [
          { issueNumber: 1, title: 'Issue 1', antagonists: [] },
          { issueNumber: 2, title: 'Issue 2', antagonists: ['Villain A'] }
        ]
      };

      const result = processVillainData(rawData);
      
      expect(result.villains.length).toBe(1);
      expect(result.timeline[0].villainCount).toBe(0);
    });
  });
});
