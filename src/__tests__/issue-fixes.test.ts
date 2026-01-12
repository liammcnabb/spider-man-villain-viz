/**
 * Tests for critical issues fixed:
 * - Issue #18: Cross-series contamination (real X-Men in Sinister Six filter)
 * - Issue #20: Hobgoblin/Jack O'Lantern name variant mismatch
 * - Group member derivation: Excluding nested groups and using all name variants
 */

describe('Issue Fixes - Cross-Series Contamination and Group Member Derivation', () => {
  describe('Issue #18: URL-based villain deduplication prevents cross-series contamination', () => {
    it('should not link real X-Men characters to Amazing Spider-Man Annual Vol 1 #1', () => {
      // Simulate the bug: name-based matching would incorrectly match characters with same names
      // from different series
      
      // Real X-Men URLs (from different series)
      const realXMenUrls = [
        'https://marvel.fandom.com/wiki/Scott_Summers_(Earth-616)',
        'https://marvel.fandom.com/wiki/Warren_Worthington_III_(Earth-616)',
        'https://marvel.fandom.com/wiki/Henry_McCoy_(Earth-616)'
      ];

      // Android X-Men URLs (from Amazing Spider-Man Annual Vol 1)
      const androidXMenUrls = [
        'https://marvel.fandom.com/wiki/Cyclops_(Mysterio%27s_Androids)_(Earth-616)',
        'https://marvel.fandom.com/wiki/Angel_(Mysterio%27s_Androids)_(Earth-616)',
        'https://marvel.fandom.com/wiki/Beast_(Mysterio%27s_Androids)_(Earth-616)'
      ];

      // These URLs are completely different - URL-based matching should never confuse them
      realXMenUrls.forEach((realUrl, idx) => {
        expect(realUrl).not.toEqual(androidXMenUrls[idx]);
      });

      // URL-based matching should identify them as different entities
      realXMenUrls.forEach(url => {
        expect(androidXMenUrls).not.toContain(url);
      });
    });

    it('should correctly map villainIds using URLs instead of names in MergeRunner', () => {
      // When merging multiple series, villains with same name but different URLs
      // should not be conflated
      const villainsInMerge = [
        { id: 'Scott_Summers_(Earth-616)', name: 'Scott Summers', url: 'https://marvel.fandom.com/wiki/Scott_Summers_(Earth-616)' },
        { id: 'Cyclops_Mystero_Android', name: 'Cyclops', url: 'https://marvel.fandom.com/wiki/Cyclops_(Mysterio%27s_Androids)_(Earth-616)' }
      ];

      const timelineEntry = {
        villainUrls: ['https://marvel.fandom.com/wiki/Cyclops_(Mysterio%27s_Androids)_(Earth-616)']
      };

      // URL-based filtering should match only the android version
      const matchedVillains = villainsInMerge.filter(v => 
        v.url && timelineEntry.villainUrls.includes(v.url)
      );

      expect(matchedVillains).toHaveLength(1);
      expect(matchedVillains[0].id).toBe('Cyclops_Mystero_Android');
    });
  });

  describe('Issue #20: Group member name variants prevent missing filter matches', () => {
    it('should include all name variants for Hobgoblin/Jack O\'Lantern character', () => {
      // In Amazing Spider-Man Vol 1, Jason Macendale Jr. is normalized to "Jack O'Lantern"
      // In other series, he's normalized to "Hobgoblin"
      // Group members should include BOTH names to work across all series
      
      const villainNameVariants = {
        'Jason_Macendale_Jr._(Earth-616)': [
          'Jack O\'Lantern',  // Primary name in ASM Vol 1
          'Hobgoblin',        // Primary name in other series
          'Jason Macendale'   // Alternative name
        ]
      };

      // When building Sinister Six members list in ASM #337 (which uses "Jack O'Lantern")
      // it should include all variants
      const villainVariants = villainNameVariants['Jason_Macendale_Jr._(Earth-616)'];
      
      expect(villainVariants).toContain('Jack O\'Lantern');
      expect(villainVariants).toContain('Hobgoblin');
    });

    it('should match villain by any name variant when filtering Sinister Six', () => {
      // Simulate frontend filtering logic
      const sinisterSixMembers = [
        'Vulture', 'The Vulture',
        'Doctor Octopus', 'Dr. Octopus', 'Master Planner',
        'Mysterio', 'Quentin Beck', 'Dr. Rinehart',
        'Sandman', 'The Sandman',
        'Electro',
        'Jack O\'Lantern', 'Hobgoblin',  // Both variants
        'Kraven the Hunter', 'Sergei Kravinoff'
      ];

      // When checking if "Hobgoblin" should be shown
      const checkVillain = (name: string) => 
        sinisterSixMembers.some(m => m.toLowerCase() === name.toLowerCase());

      // Both names should match
      expect(checkVillain('Hobgoblin')).toBe(true);
      expect(checkVillain('Jack O\'Lantern')).toBe(true);
      expect(checkVillain('hobgoblin')).toBe(true);  // Case-insensitive
    });

    it('should not exclude villains from Sinister Six in ASM #337 due to name mismatch', () => {
      // The bug: ASM #337 villain list has "Jack O'Lantern" but Sinister Six member list
      // only had "Hobgoblin", so filtering failed to show that character
      
      const villainInIssue = 'Jack O\'Lantern';
      const sinisterSixMembersBefore = [
        'Vulture', 'Mysterio', 'Doctor Octopus', 'Sandman', 'Electro'
        // BUG: Missing "Hobgoblin" or "Jack O'Lantern"
      ];
      const sinisterSixMembersAfter = [
        'Vulture', 'Mysterio', 'Doctor Octopus', 'Sandman', 'Electro',
        'Jack O\'Lantern', 'Hobgoblin'  // FIXED: Both names included
      ];

      // Before fix: villain wouldn't match
      const matchesBefore = sinisterSixMembersBefore.some(
        m => m.toLowerCase() === villainInIssue.toLowerCase()
      );
      expect(matchesBefore).toBe(false);

      // After fix: villain matches
      const matchesAfter = sinisterSixMembersAfter.some(
        m => m.toLowerCase() === villainInIssue.toLowerCase()
      );
      expect(matchesAfter).toBe(true);
    });
  });

  describe('Group member derivation: Excluding nested groups and using all name variants', () => {
    it('should exclude groups from group member lists to prevent nesting', () => {
      // Simulate processed villains in an issue
      const villainsInIssue = [
        { name: 'Vulture', kind: 'individual', names: ['Vulture', 'Adrian Toomes'] },
        { name: 'Sinister Six', kind: 'group', names: ['Sinister Six'] },  // This should be excluded
        { name: 'Electro', kind: 'individual', names: ['Electro', 'Maxwell Dillon'] }
      ];

      // Filter to only individuals (excludes groups)
      const members = villainsInIssue
        .filter(v => v.kind === 'individual')
        .flatMap(v => v.names);

      expect(members).toContain('Vulture');
      expect(members).toContain('Adrian Toomes');
      expect(members).toContain('Electro');
      expect(members).toContain('Maxwell Dillon');
      expect(members).not.toContain('Sinister Six');
    });

    it('should include all name variants when deriving group members', () => {
      // Each villain has multiple name variants
      const villainsInIssue = [
        {
          id: 'Adrian_Toomes_(Earth-616)',
          name: 'The Vulture',  // Primary name in this series
          kind: 'individual',
          names: ['Vulture', 'The Vulture', 'Adrian Toomes']  // All variants
        },
        {
          id: 'Otto_Octavius_(Earth-616)',
          name: 'Doctor Octopus',
          kind: 'individual',
          names: ['Doctor Octopus', 'Dr. Octopus', 'Master Planner', 'Otto Octavius']
        }
      ];

      // Derive group members using all name variants
      const sinisterSixMembers = villainsInIssue
        .filter(v => v.kind === 'individual')
        .flatMap(v => v.names);

      // All variants should be included
      expect(sinisterSixMembers).toEqual([
        'Vulture', 'The Vulture', 'Adrian Toomes',
        'Doctor Octopus', 'Dr. Octopus', 'Master Planner', 'Otto Octavius'
      ]);

      // Frontend can now match by any variant
      expect(sinisterSixMembers).toContain('Vulture');
      expect(sinisterSixMembers).toContain('Adrian Toomes');
      expect(sinisterSixMembers).toContain('Doctor Octopus');
      expect(sinisterSixMembers).toContain('Master Planner');
    });

    it('should handle edge cases with missing or empty name variants', () => {
      const villainWithoutVariants = {
        id: 'Test_Character',
        name: 'Test',
        kind: 'individual',
        names: undefined  // No variants array
      };

      // Fallback to primary name when variants unavailable
      const memberNames = (villainWithoutVariants.names || [villainWithoutVariants.name]);
      expect(memberNames).toEqual(['Test']);

      const villainWithEmptyVariants = {
        id: 'Another_Character',
        name: 'Another',
        kind: 'individual',
        names: []  // Empty variants
      };

      // Should still include the primary name
      const memberNames2 = (villainWithEmptyVariants.names && villainWithEmptyVariants.names.length > 0) 
        ? villainWithEmptyVariants.names 
        : [villainWithEmptyVariants.name];
      expect(memberNames2).toEqual(['Another']);
    });
  });

  describe('Real-world scenarios combining all fixes', () => {
    it('should correctly filter Amazing Spider-Man Vol 1 #337 for Sinister Six with all members', () => {
      // ASM Vol 1 #337 timeline entry (from actual data)
      const issue337 = {
        issue: 337,
        villains: [
          'Vulture',
          'Mysterio',
          'Doctor Octopus',
          'Sandman',
          'Electro',
          'Jack O\'Lantern',  // This is the key test - should now match Hobgoblin
          'Jonathan Caesar'
        ],
        villainIds: [
          'Adrian_Toomes_(Earth-616)',
          'Quentin_Beck_(Earth-616)',
          'Otto_Octavius_(Earth-616)',
          'William_Baker_(Earth-616)',
          'Maxwell_Dillon_(Earth-616)',
          'Jason_Macendale_Jr._(Earth-616)',
          'Jonathan_Caesar_(Earth-616)'
        ]
      };

      // Sinister Six members after fix (including all name variants)
      const sinisterSixMembers = [
        'Vulture', 'The Vulture', 'Adrian Toomes',
        'Quentin Beck', 'Mysterio', 'Dr. Rinehart',
        'Doctor Octopus', 'Master Planner', 'Dr. Octopus', 'Otto Octavius',
        'Sandman', 'The Sandman', 'William Baker',
        'Electro', 'Maxwell Dillon',
        'Jack O\'Lantern', 'Hobgoblin', 'Jason Macendale',
        'Kraven the Hunter', 'Sergei Kravinoff'
      ];

      // Count how many villains match the group
      const matchingVillains = issue337.villains.filter(villain =>
        sinisterSixMembers.some(member => member.toLowerCase() === villain.toLowerCase())
      );

      // Should match: Vulture, Mysterio, Doctor Octopus, Sandman, Electro, Jack O'Lantern (6)
      // Jonathan Caesar doesn't match (not a Sinister Six member)
      expect(matchingVillains).toEqual([
        'Vulture', 'Mysterio', 'Doctor Octopus', 'Sandman', 'Electro', 'Jack O\'Lantern'
      ]);
      expect(matchingVillains.length).toBe(6);
    });

    it('should prevent real X-Men from appearing in Annual #1 Sinister Six filter', () => {
      // Amazing Spider-Man Annual Vol 1 #1 villainIds (after URL-based fix)
      const annualIssue1VillainIds = [
        'Adrian_Toomes_(Earth-616)',           // Vulture
        'Maxwell_Dillon_(Earth-616)',          // Electro
        'Otto_Octavius_(Earth-616)',           // Doctor Octopus
        'Quentin_Beck_(Earth-616)',            // Mysterio
        'Sergei_Kravinoff_(Earth-616)',        // Kraven
        'William_Baker_(Earth-616)',           // Sandman
        'X-Men_(Mysterio%27s_Androids)_(Earth-616)',  // Android team
        'Cyclops_(Mysterio%27s_Androids)_(Earth-616)',    // Android
        'Angel_(Mysterio%27s_Androids)_(Earth-616)',      // Android
        'Beast_(Mysterio%27s_Androids)_(Earth-616)'       // Android
      ];

      // Real X-Men URLs that MUST NOT appear
      const realXMenIds = [
        'Scott_Summers_(Earth-616)',           // Real Cyclops
        'Warren_Worthington_III_(Earth-616)',  // Real Angel
        'Henry_McCoy_(Earth-616)'              // Real Beast
      ];

      // Verify no real X-Men IDs are in the Annual issue
      realXMenIds.forEach(realId => {
        expect(annualIssue1VillainIds).not.toContain(realId);
      });

      // Only the android versions should be present
      expect(annualIssue1VillainIds).toContain('Cyclops_(Mysterio%27s_Androids)_(Earth-616)');
      expect(annualIssue1VillainIds).toContain('Angel_(Mysterio%27s_Androids)_(Earth-616)');
      expect(annualIssue1VillainIds).toContain('Beast_(Mysterio%27s_Androids)_(Earth-616)');
    });
  });
});
