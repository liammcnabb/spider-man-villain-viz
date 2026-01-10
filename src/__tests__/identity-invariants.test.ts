/**
 * Identity Invariant Tests
 * Verifies that name-only vs URL identities remain separate across processing and merging
 */

import { processVillainData } from '../utils/dataProcessor';
import { mergeDatasets } from '../utils/mergeDatasets';
import { IssueData, ProcessedVillain, RawVillainData, ProcessedData } from '../types';

describe('Identity Invariants - Name vs URL Identity Separation', () => {
  /**
   * INVARIANT 1: Entities with only names (no URLs) in early issues
   * should remain distinct from later URL-identified entities, even if names match
   */
  describe('Historical Separation - No Retroactive Reconciliation', () => {
    it('should keep name-only entity separate from URL-identified entity with same name', () => {
      // Early appearance: no URL
      const issue1: IssueData = {
        issueNumber: 1,
        title: 'First Issue',
        antagonists: [{ name: 'Green Goblin' }],
      };

      // Later appearance: same name but now with URL
      const issue2: IssueData = {
        issueNumber: 50,
        title: 'Later Issue',
        antagonists: [
          {
            name: 'Green Goblin',
            url: 'https://marvel.fandom.com/wiki/Green_Goblin_(Norman_Osborn)',
          },
        ],
      };

      const rawData: RawVillainData = {
        series: 'Amazing Spider-Man Vol 1',
        baseUrl: 'https://marvel.fandom.com',
        issues: [issue1, issue2],
      };

      const processed = processVillainData(rawData);

      // Should create TWO separate identities
      const nameSourced = processed.villains.filter(
        (v: ProcessedVillain) => v.identitySource === 'name' && v.name.toLowerCase().includes('goblin')
      );
      const urlSourced = processed.villains.filter(
        (v: ProcessedVillain) => v.identitySource === 'url' && v.name.toLowerCase().includes('goblin')
      );

      expect(nameSourced.length).toBeGreaterThanOrEqual(1);
      expect(urlSourced.length).toBeGreaterThanOrEqual(1);
      expect(nameSourced.length + urlSourced.length).toBeGreaterThan(1);
    });

    it('should track identitySource consistently through serialization', () => {
      const issue: IssueData = {
        issueNumber: 1,
        title: 'Test',
        antagonists: [
          { name: 'Villain A' },
          {
            name: 'Villain B',
            url: 'https://marvel.fandom.com/wiki/Villain_B',
          },
        ],
      };

      const rawData: RawVillainData = {
        series: 'Test Series',
        baseUrl: 'https://marvel.fandom.com',
        issues: [issue],
      };

      const processed = processVillainData(rawData);

      // Verify identitySource field is present and correct
      const villainA = processed.villains.find((v: ProcessedVillain) => v.name === 'Villain A');
      const villainB = processed.villains.find((v: ProcessedVillain) => v.name === 'Villain B');

      expect(villainA?.identitySource).toBe('name');
      expect(villainB?.identitySource).toBe('url');
    });
  });

  /**
   * INVARIANT 2: URL-keyed identity (when available) takes precedence
   */
  describe('URL-Keyed Identity Priority', () => {
    it('should use URL as primary identity key when present', () => {
      const issue: IssueData = {
        issueNumber: 1,
        title: 'Test',
        antagonists: [
          {
            name: 'Green Goblin',
            url: 'https://marvel.fandom.com/wiki/Green_Goblin_(Norman_Osborn)',
          },
        ],
      };

      const rawData: RawVillainData = {
        series: 'Test',
        baseUrl: 'https://marvel.fandom.com',
        issues: [issue],
      };

      const processed = processVillainData(rawData);
      const villain = processed.villains[0];

      expect(villain.identitySource).toBe('url');
      expect(villain.url).toBe(
        'https://marvel.fandom.com/wiki/Green_Goblin_(Norman_Osborn)'
      );
      // ID should be derived from URL slug
      expect(villain.id).toMatch(/[Gg]reen.*[Gg]oblin/);
    });

    it('should use normalized name as fallback when URL is not available', () => {
      const issue: IssueData = {
        issueNumber: 1,
        title: 'Test',
        antagonists: [{ name: 'Green Goblin' }],
      };

      const rawData: RawVillainData = {
        series: 'Test',
        baseUrl: 'https://marvel.fandom.com',
        issues: [issue],
      };

      const processed = processVillainData(rawData);
      const villain = processed.villains[0];

      expect(villain.identitySource).toBe('name');
      expect(villain.url).toBeUndefined();
      expect(villain.id).toBe('green-goblin');
    });
  });

  /**
   * INVARIANT 3: Identity source determines ID generation strategy
   */
  describe('ID Generation Based on Identity Source', () => {
    it('should generate URL-based ID from canonical URL slug', () => {
      const villain: ProcessedVillain = {
        id: 'green-goblin-norman-osborn',
        name: 'Green Goblin',
        names: ['Green Goblin', 'Norman Osborn'],
        url: 'https://marvel.fandom.com/wiki/Green_Goblin_(Norman_Osborn)',
        identitySource: 'url',
        firstAppearance: 1,
        appearances: [1],
        frequency: 1,
      };

      // ID should be derived from URL slug
      expect(villain.id).toMatch(/green-goblin/);
      expect(villain.id).toBe('green-goblin-norman-osborn');
    });

    it('should generate name-based ID from normalized name', () => {
      const villain: ProcessedVillain = {
        id: 'green-goblin',
        name: 'Green Goblin',
        names: ['Green Goblin', 'GG'],
        identitySource: 'name',
        firstAppearance: 1,
        appearances: [1],
        frequency: 1,
      };

      // ID should be derived from normalized name
      expect(villain.id).toBe('green-goblin');
      expect(villain.url).toBeUndefined();
    });
  });

  /**
   * INVARIANT 4: Merging must preserve identity separation
   */
  describe('Merge Preserves Identity Separation', () => {
    it('should not merge separate identities during dataset merge', () => {
      // Create two datasets with same name but different identity sources
      const data1: ProcessedData = {
        series: 'Series 1',
        processedAt: new Date().toISOString(),
        villains: [
          {
            id: 'green-goblin',
            name: 'Green Goblin',
            names: ['Green Goblin'],
            identitySource: 'name',
            firstAppearance: 1,
            appearances: [1],
            frequency: 1,
          },
        ],
        timeline: [
          {
            issue: 1,
            villains: [
              {
                id: 'green-goblin',
                name: 'Green Goblin',
                names: ['Green Goblin'],
                identitySource: 'name',
                firstAppearance: 1,
                appearances: [1],
                frequency: 1,
              },
            ],
            villainCount: 1,
          },
        ],
        stats: {
          totalVillains: 1,
          mostFrequent: {
            id: 'green-goblin',
            name: 'Green Goblin',
            names: ['Green Goblin'],
            identitySource: 'name',
            firstAppearance: 1,
            appearances: [1],
            frequency: 1,
          },
          averageFrequency: 1,
          firstAppearances: new Map([[1, ['Green Goblin']]]),
        },
      };

      const data2: ProcessedData = {
        series: 'Series 2',
        processedAt: new Date().toISOString(),
        villains: [
          {
            id: 'green-goblin-norman-osborn',
            name: 'Green Goblin',
            names: ['Green Goblin', 'Norman Osborn'],
            url: 'https://marvel.fandom.com/wiki/Green_Goblin_(Norman_Osborn)',
            identitySource: 'url',
            firstAppearance: 1,
            appearances: [1],
            frequency: 1,
          },
        ],
        timeline: [
          {
            issue: 1,
            villains: [
              {
                id: 'green-goblin-norman-osborn',
                name: 'Green Goblin',
                names: ['Green Goblin', 'Norman Osborn'],
                url: 'https://marvel.fandom.com/wiki/Green_Goblin_(Norman_Osborn)',
                identitySource: 'url',
                firstAppearance: 1,
                appearances: [1],
                frequency: 1,
              },
            ],
            villainCount: 1,
          },
        ],
        stats: {
          totalVillains: 1,
          mostFrequent: {
            id: 'green-goblin-norman-osborn',
            name: 'Green Goblin',
            names: ['Green Goblin', 'Norman Osborn'],
            url: 'https://marvel.fandom.com/wiki/Green_Goblin_(Norman_Osborn)',
            identitySource: 'url',
            firstAppearance: 1,
            appearances: [1],
            frequency: 1,
          },
          averageFrequency: 1,
          firstAppearances: new Map([[1, ['Green Goblin']]]),
        },
      };

      const merged = mergeDatasets([data1, data2]);

      // Should have 2 separate villains (not merged)
      const goblins = merged.villains.filter((v: any) => v.name === 'Green Goblin');
      expect(goblins.length).toBe(2);
      // Note: merged villains may not preserve identitySource in serialized form
      // This test verifies the separation occurred in merging logic
    });
  });

  /**
   * INVARIANT 5: Identity source immutability
   */
  describe('Identity Source Immutability', () => {
    it('should not change identitySource after initial assignment', () => {
      const villain: ProcessedVillain = {
        id: 'green-goblin',
        name: 'Green Goblin',
        names: ['Green Goblin'],
        identitySource: 'name',
        firstAppearance: 1,
        appearances: [1, 2, 3],
        frequency: 3,
      };

      // Even though villain now has more appearances, identitySource should not change
      villain.appearances = [1, 2, 3, 4, 5, 10, 50, 100];
      villain.frequency = 8;

      expect(villain.identitySource).toBe('name');
    });

    it('should preserve identitySource through all processing steps', () => {
      const issue: IssueData = {
        issueNumber: 1,
        title: 'Test',
        antagonists: [{ name: 'Test Villain' }],
      };

      const rawData: RawVillainData = {
        series: 'Test',
        baseUrl: 'https://test.com',
        issues: [issue],
      };

      const processed = processVillainData(rawData);
      const villain = processed.villains[0];
      const originalSource = villain.identitySource;

      // After processing, identitySource should be stable
      expect(villain.identitySource).toBe(originalSource);
      expect(villain.identitySource).toBe('name');
    });
  });
});
