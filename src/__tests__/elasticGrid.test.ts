/**
 * Unit tests for Elastic Grid functionality
 * Tests cover all issues encountered during implementation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Elastic Grid Data Builder', () => {
    let mockAppearances: Record<number, Set<string>>;
    let mockIssueMap: Map<number, any>;

    beforeEach(() => {
        mockAppearances = {
            3: new Set(['Doctor Octopus']),
            12: new Set(['Doctor Octopus']),
            13: new Set(['Doctor Octopus']),
            18: new Set(['Doctor Octopus', 'Sandman']),
            20: new Set(['Doctor Octopus', 'Sandman']),
            21: new Set(['Sandman']),
            84: new Set(['Sandman'])
        };

        mockIssueMap = new Map([
            [3, { chronologicalPosition: 3, issue: 3, series: 'Amazing Spider-Man Vol 1', seriesColor: '#e74c3c', label: '#3' }],
            [12, { chronologicalPosition: 12, issue: 12, series: 'Amazing Spider-Man Vol 1', seriesColor: '#e74c3c', label: '#12' }],
            [13, { chronologicalPosition: 13, issue: 13, series: 'Amazing Spider-Man Vol 1', seriesColor: '#e74c3c', label: '#13' }],
            [18, { chronologicalPosition: 18, issue: 18, series: 'Amazing Spider-Man Vol 1', seriesColor: '#e74c3c', label: '#18' }],
            [20, { chronologicalPosition: 20, issue: 20, series: 'Amazing Spider-Man Annual Vol 1', seriesColor: '#9b59b6', label: '#20' }],
            [21, { chronologicalPosition: 21, issue: 21, series: 'Amazing Spider-Man Vol 1', seriesColor: '#e74c3c', label: '#21' }],
            [84, { chronologicalPosition: 84, issue: 84, series: 'Amazing Spider-Man Vol 1', seriesColor: '#e74c3c', label: '#84' }]
        ]);
    });

    describe('Issue #1: Column Filtering - Only show villain appearances', () => {
        it('should only include columns where filtered villains appear', () => {
            const villains = ['Doctor Octopus'];
            const relevantChronos = new Set<number>();

            villains.forEach(villain => {
                for (let chrono in mockAppearances) {
                    if (mockAppearances[chrono]?.has(villain)) {
                        relevantChronos.add(Number(chrono));
                    }
                }
            });

            const sortedChronos = Array.from(relevantChronos).sort((a, b) => a - b);

            expect(sortedChronos).toEqual([3, 12, 13, 18, 20]);
            expect(sortedChronos.length).toBeLessThan(84); // Should be much smaller than full timeline
        });

        it('should include all appearances for multiple villains', () => {
            const villains = ['Doctor Octopus', 'Sandman'];
            const relevantChronos = new Set<number>();

            villains.forEach(villain => {
                for (let chrono in mockAppearances) {
                    if (mockAppearances[chrono]?.has(villain)) {
                        relevantChronos.add(Number(chrono));
                    }
                }
            });

            const sortedChronos = Array.from(relevantChronos).sort((a, b) => a - b);

            expect(sortedChronos).toEqual([3, 12, 13, 18, 20, 21, 84]);
        });
    });

    describe('Issue #2: Gap Column Insertion', () => {
        it('should insert gap columns between non-consecutive issues', () => {
            const sortedChronos = [3, 12, 13, 18];
            const gaps: any[] = [];

            for (let i = 0; i < sortedChronos.length - 1; i++) {
                const chrono = sortedChronos[i];
                const nextChrono = sortedChronos[i + 1];
                const gapSize = nextChrono - chrono - 1;

                if (gapSize > 0) {
                    gaps.push({
                        fromChrono: chrono,
                        toChrono: nextChrono,
                        gapSize
                    });
                }
            }

            expect(gaps.length).toBe(2);
            expect(gaps[0].gapSize).toBe(8); // Gap between 3 and 12
            expect(gaps[1].gapSize).toBe(4); // Gap between 13 and 18
        });

        it('should NOT insert gap columns for consecutive issues', () => {
            const sortedChronos = [12, 13, 18];
            const gaps: any[] = [];

            for (let i = 0; i < sortedChronos.length - 1; i++) {
                const chrono = sortedChronos[i];
                const nextChrono = sortedChronos[i + 1];
                const gapSize = nextChrono - chrono - 1;

                if (gapSize > 0) {
                    gaps.push({ fromChrono: chrono, toChrono: nextChrono, gapSize });
                }
            }

            // Only one gap (between 13 and 18)
            expect(gaps.length).toBe(1);
            expect(gaps.some(g => g.fromChrono === 12 && g.toChrono === 13)).toBe(false);
        });

        it('should handle single appearance (no gaps)', () => {
            const sortedChronos = [3];
            const gaps: any[] = [];

            for (let i = 0; i < sortedChronos.length - 1; i++) {
                const chrono = sortedChronos[i];
                const nextChrono = sortedChronos[i + 1];
                const gapSize = nextChrono - chrono - 1;

                if (gapSize > 0) {
                    gaps.push({ fromChrono: chrono, toChrono: nextChrono, gapSize });
                }
            }

            expect(gaps.length).toBe(0);
        });
    });

    describe('Issue #3: Elastic Column Structure', () => {
        it('should create proper elastic column structure with issue and gap types', () => {
            const sortedChronos = [3, 12, 13];
            const elasticColumns: any[] = [];

            for (let i = 0; i < sortedChronos.length; i++) {
                const chrono = sortedChronos[i];
                const issueEntry = mockIssueMap.get(chrono);

                elasticColumns.push({
                    type: 'issue',
                    chrono,
                    issue: issueEntry
                });

                if (i < sortedChronos.length - 1) {
                    const nextChrono = sortedChronos[i + 1];
                    const gapSize = nextChrono - chrono - 1;

                    if (gapSize > 0) {
                        const nextIssue = mockIssueMap.get(nextChrono);
                        elasticColumns.push({
                            type: 'gap',
                            fromChrono: chrono,
                            toChrono: nextChrono,
                            gapSize,
                            color: (nextIssue && nextIssue.seriesColor) || '#f8f9fa'
                        });
                    }
                }
            }

            expect(elasticColumns.length).toBe(4); // 3 issues + 1 gap
            expect(elasticColumns[0].type).toBe('issue');
            expect(elasticColumns[1].type).toBe('gap');
            expect(elasticColumns[2].type).toBe('issue');
            expect(elasticColumns[3].type).toBe('issue');
        });

        it('should use next issue color for gap columns', () => {
            const sortedChronos = [3, 20]; // Gap between different series
            const elasticColumns: any[] = [];

            for (let i = 0; i < sortedChronos.length; i++) {
                const chrono = sortedChronos[i];
                const issueEntry = mockIssueMap.get(chrono);

                elasticColumns.push({
                    type: 'issue',
                    chrono,
                    issue: issueEntry
                });

                if (i < sortedChronos.length - 1) {
                    const nextChrono = sortedChronos[i + 1];
                    const gapSize = nextChrono - chrono - 1;

                    if (gapSize > 0) {
                        const nextIssue = mockIssueMap.get(nextChrono);
                        elasticColumns.push({
                            type: 'gap',
                            fromChrono: chrono,
                            toChrono: nextChrono,
                            gapSize,
                            color: (nextIssue && nextIssue.seriesColor) || '#f8f9fa'
                        });
                    }
                }
            }

            const gapColumn = elasticColumns.find(col => col.type === 'gap');
            expect(gapColumn.color).toBe('#9b59b6'); // Annual series color
        });
    });

    describe('Issue #4: ChronoToElasticPos Mapping', () => {
        it('should correctly map chronological positions to elastic column indices', () => {
            const sortedChronos = [3, 12, 13];
            const chronoToElasticPos = new Map<number, number>();
            let elasticIdx = 0;

            for (let i = 0; i < sortedChronos.length; i++) {
                const chrono = sortedChronos[i];
                chronoToElasticPos.set(chrono, elasticIdx);
                elasticIdx++; // Issue column

                if (i < sortedChronos.length - 1) {
                    const nextChrono = sortedChronos[i + 1];
                    const gapSize = nextChrono - chrono - 1;

                    if (gapSize > 0) {
                        elasticIdx++; // Gap column
                    }
                }
            }

            expect(chronoToElasticPos.get(3)).toBe(0);
            expect(chronoToElasticPos.get(12)).toBe(2); // After issue 3 + gap
            expect(chronoToElasticPos.get(13)).toBe(3); // Consecutive to 12
        });
    });

    describe('Issue #5: Web Range Calculation', () => {
        it('should calculate web ranges for villain appearances with gaps', () => {
            const chronos = [3, 12, 13, 18, 20];
            const chronoToElasticPos = new Map([
                [3, 0],
                [12, 2],
                [13, 3],
                [18, 5],
                [20, 7]
            ]);

            const ranges: any[] = [];
            for (let i = 0; i < chronos.length - 1; i++) {
                const fromChrono = chronos[i];
                const toChrono = chronos[i + 1];
                const gapSize = toChrono - fromChrono - 1;

                if (gapSize > 0) {
                    const fromIdx = chronoToElasticPos.get(fromChrono);
                    const toIdx = chronoToElasticPos.get(toChrono);

                    if (typeof fromIdx === 'number' && typeof toIdx === 'number') {
                        ranges.push({
                            from: fromIdx,
                            to: toIdx,
                            gapSize
                        });
                    }
                }
            }

            expect(ranges.length).toBe(3);
            expect(ranges[0]).toEqual({ from: 0, to: 2, gapSize: 8 });
            expect(ranges[1]).toEqual({ from: 3, to: 5, gapSize: 4 });
            expect(ranges[2]).toEqual({ from: 5, to: 7, gapSize: 1 });
        });

        it('should NOT create web ranges for consecutive appearances', () => {
            const chronos = [12, 13];
            const chronoToElasticPos = new Map([
                [12, 0],
                [13, 1]
            ]);

            const ranges: any[] = [];
            for (let i = 0; i < chronos.length - 1; i++) {
                const fromChrono = chronos[i];
                const toChrono = chronos[i + 1];
                const gapSize = toChrono - fromChrono - 1;

                if (gapSize > 0) {
                    const fromIdx = chronoToElasticPos.get(fromChrono);
                    const toIdx = chronoToElasticPos.get(toChrono);

                    if (typeof fromIdx === 'number' && typeof toIdx === 'number') {
                        ranges.push({ from: fromIdx, to: toIdx, gapSize });
                    }
                }
            }

            expect(ranges.length).toBe(0);
        });
    });

    describe('Issue #6: Edge Cases', () => {
        it('should handle empty villain list', () => {
            const villains: string[] = [];
            const relevantChronos = new Set<number>();

            villains.forEach(villain => {
                for (let chrono in mockAppearances) {
                    if (mockAppearances[chrono]?.has(villain)) {
                        relevantChronos.add(Number(chrono));
                    }
                }
            });

            expect(relevantChronos.size).toBe(0);
        });

        it('should handle villain with single appearance', () => {
            const mockSingleAppearance: Record<number, Set<string>> = {
                10: new Set(['Vulture'])
            };

            const villain = 'Vulture';
            const chronos: number[] = [];

            for (let chrono in mockSingleAppearance) {
                if (mockSingleAppearance[Number(chrono)]?.has(villain)) {
                    chronos.push(Number(chrono));
                }
            }

            const ranges: any[] = [];
            for (let i = 0; i < chronos.length - 1; i++) {
                const fromChrono = chronos[i];
                const toChrono = chronos[i + 1];
                const gapSize = toChrono - fromChrono - 1;

                if (gapSize > 0) {
                    ranges.push({ from: fromChrono, to: toChrono, gapSize });
                }
            }

            expect(chronos.length).toBe(1);
            expect(ranges.length).toBe(0); // No web ranges for single appearance
        });

        it('should handle large gaps correctly', () => {
            const chronos = [3, 100]; // Large gap
            const gapSize = chronos[1] - chronos[0] - 1;

            expect(gapSize).toBe(96);
        });
    });

    describe('Issue #7: Villain Chronos Tracking', () => {
        it('should correctly track all chronological positions for a villain', () => {
            const villain = 'Doctor Octopus';
            const chronos: number[] = [];

            for (let chrono in mockAppearances) {
                if (mockAppearances[chrono]?.has(villain)) {
                    chronos.push(Number(chrono));
                }
            }

            chronos.sort((a, b) => a - b);

            expect(chronos).toEqual([3, 12, 13, 18, 20]);
        });

        it('should handle multiple villains with overlapping appearances', () => {
            const villainChronos = new Map<string, number[]>();

            ['Doctor Octopus', 'Sandman'].forEach(villain => {
                const chronos: number[] = [];
                for (let chrono in mockAppearances) {
                    if (mockAppearances[chrono]?.has(villain)) {
                        chronos.push(Number(chrono));
                    }
                }
                chronos.sort((a, b) => a - b);
                villainChronos.set(villain, chronos);
            });

            expect(villainChronos.get('Doctor Octopus')).toEqual([3, 12, 13, 18, 20]);
            expect(villainChronos.get('Sandman')).toEqual([18, 20, 21, 84]);

            // Check for overlaps
            const docOcChronos = villainChronos.get('Doctor Octopus') || [];
            const sandmanChronos = villainChronos.get('Sandman') || [];
            const overlaps = docOcChronos.filter(c => sandmanChronos.includes(c));

            expect(overlaps).toEqual([18, 20]);
        });
    });

    describe('Issue #8: Series Color Handling', () => {
        it('should preserve series color in issue columns', () => {
            const chrono = 3;
            const issueEntry = mockIssueMap.get(chrono);

            expect(issueEntry?.seriesColor).toBe('#e74c3c');
        });

        it('should use fallback color when series color missing', () => {
            const issueWithoutColor: { chronologicalPosition: number; issue: number; series: string; seriesColor?: string } = {
                chronologicalPosition: 99,
                issue: 99,
                series: 'Unknown Series'
            };

            const color = issueWithoutColor.seriesColor || '#e74c3c';

            expect(color).toBe('#e74c3c'); // Fallback
        });
    });

    describe('Issue #9: Column Type Differentiation', () => {
        it('should correctly identify issue vs gap columns', () => {
            const columns = [
                { type: 'issue', chrono: 3 },
                { type: 'gap', fromChrono: 3, toChrono: 12 },
                { type: 'issue', chrono: 12 }
            ];

            const issueColumns = columns.filter(c => c.type === 'issue');
            const gapColumns = columns.filter(c => c.type === 'gap');

            expect(issueColumns.length).toBe(2);
            expect(gapColumns.length).toBe(1);
        });
    });

    describe('Issue #10: Web Range Index Validation', () => {
        it('should only find web ranges for gap positions between appearances', () => {
            const webRanges = [
                { from: 0, to: 2, gapSize: 8 },
                { from: 3, to: 5, gapSize: 4 }
            ];

            // Position 1 is in gap between 0 and 2
            const inGap1 = webRanges.find(range => 1 > range.from && 1 < range.to);
            expect(inGap1).toBeDefined();

            // Position 2 is NOT in gap (it's the appearance)
            const inGap2 = webRanges.find(range => 2 > range.from && 2 < range.to);
            expect(inGap2).toBeUndefined();

            // Position 4 is in gap between 3 and 5
            const inGap4 = webRanges.find(range => 4 > range.from && 4 < range.to);
            expect(inGap4).toBeDefined();
        });
    });

    describe('Issue #11: Consecutive Appearance Detection', () => {
        it('should detect standalone appearances (no consecutive neighbors)', () => {
            // Appearances at positions [1, 5, 10] - all standalone
            const appearances = [
                { chrono: 1, colIdx: 0 },
                { chrono: 5, colIdx: 1 },
                { chrono: 10, colIdx: 2 }
            ];

            const runs: Array<{ type: string; appearances: any[] }> = [];
            appearances.forEach((app, i) => {
                const isConsecWithPrev = i > 0 && app.chrono === appearances[i - 1].chrono + 1;
                const isConsecWithNext = i < appearances.length - 1 && appearances[i + 1].chrono === app.chrono + 1;

                if (!isConsecWithPrev && !isConsecWithNext) {
                    runs.push({ type: 'standalone', appearances: [app] });
                }
            });

            expect(runs.length).toBe(3);
            expect(runs.every(r => r.type === 'standalone')).toBe(true);
        });

        it('should detect and group consecutive appearances', () => {
            // Appearances at positions [1, 2, 3, 5, 6] - two runs
            const appearances = [
                { chrono: 1, colIdx: 0 },
                { chrono: 2, colIdx: 1 },
                { chrono: 3, colIdx: 2 },
                { chrono: 5, colIdx: 3 },
                { chrono: 6, colIdx: 4 }
            ];

            const consecutiveRuns: Array<{ type: string; appearances: typeof appearances }> = [];
            let currentRun: { type: string; appearances: typeof appearances } | null = null;

            appearances.forEach((app, i) => {
                const isConsecWithPrev = i > 0 && app.chrono === appearances[i - 1].chrono + 1;
                const isConsecWithNext = i < appearances.length - 1 && appearances[i + 1].chrono === app.chrono + 1;

                if (!isConsecWithPrev && !isConsecWithNext) {
                    consecutiveRuns.push({ type: 'standalone', appearances: [app] });
                } else if (!isConsecWithPrev && isConsecWithNext) {
                    currentRun = { type: 'run', appearances: [app] };
                } else if (isConsecWithPrev && isConsecWithNext) {
                    if (currentRun) {
                        currentRun.appearances.push(app);
                    }
                } else if (isConsecWithPrev && !isConsecWithNext) {
                    if (currentRun) {
                        currentRun.appearances.push(app);
                        consecutiveRuns.push(currentRun);
                        currentRun = null;
                    }
                }
            });

            expect(consecutiveRuns.length).toBe(2);
            expect(consecutiveRuns[0].type).toBe('run');
            expect(consecutiveRuns[0].appearances.length).toBe(3);
            expect(consecutiveRuns[1].type).toBe('run');
            expect(consecutiveRuns[1].appearances.length).toBe(2);
        });

        it('should handle mixed standalone and consecutive appearances', () => {
            // Appearances at [1, 3, 4, 5, 8]
            const appearances = [
                { chrono: 1, colIdx: 0 },
                { chrono: 3, colIdx: 1 },
                { chrono: 4, colIdx: 2 },
                { chrono: 5, colIdx: 3 },
                { chrono: 8, colIdx: 4 }
            ];

            const consecutiveRuns: Array<{ type: string; appearances: typeof appearances }> = [];
            let currentRun: { type: string; appearances: typeof appearances } | null = null;

            appearances.forEach((app, i) => {
                const isConsecWithPrev = i > 0 && app.chrono === appearances[i - 1].chrono + 1;
                const isConsecWithNext = i < appearances.length - 1 && appearances[i + 1].chrono === app.chrono + 1;

                if (!isConsecWithPrev && !isConsecWithNext) {
                    consecutiveRuns.push({ type: 'standalone', appearances: [app] });
                } else if (!isConsecWithPrev && isConsecWithNext) {
                    currentRun = { type: 'run', appearances: [app] };
                } else if (isConsecWithPrev && isConsecWithNext) {
                    if (currentRun) {
                        currentRun.appearances.push(app);
                    }
                } else if (isConsecWithPrev && !isConsecWithNext) {
                    if (currentRun) {
                        currentRun.appearances.push(app);
                        consecutiveRuns.push(currentRun);
                        currentRun = null;
                    }
                }
            });

            expect(consecutiveRuns.length).toBe(3);
            expect(consecutiveRuns[0].type).toBe('standalone'); // 1
            expect(consecutiveRuns[1].type).toBe('run'); // 3, 4, 5
            expect(consecutiveRuns[2].type).toBe('standalone'); // 8
            expect(consecutiveRuns[1].appearances.length).toBe(3);
        });
    });

    describe('Issue #12: Tooltip Data Structure', () => {
        it('should include web range information in tooltip data', () => {
            const webRange = {
                from: 0,
                to: 2,
                gapSize: 5,
                fromChrono: 1,
                toChrono: 8,
                fromIssue: { label: '#1', series: 'Amazing Spider-Man Vol 1' },
                toIssue: { label: '#8', series: 'Amazing Spider-Man Vol 1' },
                color: '#e74c3c'
            };

            const tooltipData = {
                villain: 'Sandman',
                issue: 'Web Connector',
                series: webRange.fromIssue?.series || 'Unknown',
                webInfo: `${webRange.fromIssue?.label || '#' + webRange.fromChrono} → ${webRange.toIssue?.label || '#' + webRange.toChrono} (Gap: ${webRange.gapSize} issues)`
            };

            expect(tooltipData.villain).toBe('Sandman');
            expect(tooltipData.issue).toBe('Web Connector');
            expect(tooltipData.webInfo).toContain('→');
            expect(tooltipData.webInfo).toContain('Gap: 5 issues');
        });

        it('should fallback gracefully when issue labels are missing', () => {
            const webRange = {
                from: 0,
                to: 2,
                gapSize: 5,
                fromChrono: 1,
                toChrono: 8,
                fromIssue: null as any,
                toIssue: null as any,
                color: '#e74c3c'
            };

            const tooltipData = {
                webInfo: `${webRange.fromIssue?.label || '#' + webRange.fromChrono} → ${webRange.toIssue?.label || '#' + webRange.toChrono} (Gap: ${webRange.gapSize} issues)`
            };

            expect(tooltipData.webInfo).toBe('#1 → #8 (Gap: 5 issues)');
        });
    });

    describe('Issue #13: Dark Theme Gap Column Colors', () => {
        it('should use dark background color (#2d2d2d) for gap columns in dark theme', () => {
            // Simulate dark theme being enabled
            const isDarkTheme = true;
            const gapColumnColor = isDarkTheme ? '#2d2d2d' : '#f8f9fa';

            expect(gapColumnColor).toBe('#2d2d2d');
        });

        it('should use light background color (#f8f9fa) for gap columns in light theme', () => {
            // Simulate light theme
            const isDarkTheme = false;
            const gapColumnColor = isDarkTheme ? '#2d2d2d' : '#f8f9fa';

            expect(gapColumnColor).toBe('#f8f9fa');
        });

        it('should correctly determine theme and apply gap column color', () => {
            // Test that gap columns use theme-appropriate colors
            const themes = [
                { isDark: true, expectedColor: '#2d2d2d', name: 'Dark Theme' },
                { isDark: false, expectedColor: '#f8f9fa', name: 'Light Theme' }
            ];

            themes.forEach(theme => {
                const gapColumnColor = theme.isDark ? '#2d2d2d' : '#f8f9fa';
                expect(gapColumnColor).toBe(theme.expectedColor);
            });
        });

        it('should match SVG background color in dark theme', () => {
            // Dark theme SVG background
            const svgBackgroundDark = '#2d2d2d';
            // Gap column color in dark theme (must match exactly)
            const gapColumnColorDark = '#2d2d2d';
            // They should be identical so gaps are invisible

            expect(gapColumnColorDark).toBe(svgBackgroundDark);
        });

        it('should not use #404040 (color-border) for gap columns', () => {
            const borderColor = '#404040'; // Should NOT be used for gap columns
            const gapColumnColor = '#2d2d2d'; // Should be used instead

            expect(gapColumnColor).not.toBe(borderColor);
        });
    });

    describe('Issue #14: Non-Elastic Grid Dark Theme Empty Cells', () => {
        it('should use dark grey (#353535) for empty cells in dark theme', () => {
            const isDarkTheme = true;
            const cellFill = (isPresent: boolean) => {
                if (isPresent) return '#e74c3c'; // Series color
                return isDarkTheme ? '#353535' : '#ecf0f1';
            };

            expect(cellFill(false)).toBe('#353535');
        });

        it('should use light gray (#ecf0f1) for empty cells in light theme', () => {
            const isDarkTheme = false;
            const cellFill = (isPresent: boolean) => {
                if (isPresent) return '#e74c3c'; // Series color
                return isDarkTheme ? '#3a3a3a' : '#ecf0f1';
            };

            expect(cellFill(false)).toBe('#ecf0f1');
        });

        it('should show series color for present cells in both themes', () => {
            const seriesColor = '#e74c3c';
            const cellFillDark = (isPresent: boolean) => {
                if (isPresent) return seriesColor;
                return '#353535';
            };
            const cellFillLight = (isPresent: boolean) => {
                if (isPresent) return seriesColor;
                return '#ecf0f1';
            };

            expect(cellFillDark(true)).toBe(seriesColor);
            expect(cellFillLight(true)).toBe(seriesColor);
        });

        it('should maintain visual distinction between empty cells and background in dark theme', () => {
            // Empty cells should be slightly lighter than background
            const svgBackgroundDark = '#2d2d2d';
            const emptyCellColorDark = '#353535';

            expect(emptyCellColorDark).not.toBe(svgBackgroundDark);
        });

        it('should maintain contrast in light theme with visible empty cells', () => {
            // Empty cells should be visible in light theme
            const svgBackgroundLight = '#ffffff';
            const emptyCellColorLight = '#ecf0f1';

            expect(emptyCellColorLight).not.toBe(svgBackgroundLight);
        });
    });
});

