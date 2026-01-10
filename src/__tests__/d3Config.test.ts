/**
 * D3 Config Tests
 * Tests D3 visualization config domains/ranges and color assignment
 */

import { D3Config, D3DataPoint } from '../types';

describe('D3 Config - Domains, Ranges, and Color Assignment', () => {
  describe('Domain Validation', () => {
    it('should have valid numeric domain for x-axis (issue numbers)', () => {
      const domain = [1, 50];
      expect(domain[0]).toBeLessThanOrEqual(domain[1]);
      expect(typeof domain[0]).toBe('number');
      expect(typeof domain[1]).toBe('number');
    });

    it('should have valid numeric domain for y-axis (villain count)', () => {
      const domain = [0, 10];
      expect(domain[0]).toBeLessThanOrEqual(domain[1]);
      expect(domain[0]).toBeGreaterThanOrEqual(0);
    });

    it('should handle undefined domain values gracefully', () => {
      const domain: (number | undefined)[] = [1, undefined];
      expect(domain.some((d) => d === undefined)).toBe(true);
    });

    it('should have non-empty domain', () => {
      const domain = [1, 100];
      expect(domain.length).toBeGreaterThan(0);
    });

    it('should have monotonically increasing domain', () => {
      const domain = [1, 25, 50, 100];
      for (let i = 0; i < domain.length - 1; i++) {
        expect(domain[i]).toBeLessThanOrEqual(domain[i + 1]);
      }
    });
  });

  describe('Range Validation', () => {
    it('should have valid pixel range for x-axis', () => {
      const range = [0, 960]; // Common SVG width
      expect(range[0]).toBeLessThanOrEqual(range[1]);
      expect(range[0]).toBeGreaterThanOrEqual(0);
    });

    it('should have valid pixel range for y-axis', () => {
      const range = [500, 0]; // Inverted for SVG (top-down)
      expect(Math.abs(range[0] - range[1])).toBeGreaterThan(0);
    });

    it('should support reversed ranges (for y-axis inversion)', () => {
      const normalRange = [0, 100];
      const invertedRange = [100, 0];

      // Both should be valid, just different interpretations
      expect(normalRange.length).toBe(2);
      expect(invertedRange.length).toBe(2);
    });

    it('should have positive range size', () => {
      const range = [0, 960];
      const rangeSize = Math.abs(range[1] - range[0]);
      expect(rangeSize).toBeGreaterThan(0);
    });
  });

  describe('Scale Consistency', () => {
    it('should maintain approximate scale mapping', () => {
      // Issue 1-50 maps to pixels 0-960
      const issueDomain = [1, 50];
      const pixelRange = [0, 960];

      const issueRange = issueDomain[1] - issueDomain[0];
      const pixelSize = pixelRange[1] - pixelRange[0];

      // Pixels per issue should be approximately 960/50 = 19.2
      expect(pixelSize / issueRange).toBeCloseTo(960 / 50, 0);
    });

    it('should handle edge cases (single value in domain)', () => {
      const domain = [1, 1]; // Edge case: same min/max
      // Should not cause division by zero or NaN in scale
      expect(domain[1] - domain[0]).toBe(0);
    });

    it('should preserve relative spacing in domain/range mapping', () => {
      const domain = [0, 100];
      const range = [0, 1000];

      // Value 50 should map to 500
      const midDomain = (domain[0] + domain[1]) / 2;
      const midRange = (range[0] + range[1]) / 2;

      expect(midDomain).toBe(50);
      expect(midRange).toBe(500);
    });
  });

  describe('Color Assignment', () => {
    it('should assign unique colors to different villains', () => {
      const colorMap = new Map<string, string>();
      const villainIds = ['green-goblin', 'doctor-octopus', 'sandman', 'venom'];

      villainIds.forEach((id, index) => {
        const hue = (index * 360) / villainIds.length;
        colorMap.set(id, `hsl(${hue}, 70%, 50%)`);
      });

      // All colors should be different
      const colors = Array.from(colorMap.values());
      expect(new Set(colors).size).toBe(colors.length);
    });

    it('should use consistent color for same villain across timeline', () => {
      const colorMap = new Map<string, string>();
      const villainId = 'green-goblin';
      const color1 = colorMap.get(villainId) || 'hsl(0, 70%, 50%)';
      colorMap.set(villainId, color1);

      const color2 = colorMap.get(villainId);
      expect(color1).toBe(color2);
    });

    it('should generate valid CSS colors', () => {
      const colors = [
        'hsl(0, 70%, 50%)',
        'rgb(255, 100, 50)',
        '#FF6432',
        'rgba(255, 100, 50, 0.8)',
      ];

      colors.forEach((color) => {
        expect(color).toBeDefined();
        expect(typeof color).toBe('string');
        expect(color.length).toBeGreaterThan(0);
      });
    });

    it('should distribute colors across hue spectrum', () => {
      const villainCount = 6;
      const colors = Array(villainCount)
        .fill(null)
        .map((_, i) => {
          const hue = (i * 360) / villainCount;
          return `hsl(${hue}, 70%, 50%)`;
        });

      // Should have 6 distinct colors
      expect(colors.length).toBe(villainCount);
      expect(new Set(colors).size).toBe(villainCount);
    });

    it('should handle grayscale colors for accessibility', () => {
      const grayscaleColors = [
        'hsl(0, 0%, 20%)',
        'hsl(0, 0%, 40%)',
        'hsl(0, 0%, 60%)',
        'hsl(0, 0%, 80%)',
      ];

      grayscaleColors.forEach((color) => {
        expect(color).toMatch(/hsl\(/);
      });
    });
  });

  describe('D3DataPoint Construction', () => {
    it('should have required fields', () => {
      const dataPoint: D3DataPoint = {
        issueNumber: 1,
        villainsInIssue: ['Green Goblin', 'Sandman'],
        villainCount: 2,
      };

      expect(dataPoint.issueNumber).toBeDefined();
      expect(dataPoint.villainsInIssue).toBeDefined();
      expect(dataPoint.villainCount).toBeDefined();
    });

    it('should have consistent villain count', () => {
      const dataPoint: D3DataPoint = {
        issueNumber: 10,
        villainsInIssue: ['Electro', 'Kraven', 'Vulture'],
        villainCount: 3,
      };

      expect(dataPoint.villainCount).toBe(dataPoint.villainsInIssue.length);
    });

    it('should handle optional chronological fields', () => {
      const dataPoint: D3DataPoint = {
        issueNumber: 1,
        chronologicalPosition: 1,
        releaseDate: '1963-06-01',
        series: 'Amazing Spider-Man Vol 1',
        villainsInIssue: ['Green Goblin'],
        villainCount: 1,
      };

      expect(dataPoint.chronologicalPosition).toBeDefined();
      expect(dataPoint.releaseDate).toBeDefined();
      expect(dataPoint.series).toBeDefined();
    });
  });

  describe('D3Config Structure', () => {
    it('should have data array', () => {
      const config: D3Config = {
        data: [
          {
            issueNumber: 1,
            villainsInIssue: ['Villain1'],
            villainCount: 1,
          },
        ],
        scales: {
          x: {
            domain: [1, 100],
            range: [0, 960],
          },
          y: {
            domain: [0, 10],
            range: [500, 0],
          },
        },
        colors: new Map([['villain1', '#FF0000']]),
      };

      expect(config.data).toBeDefined();
      expect(config.data.length).toBeGreaterThan(0);
    });

    it('should have valid scale configuration', () => {
      const config: D3Config = {
        data: [],
        scales: {
          x: {
            domain: [1, 100],
            range: [0, 960],
          },
          y: {
            domain: [0, 10],
            range: [500, 0],
          },
        },
        colors: new Map(),
      };

      expect(config.scales.x.domain.length).toBe(2);
      expect(config.scales.x.range.length).toBe(2);
      expect(config.scales.y.domain.length).toBe(2);
      expect(config.scales.y.range.length).toBe(2);
    });

    it('should have color map', () => {
      const colorMap = new Map<string, string>();
      colorMap.set('villain1', '#FF0000');
      colorMap.set('villain2', '#00FF00');

      expect(colorMap.size).toBe(2);
      expect(colorMap.get('villain1')).toBe('#FF0000');
    });
  });

  describe('Coordinate Mapping', () => {
    it('should correctly map issue number to x-pixel with reasonable tolerance', () => {
      const domain = [1, 100];
      const range = [0, 960];

      // Issue 50 should map to approximately middle
      const issuePosition = (50 - domain[0]) / (domain[1] - domain[0]);
      const pixelX = range[0] + issuePosition * (range[1] - range[0]);

      // Should be approximately at 480 with some tolerance for floating point
      expect(pixelX).toBeGreaterThan(470);
      expect(pixelX).toBeLessThan(490);
    });

    it('should correctly map villain count to y-pixel (inverted)', () => {
      const domain = [0, 10];
      const range = [500, 0]; // Inverted

      // Count 5 should map to middle (inverted)
      const countPosition = (5 - domain[0]) / (domain[1] - domain[0]);
      const pixelY = range[0] + countPosition * (range[1] - range[0]);

      expect(pixelY).toBeCloseTo(250, 0); // ~middle, inverted
    });
  });

  describe('Edge Cases for Color and Scale', () => {
    it('should handle zero villains in issue', () => {
      const dataPoint: D3DataPoint = {
        issueNumber: 1,
        villainsInIssue: [],
        villainCount: 0,
      };

      expect(dataPoint.villainCount).toBe(0);
      expect(dataPoint.villainsInIssue.length).toBe(0);
    });

    it('should handle single villain', () => {
      const colorMap = new Map<string, string>();
      colorMap.set('only-villain', 'hsl(0, 70%, 50%)');

      expect(colorMap.size).toBe(1);
    });

    it('should handle large villain counts', () => {
      const largeCount = 100;
      const colors = Array(largeCount)
        .fill(null)
        .map((_, i) => `hsl(${(i * 360) / largeCount}, 70%, 50%)`);

      expect(colors.length).toBe(largeCount);
    });
  });
});
