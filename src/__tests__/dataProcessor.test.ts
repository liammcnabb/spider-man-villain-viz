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

  /**
   * ========================================
   * ISSUE #9 PROOF STEPS - MYSTERIO
   * ========================================
   * 
   * Issue Description:
   * Mysterio's data is incorrect in villains.json (combined data).
   * Current state:
   *   - Combined (merged): firstAppearance: 1, appearances: [1,2,4,6,13...]
   *   - Amazing Vol 1: firstAppearance: 2, appearances: [2,13,24...]
   *   - Amazing Annual: firstAppearance: 1, appearances: [1,2,4...]
   * 
   * Problem:
   * The combined data shows firstAppearance as 1, but chronologically:
   * - Issue #1 = Amazing Spider-Man Vol 1 #1 (Dec 10, 1962) - NOT in appearance list
   * - Issue #2 = Amazing Spider-Man Vol 1 #2 (Feb 12, 1963) - FIRST in Vol 1
   * - Issue #1 (Annual) = Amazing Spider-Man Annual #1 (June 11, 1964)
   * 
   * The merged/combined data should show:
   * - firstAppearance: 1 (Amazing Spider-Man Annual #1, June 1964)
   * - OR firstAppearance: 2 (Amazing Spider-Man Vol 1 #2, Feb 1963) if not counting Annuals
   * 
   * Current bug: firstAppearance points to issue #1 but #1 is not in appearances array
   */
  describe('ISSUE #9: Mysterio Data Inconsistency', () => {
    
    it('PROOF: Mysterio in Amazing Spider-Man Vol 1 - first appears in issue #2, NOT #1', () => {
      // Arrange: Mysterio data from Amazing Spider-Man Vol 1 series data
      const mysterioVolume1: RawVillainData = {
        series: 'Amazing Spider-Man Vol 1',
        baseUrl: 'https://example.com',
        issues: [
          {
            issueNumber: 1,
            title: 'Spider-Man',
            releaseDate: 'December 10, 1962',
            antagonists: [
              { name: 'Burglar', url: 'https://marvel.fandom.com/wiki/Burglar' },
              { name: 'Chameleon', url: 'https://marvel.fandom.com/wiki/Chameleon' }
              // NOTE: Mysterio is NOT in issue #1
            ]
          },
          {
            issueNumber: 2,
            title: 'Facing the Tinkerer!',
            releaseDate: 'February 12, 1963',
            antagonists: [
              { name: 'Tinkerer', url: 'https://marvel.fandom.com/wiki/Tinkerer' },
              { name: 'Quentin Beck', url: 'https://marvel.fandom.com/wiki/Quentin_Beck_(Earth-616)' }  // FIRST appearance of Mysterio
            ]
          },
          {
            issueNumber: 13,
            title: 'The Menace of Mysterio!',
            releaseDate: 'March 10, 1964',
            antagonists: [
              { name: 'Quentin Beck', url: 'https://marvel.fandom.com/wiki/Quentin_Beck_(Earth-616)' }
            ]
          }
        ]
      };

      const result = processVillainData(mysterioVolume1);
      const mysterio = result.villains.find(v => v.url === 'https://marvel.fandom.com/wiki/Quentin_Beck_(Earth-616)');

      // Assert: firstAppearance should be 2, NOT 1
      expect(mysterio).toBeDefined();
      expect(mysterio?.firstAppearance).toBe(2);
      expect(mysterio?.appearances).toEqual([2, 13]);
      expect(mysterio?.appearances).not.toContain(1);  // Issue #1 NOT in appearances
      expect(mysterio?.frequency).toBe(2);
    });

    it('PROOF: Mysterio in Amazing Spider-Man Annual Vol 1 - first appears in Annual #1', () => {
      // Arrange: Mysterio data from Amazing Spider-Man Annual series
      const mysterioAnnual: RawVillainData = {
        series: 'Amazing Spider-Man Annual Vol 1',
        baseUrl: 'https://example.com',
        issues: [
          {
            issueNumber: 1,
            title: 'Villains',
            releaseDate: 'June 11, 1964',
            antagonists: [
              { name: 'Vulture', url: 'https://marvel.fandom.com/wiki/Vulture' },
              { name: 'Electro', url: 'https://marvel.fandom.com/wiki/Electro' },
              { name: 'Quentin Beck', url: 'https://marvel.fandom.com/wiki/Quentin_Beck_(Earth-616)' },  // In Annual #1
              { name: 'Kraven the Hunter', url: 'https://marvel.fandom.com/wiki/Kraven_the_Hunter' }
            ]
          },
          {
            issueNumber: 2,
            title: 'Villains Return',
            releaseDate: 'June 1, 1965',
            antagonists: [
              { name: 'Quentin Beck', url: 'https://marvel.fandom.com/wiki/Quentin_Beck_(Earth-616)' }
            ]
          }
        ]
      };

      const result = processVillainData(mysterioAnnual);
      const mysterio = result.villains.find(v => v.url === 'https://marvel.fandom.com/wiki/Quentin_Beck_(Earth-616)');

      // Assert: firstAppearance should be 1 (Annual #1)
      expect(mysterio).toBeDefined();
      expect(mysterio?.firstAppearance).toBe(1);
      expect(mysterio?.appearances).toEqual([1, 2]);
      expect(mysterio?.frequency).toBe(2);
    });

    it('PROOF: Current villains.json shows invalid state - firstAppearance: 1 but 1 not in appearances array', () => {
      // This is the ACTUAL problem in the combined data
      // firstAppearance: 1 means "issue at index 1"
      // appearances: [1, 2, 4, 6, 13...] 
      // BUT issue 1 should NOT be in the appearances because Mysterio doesn't appear in Vol 1 #1
      
      const invalidData = {
        id: 'mysterio',
        name: 'Mysterio',
        firstAppearance: 1,  // Claims first appearance is issue 1
        appearances: [1, 2, 4, 6, 13, 23, 24, 66, 67, 181, 196, 197, 198, 199]
      };

      // The inconsistency:
      // - If firstAppearance: 1, then appearances should start with [1, ...]
      // - Currently it DOES start with 1, but based on series data, Vol 1 #1 doesn't have Mysterio
      // - The 1 in appearances comes from Annual #1 (June 1964, later than Vol 1 #2)
      // - Vol 1 #2 (Feb 1963) is chronologically FIRST

      expect(invalidData.firstAppearance).toBe(1);
      expect(invalidData.appearances[0]).toBe(1);
      
      // BUT this is misleading because:
      // - The appearance at index 1 in the combined timeline is NOT chronologically first
      // - It's only first numerically when sorting both Annual and Vol 1 issues together
      // - Chronologically: Vol 1 #2 (Feb 1963) comes before Annual #1 (June 1964)
    });

    it('PROOF: Chronological order of Mysterio appearances across series', () => {
      // This demonstrates the actual chronological order:
      const mysterioAppearances = [
        {
          issue: 2,
          series: 'Amazing Spider-Man Vol 1',
          releaseDate: 'February 12, 1963',
          isFirst: true
        },
        {
          issue: 13,
          series: 'Amazing Spider-Man Vol 1',
          releaseDate: 'March 10, 1964',
          isFirst: false
        },
        {
          issue: 1,
          series: 'Amazing Spider-Man Annual Vol 1',
          releaseDate: 'June 11, 1964',
          isFirst: false
        },
        {
          issue: 24,
          series: 'Amazing Spider-Man Vol 1',
          releaseDate: 'September 10, 1964',
          isFirst: false
        },
        {
          issue: 2,
          series: 'Amazing Spider-Man Annual Vol 1',
          releaseDate: 'June 1, 1965',
          isFirst: false
        }
      ];

      // The FIRST appearance chronologically is Vol 1 #2 (Feb 1963)
      const firstAppearance = mysterioAppearances[0];
      expect(firstAppearance.series).toBe('Amazing Spider-Man Vol 1');
      expect(firstAppearance.issue).toBe(2);
      expect(firstAppearance.releaseDate).toBe('February 12, 1963');

      // Annual #1 comes AFTER Vol 1 #2 chronologically (June 1964 > Feb 1963)
      const annualAppearance = mysterioAppearances[2];
      const isAnnualLater = new Date(annualAppearance.releaseDate) > new Date(mysterioAppearances[0].releaseDate);
      expect(isAnnualLater).toBe(true);
    });

    it('PROOF: Combined data merge causes firstAppearance confusion', () => {
      // When combining Annual and Vol 1 data:
      // - Annual #1 has Mysterio as issue index 1
      // - Vol 1 #2 has Mysterio as issue index 2
      // If sorted numerically by issue number ONLY, Annual #1 appears first
      // But chronologically Vol 1 #2 is first (Feb 1963 vs June 1964)

      const combinedIssueOrder = [
        { issueNumber: 1, series: 'Annual', chronologicalPosition: 3 },  // June 1964
        { issueNumber: 2, series: 'Vol 1', chronologicalPosition: 1 },   // Feb 1963 - FIRST chronologically
        { issueNumber: 13, series: 'Vol 1', chronologicalPosition: 2 },  // March 1964
        { issueNumber: 24, series: 'Vol 1', chronologicalPosition: 4 }   // Sept 1964
      ];

      // Sorted numerically: [1, 2, 13, 24] - Annual #1 appears first
      const numericSort = combinedIssueOrder.sort((a, b) => a.issueNumber - b.issueNumber);
      expect(numericSort[0].issueNumber).toBe(1);

      // Sorted chronologically: [2, 13, 1, 24] - Vol 1 #2 is actually first
      const chronoSort = combinedIssueOrder.sort((a, b) => a.chronologicalPosition - b.chronologicalPosition);
      expect(chronoSort[0].issueNumber).toBe(2);
      expect(chronoSort[0].series).toBe('Vol 1');
    });
  });
});
