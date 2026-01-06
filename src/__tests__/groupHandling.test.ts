/**
 * Group Handling Unit Tests
 */

import { processVillainData } from '../utils/dataProcessor';
import type { RawVillainData } from '../types';

describe('Group Handling', () => {
  it('should classify and exclude groups from villain stats', () => {
    const rawData: RawVillainData = {
      series: 'Test Series',
      baseUrl: 'https://example.com',
      issues: [
        {
          issueNumber: 1,
          title: 'Issue 1',
          antagonists: [
            { name: "Kingpin's Henchmen", url: 'https://marvel.fandom.com/wiki/Kingpin' },
            { name: 'Shocker', url: 'https://marvel.fandom.com/wiki/Shocker_(Herman_Schultz)' }
          ]
        }
      ]
    };

    const result = processVillainData(rawData);

    // Only individuals should be in villains
    expect(result.villains.map(v => v.name)).toContain('Shocker');
    expect(result.villains.some(v => v.name.includes('Henchmen'))).toBe(false);

    // Stats should reflect only individuals
    expect(result.stats.totalVillains).toBe(1);
    expect(result.timeline[0].villainCount).toBe(1);

    // Groups should be tracked separately with members
    expect(result.groups && result.groups.length).toBeGreaterThan(0);
    const timelineGroups = result.timeline[0].groups || [];
    expect(timelineGroups.some(g => g.name.includes('Henchmen'))).toBe(true);
    const henchmen = timelineGroups.find(g => g.name.includes('Henchmen'))!;
    expect(henchmen.members).toContain('Shocker');
  });

  it('should track multiple group appearances without double-counting villains', () => {
    const rawData: RawVillainData = {
      series: 'Test Series',
      baseUrl: 'https://example.com',
      issues: [
        { issueNumber: 1, title: 'Issue 1', antagonists: [{ name: 'Sinister Six' }, { name: 'Doctor Octopus' }] },
        { issueNumber: 2, title: 'Issue 2', antagonists: [{ name: 'Sinister Six' }, { name: 'Mysterio' }] }
      ]
    };

    const result = processVillainData(rawData);

    expect(result.stats.totalVillains).toBe(2); // Doc Ock + Mysterio
    expect(result.timeline[0].villainCount).toBe(1);
    expect(result.timeline[1].villainCount).toBe(1);

    // Groups summary
    expect(result.groups && result.groups.length).toBeGreaterThan(0);
    const sinisterSix = result.groups!.find(g => g.name === 'Sinister Six')!;
    expect(sinisterSix.frequency).toBe(2);
    expect(sinisterSix.appearances).toEqual([1, 2]);
  });
});
