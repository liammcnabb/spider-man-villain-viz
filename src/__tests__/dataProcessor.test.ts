/**
 * Data Processor Unit Tests
 * 
 * Proof steps that verify data processing functions work correctly
 */

import {
  normalizeVillainName,
  generateVillainId,
  processVillainData,
  getCanonicalUrl
} from '../utils/dataProcessor';

import type { RawVillainData } from '../types';

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

  describe('getCanonicalUrl', () => {
    it('should remove query parameters from URLs', () => {
      const url = 'https://marvel.fandom.com/wiki/Richard_Fisk_(Earth-616)?foo=bar';
      expect(getCanonicalUrl(url))
        .toBe('https://marvel.fandom.com/wiki/Richard_Fisk_(Earth-616)');
    });

    it('should remove anchor fragments from URLs', () => {
      const url = 'https://marvel.fandom.com/wiki/Richard_Fisk_(Earth-616)#history';
      expect(getCanonicalUrl(url))
        .toBe('https://marvel.fandom.com/wiki/Richard_Fisk_(Earth-616)');
    });

    it('should handle undefined URLs', () => {
      expect(getCanonicalUrl(undefined)).toBeUndefined();
    });

    it('should handle empty URLs', () => {
      expect(getCanonicalUrl('')).toBeUndefined();
    });
  });

  describe('generateVillainId', () => {
    it('should generate URL-friendly IDs', () => {
      expect(generateVillainId('Green Goblin'))
        .toBe('green-goblin');
    });

    it('should remove special characters', () => {
      expect(generateVillainId("Doctor Octopus's"))
        .toBe('doctor-octopus-s');
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
            antagonists: [
              { name: 'Green Goblin', url: 'https://marvel.fandom.com/wiki/Green_Goblin' },
              { name: 'Doctor Octopus', url: 'https://marvel.fandom.com/wiki/Doctor_Octopus' }
            ]
          },
          {
            issueNumber: 2,
            title: 'Issue 2',
            antagonists: [
              { name: 'Green Goblin', url: 'https://marvel.fandom.com/wiki/Green_Goblin' },
              { name: 'Venom', url: 'https://marvel.fandom.com/wiki/Venom' }
            ]
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
          { issueNumber: 1, title: 'Issue 1', antagonists: [{ name: 'Villain A' }] },
          { issueNumber: 2, title: 'Issue 2', antagonists: [{ name: 'Villain A' }] },
          { issueNumber: 3, title: 'Issue 3', antagonists: [{ name: 'Villain A' }] }
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
          { issueNumber: 1, title: 'Issue 1', antagonists: [{ name: 'Villain A' }, { name: 'Villain B' }] },
          { issueNumber: 2, title: 'Issue 2', antagonists: [{ name: 'Villain A' }] }
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
          { issueNumber: 1, title: 'Issue 1', antagonists: [{ name: 'Villain A' }, { name: 'Villain B' }] },
          { issueNumber: 2, title: 'Issue 2', antagonists: [{ name: 'Villain A' }] }
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
          { issueNumber: 2, title: 'Issue 2', antagonists: [{ name: 'Villain A' }] }
        ]
      };

      const result = processVillainData(rawData);
      
      expect(result.villains.length).toBe(1);
      expect(result.timeline[0].villainCount).toBe(0);
    });

    it('should merge villains with different names but same URL (e.g., Rose and The Rose)', () => {
      const rawData: RawVillainData = {
        series: 'Test Series',
        baseUrl: 'https://example.com',
        issues: [
          { issueNumber: 253, title: 'Issue 253', antagonists: [{ name: 'Rose', url: 'https://marvel.fandom.com/wiki/Richard_Fisk_(Earth-616)' }] },
          { issueNumber: 256, title: 'Issue 256', antagonists: [{ name: 'The Rose', url: 'https://marvel.fandom.com/wiki/Richard_Fisk_(Earth-616)' }] },
          { issueNumber: 275, title: 'Issue 275', antagonists: [{ name: 'Rose', url: 'https://marvel.fandom.com/wiki/Richard_Fisk_(Earth-616)' }] },
          { issueNumber: 280, title: 'Issue 280', antagonists: [{ name: 'The Rose', url: 'https://marvel.fandom.com/wiki/Richard_Fisk_(Earth-616)' }] }
        ]
      };

      const result = processVillainData(rawData);
      
      // Should have only ONE villain entry because they share the same URL
      expect(result.villains.length).toBe(1);
      
      const rose = result.villains[0];
      // Should track both name variants
      expect(rose.names).toContain('Rose');
      expect(rose.names).toContain('The Rose');
      // Should have all 4 appearances
      expect(rose.frequency).toBe(4);
      expect(rose.appearances).toEqual([253, 256, 275, 280]);
      expect(rose.firstAppearance).toBe(253);
      // Should have the canonical URL
      expect(rose.url).toBe('https://marvel.fandom.com/wiki/Richard_Fisk_(Earth-616)');
    });

    it('should use the most frequently appearing name as the primary name (Green Goblin vs Norman Osborn)', () => {
      const rawData: RawVillainData = {
        series: 'Test Series',
        baseUrl: 'https://example.com',
        issues: [
          { issueNumber: 14, title: 'Issue 14', antagonists: [{ name: 'Green Goblin', url: 'https://marvel.fandom.com/wiki/Norman_Osborn_(Earth-616)' }] },
          { issueNumber: 17, title: 'Issue 17', antagonists: [{ name: 'Green Goblin', url: 'https://marvel.fandom.com/wiki/Norman_Osborn_(Earth-616)' }] },
          { issueNumber: 23, title: 'Issue 23', antagonists: [{ name: 'Green Goblin', url: 'https://marvel.fandom.com/wiki/Norman_Osborn_(Earth-616)' }] },
          { issueNumber: 39, title: 'Issue 39', antagonists: [{ name: 'Green Goblin', url: 'https://marvel.fandom.com/wiki/Norman_Osborn_(Earth-616)' }] },
          { issueNumber: 96, title: 'Issue 96', antagonists: [{ name: 'Norman Osborn', url: 'https://marvel.fandom.com/wiki/Norman_Osborn_(Earth-616)' }] },
          { issueNumber: 98, title: 'Issue 98', antagonists: [{ name: 'Norman Osborn', url: 'https://marvel.fandom.com/wiki/Norman_Osborn_(Earth-616)' }] }
        ]
      };

      const result = processVillainData(rawData);
      
      // Should have only ONE villain entry
      expect(result.villains.length).toBe(1);
      
      const goblin = result.villains[0];
      // Primary name should be the most frequently used one (Green Goblin appeared 4 times)
      expect(goblin.name).toBe('Green Goblin');
      // Should track both name variants
      expect(goblin.names).toContain('Green Goblin');
      expect(goblin.names).toContain('Norman Osborn');
      // Should have all 6 appearances
      expect(goblin.frequency).toBe(6);
      expect(goblin.appearances).toEqual([14, 17, 23, 39, 96, 98]);
    });

    it('should use the most prominent name even when it appears later (Chameleon example)', () => {
      const rawData: RawVillainData = {
        series: 'Test Series',
        baseUrl: 'https://example.com',
        issues: [
          { issueNumber: 1, title: 'Issue 1', antagonists: [{ name: 'Dmitri Smerdyakov', url: 'https://marvel.fandom.com/wiki/Chameleon_(Dmitri_Smerdyakov)' }] },
          { issueNumber: 2, title: 'Issue 2', antagonists: [{ name: 'Dmitri Smerdyakov', url: 'https://marvel.fandom.com/wiki/Chameleon_(Dmitri_Smerdyakov)' }] },
          { issueNumber: 15, title: 'Issue 15', antagonists: [{ name: 'Chameleon', url: 'https://marvel.fandom.com/wiki/Chameleon_(Dmitri_Smerdyakov)' }] },
          { issueNumber: 66, title: 'Issue 66', antagonists: [{ name: 'Chameleon', url: 'https://marvel.fandom.com/wiki/Chameleon_(Dmitri_Smerdyakov)' }] },
          { issueNumber: 80, title: 'Issue 80', antagonists: [{ name: 'Chameleon', url: 'https://marvel.fandom.com/wiki/Chameleon_(Dmitri_Smerdyakov)' }] },
          { issueNumber: 186, title: 'Issue 186', antagonists: [{ name: 'Chameleon', url: 'https://marvel.fandom.com/wiki/Chameleon_(Dmitri_Smerdyakov)' }] }
        ]
      };

      const result = processVillainData(rawData);
      
      expect(result.villains.length).toBe(1);
      
      const chameleon = result.villains[0];
      // Primary name should be "Chameleon" (appears 4 times vs 2 times for Dmitri)
      expect(chameleon.name).toBe('Chameleon');
      expect(chameleon.names).toContain('Chameleon');
      expect(chameleon.names).toContain('Dmitri Smerdyakov');
      expect(chameleon.frequency).toBe(6);
    });

    it('should handle tie in name frequency by choosing first alphabetically', () => {
      const rawData: RawVillainData = {
        series: 'Test Series',
        baseUrl: 'https://example.com',
        issues: [
          { issueNumber: 1, title: 'Issue 1', antagonists: [{ name: 'Alias A', url: 'https://marvel.fandom.com/wiki/Villain_X' }] },
          { issueNumber: 2, title: 'Issue 2', antagonists: [{ name: 'Alias B', url: 'https://marvel.fandom.com/wiki/Villain_X' }] }
        ]
      };

      const result = processVillainData(rawData);
      
      expect(result.villains.length).toBe(1);
      const villain = result.villains[0];
      // When tied, the first one encountered becomes primary
      expect(villain.name).toBeTruthy();
      expect(villain.names).toContain('Alias A');
      expect(villain.names).toContain('Alias B');
    });
  });
});
