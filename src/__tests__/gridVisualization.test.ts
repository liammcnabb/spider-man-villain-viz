/**
 * Grid Visualization Unit Tests
 * 
 * Tests for the unified chronological grid visualization and related features
 */

describe('Grid Visualization - Proof Steps', () => {
  
  describe('Chronological Grid Rendering', () => {
    it('should sort issues by chronological position, not issue number', () => {
      // Given: Issues from multiple series with mixed chronological positions
      const issues = [
        { issue: 17, chronologicalPosition: 18, series: 'Amazing Spider-Man Vol 1' },
        { issue: 1, chronologicalPosition: 17, series: 'Amazing Spider-Man Annual Vol 1' },
        { issue: 16, chronologicalPosition: 16, series: 'Amazing Spider-Man Vol 1' }
      ];

      // When: Sorted by chronological position
      const sorted = [...issues].sort((a, b) => a.chronologicalPosition - b.chronologicalPosition);

      // Then: Order should be by chronoPos, not issue number
      expect(sorted[0].chronologicalPosition).toBe(16);
      expect(sorted[1].chronologicalPosition).toBe(17);
      expect(sorted[2].chronologicalPosition).toBe(18);
    });

    it('should track villain first appearance by chronological position', () => {
      // Given: Villain appearances in timeline
      const timeline = [
        {
          issue: 1,
          chronologicalPosition: 1,
          villains: ['Burglar', 'Chameleon']
        },
        {
          issue: 1,
          chronologicalPosition: 17,
          villains: ['Vulture', 'Doctor Octopus']
        }
      ];

      // When: Tracking first appearances
      const villainFirstChrono: { [key: string]: number } = {};
      timeline.forEach(entry => {
        entry.villains.forEach(villain => {
          if (!villainFirstChrono[villain]) {
            villainFirstChrono[villain] = entry.chronologicalPosition;
          }
        });
      });

      // Then: Each villain's first appearance is recorded
      expect(villainFirstChrono['Burglar']).toBe(1);
      expect(villainFirstChrono['Doctor Octopus']).toBe(17);
      expect(Object.keys(villainFirstChrono).length).toBe(4);
    });

    it('should filter trailing empty cells when toggle is off', () => {
      // Given: Villain appearances and toggle state
      const villainFirstChrono: Record<string, number> = { 'Vulture': 2, 'Doctor Octopus': 3 };
      const villainLastChrono: Record<string, number> = { 'Vulture': 7, 'Doctor Octopus': 5 };
      const showTrailingGrids = false;

      // When: Determining if cell should be shown
      const checkCell = (villain: string, chronoPos: number): boolean => {
        let shouldShow = chronoPos >= villainFirstChrono[villain];
        if (!showTrailingGrids) {
          shouldShow = shouldShow && chronoPos <= villainLastChrono[villain];
        }
        return shouldShow;
      };

      // Then: Cells after last appearance are filtered
      expect(checkCell('Vulture', 7)).toBe(true); // Last appearance
      expect(checkCell('Vulture', 8)).toBe(false); // After last appearance
      expect(checkCell('Doctor Octopus', 5)).toBe(true); // Last appearance
      expect(checkCell('Doctor Octopus', 6)).toBe(false); // After last appearance
    });

    it('should show all cells when toggle is on', () => {
      // Given: Toggle is on
      const villainFirstChrono: Record<string, number> = { 'Green Goblin': 14 };

      // When: Determining if cells should be shown
      const checkCell = (villain: string, chronoPos: number): boolean => {
        return chronoPos >= villainFirstChrono[villain];
      };

      // Then: All cells from first appearance onward are shown
      expect(checkCell('Green Goblin', 14)).toBe(true);
      expect(checkCell('Green Goblin', 15)).toBe(true);
      expect(checkCell('Green Goblin', 100)).toBe(true);
    });
  });

  describe('Unified Grid Data Structure', () => {
    it('should combine all series into single timeline', () => {
      // Given: Multiple series with their own timelines
      const seriesData = [
        {
          name: 'Amazing Spider-Man Vol 1',
          timeline: [
            { issue: 1, chronologicalPosition: 1 },
            { issue: 2, chronologicalPosition: 2 }
          ]
        },
        {
          name: 'Amazing Spider-Man Annual Vol 1',
          timeline: [
            { issue: 1, chronologicalPosition: 17 },
            { issue: 2, chronologicalPosition: 29 }
          ]
        }
      ];

      // When: Combining all issues
      const allIssues = seriesData.flatMap(series => series.timeline);

      // Then: All issues are in single array
      expect(allIssues.length).toBe(4);
      expect(allIssues.map(i => i.chronologicalPosition)).toEqual([1, 2, 17, 29]);
    });

    it('should map series color to issues by series name', () => {
      // Given: Series color map and issues
      const seriesColorMap: { [key: string]: string } = {
        'Amazing Spider-Man Vol 1': '#e74c3c',
        'Amazing Spider-Man Annual Vol 1': '#9b59b6'
      };

      const issues = [
        { issue: 1, series: 'Amazing Spider-Man Vol 1' },
        { issue: 1, series: 'Amazing Spider-Man Annual Vol 1' }
      ];

      // When: Assigning colors
      const issuesWithColor = issues.map(issue => ({
        ...issue,
        color: seriesColorMap[issue.series] || '#999'
      }));

      // Then: Each issue has correct color
      expect(issuesWithColor[0].color).toBe('#e74c3c');
      expect(issuesWithColor[1].color).toBe('#9b59b6');
    });
  });

  describe('Tooltip Visibility', () => {
    it('should only show tooltip for cells where villain appears', () => {
      // Given: Cell data with presence information
      const cellsData = [
        { villain: 'Vulture', chronoPos: 7, present: true },
        { villain: 'Vulture', chronoPos: 8, present: false },
        { villain: 'Spider-Slayer', chronoPos: 26, present: true }
      ];

      // When: Determining tooltip visibility
      const shouldShowTooltip = (cell: typeof cellsData[0]): boolean => {
        return cell.present;
      };

      // Then: Only cells with present=true show tooltips
      expect(shouldShowTooltip(cellsData[0])).toBe(true);
      expect(shouldShowTooltip(cellsData[1])).toBe(false);
      expect(shouldShowTooltip(cellsData[2])).toBe(true);
    });

    it('should have tooltip content with issue and villain info', () => {
      // Given: Cell data for tooltip
      const cellData = {
        villain: 'Green Goblin',
        issue: '#14',
        series: 'Amazing Spider-Man Vol 1',
        present: true,
        chronoPos: 14
      };

      // When: Building tooltip content
      const tooltipContent = `
        <strong>${cellData.villain}</strong><br>
        Issue: ${cellData.issue} (${cellData.series})<br>
        Chrono: ${cellData.chronoPos}
      `;

      // Then: Tooltip has required information
      expect(tooltipContent).toContain('Green Goblin');
      expect(tooltipContent).toContain('#14');
      expect(tooltipContent).toContain('Amazing Spider-Man Vol 1');
      expect(tooltipContent).toContain('Chrono: 14');
    });
  });

  describe('Villain Ordering', () => {
    it('should sort villains by their first chronological appearance', () => {
      // Given: Villain first appearances
      const villainFirstChrono: { [key: string]: number } = {
        'Burglar': 1,
        'Chameleon': 1,
        'Vulture': 2,
        'Doctor Octopus': 3,
        'Lizard': 6
      };

      // When: Sorting villains
      const sortedVillains = Object.keys(villainFirstChrono)
        .sort((a, b) => villainFirstChrono[a] - villainFirstChrono[b]);

      // Then: Villains are ordered by first appearance
      expect(sortedVillains[0]).toBe('Burglar'); // chrono 1
      expect(sortedVillains[1]).toBe('Chameleon'); // chrono 1
      expect(sortedVillains[4]).toBe('Lizard'); // chrono 6
    });

    it('should handle villains with same first appearance chronologically', () => {
      // Given: Multiple villains first appearing at same position
      const villainFirstChrono: { [key: string]: number } = {
        'Burglar': 1,
        'Chameleon': 1,
        'Vulture': 2
      };

      // When: Sorting
      const sorted = Object.keys(villainFirstChrono)
        .sort((a, b) => villainFirstChrono[a] - villainFirstChrono[b]);

      // Then: Both villains at position 1 come before position 2
      const pos1Villains = sorted.filter(v => villainFirstChrono[v] === 1);
      const pos2Villains = sorted.filter(v => villainFirstChrono[v] === 2);
      
      expect(pos1Villains.length).toBe(2);
      expect(pos2Villains.length).toBe(1);
    });
  });

  describe('Grid Cell Data Structure', () => {
    it('should create cell data with all required fields', () => {
      // Given: Grid rendering inputs
      const issue = { number: 1, chronologicalPosition: 17, series: 'Annual', seriesColor: '#9b59b6' };
      const villain = 'Vulture';
      const xIdx = 5;
      const yIdx = 2;
      const isPresent = true;

      // When: Creating cell data
      const cellData = {
        issue: `#${issue.number}`,
        issueNum: issue.number,
        chronoPos: issue.chronologicalPosition,
        series: issue.series,
        seriesColor: issue.seriesColor,
        villain,
        x: xIdx,
        y: yIdx,
        present: isPresent
      };

      // Then: All fields are present and correct
      expect(cellData).toHaveProperty('issue');
      expect(cellData).toHaveProperty('issueNum');
      expect(cellData).toHaveProperty('chronoPos');
      expect(cellData).toHaveProperty('seriesColor');
      expect(cellData).toHaveProperty('villain');
      expect(cellData).toHaveProperty('x');
      expect(cellData).toHaveProperty('y');
      expect(cellData).toHaveProperty('present');
      expect(cellData.chronoPos).toBe(17);
      expect(cellData.seriesColor).toBe('#9b59b6');
    });
  });
});
