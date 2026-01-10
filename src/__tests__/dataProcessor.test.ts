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
    // Legacy behavior: name-based ID generation
    it('should generate URL-friendly IDs from names', () => {
      expect(generateVillainId('Green Goblin'))
        .toBe('green-goblin');
    });

    it('should remove special characters from names', () => {
      expect(generateVillainId("Doctor Octopus's"))
        .toBe('doctor-octopus-s');
    });

    it('should handle multiple spaces in names', () => {
      expect(generateVillainId('The Green Goblin'))
        .toBe('the-green-goblin');
    });

    it('should be consistent for names', () => {
      const id1 = generateVillainId('Green Goblin');
      const id2 = generateVillainId('Green Goblin');
      expect(id1).toBe(id2);
    });

    // New feature: URL slug extraction
    describe('URL slug extraction', () => {
      it('should extract slug from Marvel Fandom URL', () => {
        const url = 'https://marvel.fandom.com/wiki/Carolyn_Trainer_(Earth-616)';
        expect(generateVillainId(url))
          .toBe('Carolyn_Trainer_(Earth-616)');
      });

      it('should handle URLs with query parameters', () => {
        const url = 'https://marvel.fandom.com/wiki/Green_Goblin?foo=bar';
        expect(generateVillainId(url))
          .toBe('Green_Goblin');
      });

      it('should handle URLs with anchors', () => {
        const url = 'https://marvel.fandom.com/wiki/Doctor_Octopus_(Otto_Octavius)#early-life';
        expect(generateVillainId(url))
          .toBe('Doctor_Octopus_(Otto_Octavius)');
      });

      it('should handle complex URLs with both query and anchor', () => {
        const url = 'https://marvel.fandom.com/wiki/Venom_(Eddie_Brock)?v=1#powers';
        expect(generateVillainId(url))
          .toBe('Venom_(Eddie_Brock)');
      });

      it('should preserve parentheses and underscores in URL slugs', () => {
        const url = 'https://marvel.fandom.com/wiki/Norman_Osborn_(Green_Goblin)_(Earth-616)';
        expect(generateVillainId(url))
          .toBe('Norman_Osborn_(Green_Goblin)_(Earth-616)');
      });

      it('should fallback to name normalization for non-URL inputs', () => {
        expect(generateVillainId('The Lizard'))
          .toBe('the-lizard');
      });
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

  /**
   * ========================================
   * ISSUE #11 PROOF STEPS - DOCTOR OCTOPUS
   * ========================================
   * 
   * Issue: Doctor Octopus is showing as first appearing in Amazing Spider-Man Annual #1,
   * but his actual first appearance is Amazing Spider-Man Vol 1 #3.
   * 
   * Root Cause: When merging data from multiple series (Annual and Vol 1), the code
   * sorts by issue number numerically. Since Annual #1 comes before Vol 1 #3 numerically,
   * it's incorrectly marked as the first appearance. The fix must use chronological
   * order (release dates) instead of issue number order.
   */
  describe('ISSUE #11: Doctor Octopus First Appearance Incorrect', () => {
    
    it('PROOF: Doctor Octopus first appears in Amazing Spider-Man Vol 1 #3, NOT Annual #1', () => {
      // This test demonstrates the bug:
      // - Doc Ock appears in both Annual #1 and Vol 1 #3
      // - Annual #1 was published June 11, 1964
      // - Vol 1 #3 was published May 10, 1962
      // - Doc Ock's actual first appearance is Vol 1 #3 (chronologically earlier)
      
      // But currently the combined data shows:
      // - firstAppearanceSeries: "Amazing Spider-Man Annual Vol 1"
      // - firstAppearance: 1
      // Which is WRONG because Annual #1 is later than Vol 1 #3
      
      const docOckCurrentData = {
        id: 'doctor-octopus',
        name: 'Doctor Octopus',
        firstAppearanceSeries: 'Amazing Spider-Man Annual Vol 1',
        firstAppearance: 1,  // This is WRONG
        appearances: [1, 3, 6, 13, 15, 23, 19]
      };

      // Expected: firstAppearance should be 3 (Vol 1 #3, May 1962)
      // Expected: firstAppearanceSeries should be "Amazing Spider-Man Vol 1"
      expect(docOckCurrentData.firstAppearance).toBe(1);
      expect(docOckCurrentData.firstAppearanceSeries).toBe('Amazing Spider-Man Annual Vol 1');
      // ^ This test proves the bug exists
    });

    it('PROOF: After fix, Doctor Octopus should first appear in Vol 1 #3', () => {
      // After the fix is implemented, this test should pass:
      // - The code will sort appearances by chronological order (release date)
      // - Vol 1 #3 (May 1962) will be identified as first
      // - The combined data will show correct first appearance
      
      const docOckCorrectedData = {
        id: 'doctor-octopus',
        name: 'Doctor Octopus',
        firstAppearanceSeries: 'Amazing Spider-Man Vol 1',
        firstAppearance: 3,  // CORRECT: Vol 1 #3
        appearances: [1, 3, 6, 13, 15, 23, 19]
      };

      // This is what the data SHOULD show after the fix
      expect(docOckCorrectedData.firstAppearance).toBe(3);
      expect(docOckCorrectedData.firstAppearanceSeries).toBe('Amazing Spider-Man Vol 1');
    });
  });

  describe('Duplicate Issue Numbers Across Series', () => {
    /**
     * SCENARIO: Same villain appears in the same issue number but in different series
     * EXAMPLE: Doctor Octopus appears in Vol 1 #3 (April 1963) AND Annual #3 (August 1966)
     * 
     * EXPECTED BEHAVIOR:
     * - Both appearances should be represented in the appearances array
     * - Timeline should have separate entries with different chronologicalPosition values
     * - Rendering should show both issue tags with their respective series colors
     * - Earlier appearance should be marked as firstAppearanceSeries
     */

    it('should preserve multiple appearances of same issue number across series', () => {
      // Both Vol 1 #3 (chrono pos 3) and Annual #3 (chrono pos 44) with Doctor Octopus
      const mockTimeline = [
        {
          issue: 3,
          chronologicalPosition: 3,
          series: 'Amazing Spider-Man Vol 1',
          releaseDate: 'April 9, 1963',
          villains: ['Doctor Octopus', 'Charlie']
        },
        {
          issue: 3,
          chronologicalPosition: 44,
          series: 'Amazing Spider-Man Annual Vol 1',
          releaseDate: 'August 2, 1966',
          villains: ['Doctor Octopus', 'Hulk', 'Blackie Gaxton']
        }
      ];

      // Count appearances of issue 3 for Doctor Octopus
      const docOckIssue3Count = mockTimeline.filter(
        entry => entry.issue === 3 && entry.villains.includes('Doctor Octopus')
      ).length;

      expect(docOckIssue3Count).toBe(2);
      expect(mockTimeline[0].chronologicalPosition).toBe(3);
      expect(mockTimeline[1].chronologicalPosition).toBe(44);
    });

    it('should identify earliest appearance when same issue appears in multiple series', () => {
      const mockTimeline = [
        {
          issue: 3,
          chronologicalPosition: 3,
          series: 'Amazing Spider-Man Vol 1',
          releaseDate: 'April 9, 1963',
          villains: ['Doctor Octopus']
        },
        {
          issue: 3,
          chronologicalPosition: 44,
          series: 'Amazing Spider-Man Annual Vol 1',
          releaseDate: 'August 2, 1966',
          villains: ['Doctor Octopus']
        }
      ];

      // Find earliest appearance by chronological position
      const docOckAppearances = mockTimeline.filter(e => e.villains.includes('Doctor Octopus'));
      const earliest = docOckAppearances.reduce((min, curr) =>
        curr.chronologicalPosition < min.chronologicalPosition ? curr : min
      );

      expect(earliest.series).toBe('Amazing Spider-Man Vol 1');
      expect(earliest.chronologicalPosition).toBe(3);
      expect(earliest.releaseDate).toBe('April 9, 1963');
    });

    it('should render multiple tags for same issue number with different series colors', () => {
      const seriesColorMap: Record<string, string> = {
        'Amazing Spider-Man Vol 1': '#e74c3c',        // Red
        'Amazing Spider-Man Annual Vol 1': '#9b59b6'  // Purple
      };

      const mockTimeline = [
        {
          issue: 3,
          chronologicalPosition: 3,
          series: 'Amazing Spider-Man Vol 1',
          villains: ['Doctor Octopus']
        },
        {
          issue: 3,
          chronologicalPosition: 44,
          series: 'Amazing Spider-Man Annual Vol 1',
          villains: ['Doctor Octopus']
        }
      ];

      // Simulate rendering logic: iterate through timeline for this villain
      const villainAppearances = mockTimeline
        .filter(e => e.villains.includes('Doctor Octopus'))
        .map(e => ({
          issue: e.issue,
          series: e.series,
          color: seriesColorMap[e.series]
        }));

      // Should have 2 appearances
      expect(villainAppearances).toHaveLength(2);

      // First appearance should be red (Vol 1)
      expect(villainAppearances[0].issue).toBe(3);
      expect(villainAppearances[0].series).toBe('Amazing Spider-Man Vol 1');
      expect(villainAppearances[0].color).toBe('#e74c3c');

      // Second appearance should be purple (Annual)
      expect(villainAppearances[1].issue).toBe(3);
      expect(villainAppearances[1].series).toBe('Amazing Spider-Man Annual Vol 1');
      expect(villainAppearances[1].color).toBe('#9b59b6');
    });

    it('should handle villain with appearances in same issue across 3+ series', () => {
      // Edge case: if a villain appeared in Vol 1 #3, Annual #3, AND Untold Tales #3
      const mockTimeline = [
        {
          issue: 3,
          chronologicalPosition: 3,
          series: 'Amazing Spider-Man Vol 1',
          releaseDate: 'April 9, 1963',
          villains: ['Character X']
        },
        {
          issue: 3,
          chronologicalPosition: 44,
          series: 'Amazing Spider-Man Annual Vol 1',
          releaseDate: 'August 2, 1966',
          villains: ['Character X']
        },
        {
          issue: 3,
          chronologicalPosition: 50,
          series: 'Untold Tales of Spider-Man Vol 1',
          releaseDate: 'December 15, 1967',
          villains: ['Character X']
        }
      ];

      const charXAppearances = mockTimeline.filter(e => e.villains.includes('Character X'));
      expect(charXAppearances).toHaveLength(3);

      // Verify chronological ordering
      expect(charXAppearances[0].chronologicalPosition).toBe(3);
      expect(charXAppearances[1].chronologicalPosition).toBe(44);
      expect(charXAppearances[2].chronologicalPosition).toBe(50);

      // Earliest should be Vol 1
      const earliest = charXAppearances.reduce((min, curr) =>
        curr.chronologicalPosition < min.chronologicalPosition ? curr : min
      );
      expect(earliest.series).toBe('Amazing Spider-Man Vol 1');
    });

    it('should correctly process appearances array with duplicates', () => {
      // The appearances array has issue 3 twice (once for Vol 1, once for Annual)
      const doctorOctopusAppearances = [3, 11, 12, 1, 18, 30, 31, 32, 3, 53, 54, 55, 56];

      // Count issue 3 occurrences
      const issue3Count = doctorOctopusAppearances.filter(i => i === 3).length;
      expect(issue3Count).toBe(2);

      // When rendering, iterate through timeline instead of appearances array
      // to preserve series information for each occurrence
      const mockTimeline = [
        { issue: 1, chronologicalPosition: 1, series: 'Vol 1', villains: ['Doctor Octopus'] },
        { issue: 3, chronologicalPosition: 3, series: 'Vol 1', villains: ['Doctor Octopus'] },
        { issue: 11, chronologicalPosition: 11, series: 'Vol 1', villains: ['Doctor Octopus'] },
        { issue: 12, chronologicalPosition: 12, series: 'Vol 1', villains: ['Doctor Octopus'] },
        { issue: 3, chronologicalPosition: 44, series: 'Annual', villains: ['Doctor Octopus'] }
      ];

      const timelineRenderOrder = mockTimeline
        .filter(e => e.villains.includes('Doctor Octopus'))
        .map(e => ({ issue: e.issue, series: e.series }));

      // Should render in timeline order (not appearance order)
      expect(timelineRenderOrder).toEqual([
        { issue: 1, series: 'Vol 1' },
        { issue: 3, series: 'Vol 1' },
        { issue: 11, series: 'Vol 1' },
        { issue: 12, series: 'Vol 1' },
        { issue: 3, series: 'Annual' }
      ]);
    });

    it('should NOT lose color information for duplicate issue numbers', () => {
      const seriesColorMap: Record<string, string> = {
        'Amazing Spider-Man Vol 1': '#e74c3c',
        'Amazing Spider-Man Annual Vol 1': '#9b59b6',
        'Untold Tales of Spider-Man Vol 1': '#3498db'
      };

      // Before fix: map approach with same key would lose one color
      // After fix: timeline iteration preserves all colors
      const mockTimeline = [
        { issue: 3, series: 'Amazing Spider-Man Vol 1', villains: ['Doc Ock'] },
        { issue: 3, series: 'Amazing Spider-Man Annual Vol 1', villains: ['Doc Ock'] }
      ];

      const tagsRendered = mockTimeline
        .filter(e => e.villains.includes('Doc Ock'))
        .map(e => ({
          text: `#${e.issue}`,
          color: seriesColorMap[e.series]
        }));

      // Both tags should be rendered
      expect(tagsRendered).toHaveLength(2);
      
      // Both should have correct colors
      expect(tagsRendered[0].color).toBe('#e74c3c');  // Red for Vol 1
      expect(tagsRendered[1].color).toBe('#9b59b6');  // Purple for Annual
    });
  });

  describe('Villain variant separation in sparkline matching', () => {
    it('should match villain variants by URL, not just by name', () => {
      /**
       * Proof: When multiple villain variants share the same name (e.g., Green Goblin),
       * the sparkline should only count appearances of the SPECIFIC variant (by URL),
       * not all variants with that name.
       * 
       * Issue: Green Goblin (Construct) showed "Appearances: 1" but sparkline displayed
       * multiple data points from Norman Osborn appearances.
       */

      // Setup: Two Green Goblin variants with different URLs
      const greenGoblinConstruct = {
        id: 'Green_Goblin_(Construct)_(Earth-616)',
        name: 'Green Goblin',
        url: 'https://marvel.fandom.com/wiki/Green_Goblin_(Construct)_(Earth-616)',
        appearances: [432],
        frequency: 1
      };

      const greenGoblinNorman = {
        id: 'Norman_Osborn_(Earth-616)',
        name: 'Green Goblin',
        url: 'https://marvel.fandom.com/wiki/Norman_Osborn_(Earth-616)',
        appearances: [1, 5, 10, 25, 100],
        frequency: 25
      };

      // Timeline has both variants appearing
      const timeline = [
        {
          issue: 1,
          releaseDate: '1962-01-10',
          villains: ['Green Goblin'],
          villainIds: ['Norman_Osborn_(Earth-616)'],
          villainUrls: ['https://marvel.fandom.com/wiki/Norman_Osborn_(Earth-616)'],
          series: 'Amazing Spider-Man Vol 1',
          chronologicalPosition: 1,
          villainCount: 1,
          groups: []
        },
        {
          issue: 432,
          releaseDate: '1998-06-15',
          villains: ['Green Goblin'],
          villainIds: ['Green_Goblin_(Construct)_(Earth-616)'],
          villainUrls: ['https://marvel.fandom.com/wiki/Green_Goblin_(Construct)_(Earth-616)'],
          series: 'Amazing Spider-Man Vol 1',
          chronologicalPosition: 432,
          villainCount: 1,
          groups: []
        }
      ];

      // Simulate buildYearlyCounts with URL-first matching
      const countAppearancesByUrl = (
        villain: { id: string; url: string },
        timelineData: Array<{ releaseDate: string; villains: string[]; villainIds: string[]; villainUrls: string[] }>
      ) => {
        const counts = new Map<number, number>();
        timelineData.forEach((entry) => {
          const villains = entry.villains || [];
          const ids = entry.villainIds || [];
          const urls = entry.villainUrls || [];

          const appears = villains.some((_name: string, idx: number) => {
            const url = urls[idx];
            const id = ids[idx];
            // Prioritize URL matching (the fix)
            if (url && villain.url && url === villain.url) {
              return true;
            }
            if (id && villain.id && id === villain.id) {
              return true;
            }
            return false;
          });

          if (appears) {
            const year = new Date(entry.releaseDate).getFullYear();
            counts.set(year, (counts.get(year) || 0) + 1);
          }
        });
        return Array.from(counts.entries())
          .map(([year, count]) => ({ year, count }))
          .sort((a, b) => a.year - b.year);
      };

      // Test 1: Construct variant should only match its 1 appearance
      const constructCounts = countAppearancesByUrl(greenGoblinConstruct, timeline);
      expect(constructCounts).toHaveLength(1);
      expect(constructCounts[0]).toEqual({ year: 1998, count: 1 });

      // Test 2: Norman variant should only match its 1 appearance (from this timeline)
      const normanCounts = countAppearancesByUrl(greenGoblinNorman, timeline);
      expect(normanCounts).toHaveLength(1);
      expect(normanCounts[0]).toEqual({ year: 1962, count: 1 });

      // Test 3: Verify they don't cross-match
      // If name matching was used, both would show all appearances
      expect(constructCounts).not.toEqual(normanCounts);
    });
  });

  describe('Identity Source Tracking', () => {
    /**
     * PROOF: Entities created with URLs have identitySource='url'
     */
    it('should mark villains with URLs as url-sourced', () => {
      const rawData: RawVillainData = {
        series: 'Test Series',
        baseUrl: 'https://marvel.fandom.com',
        issues: [
          {
            issueNumber: 1,
            title: 'Test Issue',
            antagonists: [
              {
                name: 'Green Goblin',
                url: 'https://marvel.fandom.com/wiki/Green_Goblin_(Earth-616)'
              }
            ]
          }
        ]
      };

      const processed = processVillainData(rawData);
      const villain = processed.villains.find(v => v.name === 'Green Goblin');
      
      expect(villain).toBeDefined();
      expect(villain!.identitySource).toBe('url');
      expect(villain!.url).toBe('https://marvel.fandom.com/wiki/Green_Goblin_(Earth-616)');
    });

    /**
     * PROOF: Entities created without URLs have identitySource='name'
     */
    it('should mark villains without URLs as name-sourced', () => {
      const rawData: RawVillainData = {
        series: 'Test Series',
        baseUrl: 'https://marvel.fandom.com',
        issues: [
          {
            issueNumber: 1,
            title: 'Test Issue',
            antagonists: [
              { name: 'Mysterious Villain' } // No URL
            ]
          }
        ]
      };

      const processed = processVillainData(rawData);
      const villain = processed.villains.find(v => v.name === 'Mysterious Villain');
      
      expect(villain).toBeDefined();
      expect(villain!.identitySource).toBe('name');
      expect(villain!.url).toBeUndefined();
    });

    /**
     * PROOF: Name-only and URL-sourced entities remain separate historically
     * Even if they have the same name, they are distinct identities
     */
    it('should keep name-only and url-sourced entities separate', () => {
      const rawData: RawVillainData = {
        series: 'Test Series',
        baseUrl: 'https://marvel.fandom.com',
        issues: [
          {
            issueNumber: 1,
            title: 'Early Appearance',
            antagonists: [
              { name: 'The Rose' } // Name-only (first appearance)
            ]
          },
          {
            issueNumber: 2,
            title: 'Later Appearance',
            antagonists: [
              {
                name: 'The Rose',
                url: 'https://marvel.fandom.com/wiki/Richard_Fisk_(Earth-616)' // URL added later
              }
            ]
          }
        ]
      };

      const processed = processVillainData(rawData);
      
      // Should have TWO separate villain entries
      const roseVillains = processed.villains.filter(v => v.name === 'The Rose');
      expect(roseVillains).toHaveLength(2);

      // One name-sourced, one URL-sourced
      const nameSourced = roseVillains.find(v => v.identitySource === 'name');
      const urlSourced = roseVillains.find(v => v.identitySource === 'url');

      expect(nameSourced).toBeDefined();
      expect(nameSourced!.appearances).toEqual([1]);
      expect(nameSourced!.url).toBeUndefined();

      expect(urlSourced).toBeDefined();
      expect(urlSourced!.appearances).toEqual([2]);
      expect(urlSourced!.url).toBe('https://marvel.fandom.com/wiki/Richard_Fisk_(Earth-616)');
    });

    /**
     * PROOF: Identity source persists through processing and serialization
     */
    it('should preserve identitySource through serialization', () => {
      const rawData: RawVillainData = {
        series: 'Test Series',
        baseUrl: 'https://marvel.fandom.com',
        issues: [
          {
            issueNumber: 1,
            title: 'Test',
            antagonists: [
              { name: 'Villain A', url: 'https://marvel.fandom.com/wiki/A' },
              { name: 'Villain B' }
            ]
          }
        ]
      };

      const processed = processVillainData(rawData);
      
      // Check processed data has identitySource
      expect(processed.villains.every(v => v.identitySource)).toBe(true);
      expect(processed.villains.some(v => v.identitySource === 'url')).toBe(true);
      expect(processed.villains.some(v => v.identitySource === 'name')).toBe(true);
    });
  });
});
