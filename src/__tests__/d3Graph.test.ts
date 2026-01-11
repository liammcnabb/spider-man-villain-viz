/**
 * D3 Graph Unit Tests
 * 
 * Proof steps that verify unified D3ConfigBuilder works correctly
 */

import {
  D3ConfigBuilder
} from '../visualization/D3ConfigBuilder';

import type { ProcessedData, D3DataPoint } from '../types';

describe('D3ConfigBuilder - Proof Steps', () => {
  
  const mockProcessedData: ProcessedData = {
    series: 'Amazing Spider-Man Vol 1',
    processedAt: new Date().toISOString(),
    villains: [
      {
        id: 'green-goblin',
        name: 'Green Goblin',
        names: ['Green Goblin'],
        identitySource: 'name',
        firstAppearance: 1,
        appearances: [1, 2, 3],
        frequency: 3
      },
      {
        id: 'doctor-octopus',
        name: 'Doctor Octopus',
        names: ['Doctor Octopus'],
        identitySource: 'name',
        firstAppearance: 3,
        appearances: [3, 5],
        frequency: 2
      }
    ],
    timeline: [
      { issue: 1, villains: [], villainCount: 1 },
      { issue: 2, villains: [], villainCount: 1 },
      { issue: 3, villains: [], villainCount: 2 }
    ],
    stats: {
      totalVillains: 2,
      mostFrequent: {
        id: 'green-goblin',
        name: 'Green Goblin',
        names: ['Green Goblin'],
        identitySource: 'name',
        firstAppearance: 1,
        appearances: [1, 2, 3],
        frequency: 3
      },
      averageFrequency: 2.5,
      firstAppearances: new Map()
    }
  };

  describe('D3ConfigBuilder.build()', () => {
    it('should instantiate with default dimensions', () => {
      const builder = new D3ConfigBuilder();
      expect(builder).toBeDefined();
    });

    it('should instantiate with custom dimensions', () => {
      const builder = new D3ConfigBuilder(800, 400);
      expect(builder).toBeDefined();
    });

    it('should generate valid D3 configuration from ProcessedData', () => {
      const builder = new D3ConfigBuilder();
      const config = builder.build(mockProcessedData);
      
      expect(config).toHaveProperty('data');
      expect(config).toHaveProperty('scales');
      expect(config).toHaveProperty('colors');
    });

    it('should set correct scale domains', () => {
      const builder = new D3ConfigBuilder();
      const config = builder.build(mockProcessedData);
      
      expect(config.scales.x.domain[0]).toBe(1); // Min issue
      expect(config.scales.x.domain[1]).toBe(3); // Max issue
      expect(config.scales.y.domain[0]).toBe(0); // Min villains
      expect(config.scales.y.domain[1]).toBe(2); // Max villains
    });

    it('should set correct scale ranges', () => {
      const width = 1200;
      const height = 600;
      const builder = new D3ConfigBuilder(width, height);
      const config = builder.build(mockProcessedData);
      
      expect(config.scales.x.range.length).toBe(2);
      expect(config.scales.y.range.length).toBe(2);
    });

    it('should generate color map for all villains', () => {
      const builder = new D3ConfigBuilder();
      const config = builder.build(mockProcessedData);
      
      expect(config.colors.has('Green Goblin')).toBe(true);
      expect(config.colors.has('Doctor Octopus')).toBe(true);
    });

    it('should use custom width and height', () => {
      const customWidth = 800;
      const customHeight = 400;
      const builder = new D3ConfigBuilder(customWidth, customHeight);
      const config = builder.build(mockProcessedData);
      
      const xRange = config.scales.x.range;
      const yRange = config.scales.y.range;
      
      // Should use custom dimensions
      expect(xRange[1] - xRange[0]).toBeLessThan(customWidth);
      expect(yRange[0] - yRange[1]).toBeLessThan(customHeight);
    });
  });

  describe('D3ConfigBuilder.exportAsJSON()', () => {
    it('should export config as JSON-serializable object', () => {
      const builder = new D3ConfigBuilder();
      const config = builder.build(mockProcessedData);
      const exported = builder.exportAsJSON(config);
      
      // Should be serializable
      expect(() => JSON.stringify(exported)).not.toThrow();
    });

    it('should preserve all config properties', () => {
      const builder = new D3ConfigBuilder();
      const config = builder.build(mockProcessedData);
      const exported = builder.exportAsJSON(config);
      
      expect(exported).toHaveProperty('data');
      expect(exported).toHaveProperty('scales');
      expect(exported).toHaveProperty('colors');
    });

    it('should convert color map to object', () => {
      const builder = new D3ConfigBuilder();
      const config = builder.build(mockProcessedData);
      const exported = builder.exportAsJSON(config);
      
      expect(typeof (exported as any).colors).toBe('object');
      expect((exported as any).colors).not.toBeInstanceOf(Map);
    });
  });

  describe('D3ConfigBuilder.generateLinePath()', () => {
    it('should generate valid SVG path string', () => {
      const builder = new D3ConfigBuilder();
      const data: D3DataPoint[] = [
        { issueNumber: 1, villainsInIssue: ['A'], villainCount: 1 },
        { issueNumber: 2, villainsInIssue: ['B'], villainCount: 2 },
        { issueNumber: 3, villainsInIssue: ['C'], villainCount: 1 }
      ];

      const xScale = { domain: [1, 3], range: [0, 200] };
      const yScale = { domain: [0, 2], range: [200, 0] };

      const path = builder.generateLinePath(data, xScale, yScale);

      expect(path).toContain('M'); // Move command
      expect(path).toContain('L'); // Line command
    });

    it('should connect all data points', () => {
      const builder = new D3ConfigBuilder();
      const data: D3DataPoint[] = [
        { issueNumber: 1, villainsInIssue: [], villainCount: 1 },
        { issueNumber: 2, villainsInIssue: [], villainCount: 2 },
        { issueNumber: 3, villainsInIssue: [], villainCount: 3 }
      ];

      const xScale = { domain: [1, 3], range: [0, 300] };
      const yScale = { domain: [0, 3], range: [300, 0] };

      const path = builder.generateLinePath(data, xScale, yScale);

      // Should have 2 line segments for 3 points
      const lineCount = (path.match(/L/g) || []).length;
      expect(lineCount).toBe(2);
    });

    it('should handle single data point', () => {
      const builder = new D3ConfigBuilder();
      const data: D3DataPoint[] = [
        { issueNumber: 1, villainsInIssue: [], villainCount: 1 }
      ];

      const xScale = { domain: [1, 1], range: [0, 100] };
      const yScale = { domain: [0, 1], range: [100, 0] };

      const path = builder.generateLinePath(data, xScale, yScale);

      expect(path).toBeDefined();
      expect(path.length).toBeGreaterThan(0);
    });
  });
});


