/**
 * Command Parser Unit Tests
 * 
 * Tests for the enhanced CLI command parser
 */

import {
  parseCommandArgs,
  ScrapeCommandOptions,
  ProcessCommandOptions,
  MergeCommandOptions,
  PublishCommandOptions,
  ServeCommandOptions
} from '../utils/commandParser';

describe('Command Parser', () => {
  describe('parseCommandArgs', () => {
    it('should parse help command', () => {
      const args = ['node', 'script.js', 'help'];
      const options = parseCommandArgs(args);
      expect(options.command).toBe('help');
    });

    it('should default to help when no command provided', () => {
      const args = ['node', 'script.js'];
      const options = parseCommandArgs(args);
      expect(options.command).toBe('help');
    });

    it('should throw error for unknown command', () => {
      const args = ['node', 'script.js', 'unknown'];
      expect(() => parseCommandArgs(args)).toThrow('Unknown command');
    });

    it('should parse scrape command with default options', () => {
      const args = ['node', 'script.js', 'scrape'];
      const options = parseCommandArgs(args) as ScrapeCommandOptions;
      expect(options.command).toBe('scrape');
      expect(options.series).toBe('Amazing Spider-Man Vol 1');
      expect(options.issues).toEqual([]);
    });

    it('should parse scrape command with series', () => {
      const args = ['node', 'script.js', 'scrape', '--series', 'Untold Tales of Spider-Man Vol 1'];
      const options = parseCommandArgs(args) as ScrapeCommandOptions;
      expect(options.command).toBe('scrape');
      expect(options.series).toBe('Untold Tales of Spider-Man Vol 1');
    });

    it('should parse scrape command with issues', () => {
      const args = ['node', 'script.js', 'scrape', '--issues', '1-20'];
      const options = parseCommandArgs(args) as ScrapeCommandOptions;
      expect(options.command).toBe('scrape');
      expect(options.issues).toContain(1);
      expect(options.issues).toContain(20);
    });

    it('should parse scrape command with --all-series flag', () => {
      const args = ['node', 'script.js', 'scrape', '--all-series'];
      const options = parseCommandArgs(args) as ScrapeCommandOptions;
      expect(options.command).toBe('scrape');
      expect(options.allSeries).toBe(true);
    });

    it('should parse scrape command with --out', () => {
      const args = ['node', 'script.js', 'scrape', '--out', 'data/raw.json'];
      const options = parseCommandArgs(args) as ScrapeCommandOptions;
      expect(options.out).toBe('data/raw.json');
    });

    it('should parse process command', () => {
      const args = ['node', 'script.js', 'process', '--series', 'Amazing Spider-Man Vol 1'];
      const options = parseCommandArgs(args) as ProcessCommandOptions;
      expect(options.command).toBe('process');
      expect(options.series).toBe('Amazing Spider-Man Vol 1');
    });

    it('should parse process command with --validate', () => {
      const args = ['node', 'script.js', 'process', '--series', 'Amazing Spider-Man Vol 1', '--validate'];
      const options = parseCommandArgs(args) as ProcessCommandOptions;
      expect(options.validate).toBe(true);
    });

    it('should parse process command with --in and --out', () => {
      const args = ['node', 'script.js', 'process', '--in', 'input.json', '--out', 'output.json'];
      const options = parseCommandArgs(args) as ProcessCommandOptions;
      expect(options.in).toBe('input.json');
      expect(options.out).toBe('output.json');
    });

    it('should parse merge command', () => {
      const args = ['node', 'script.js', 'merge'];
      const options = parseCommandArgs(args) as MergeCommandOptions;
      expect(options.command).toBe('merge');
    });

    it('should parse merge command with --inputs', () => {
      const args = ['node', 'script.js', 'merge', '--inputs', 'villains.*.json'];
      const options = parseCommandArgs(args) as MergeCommandOptions;
      expect(options.inputs).toBe('villains.*.json');
    });

    it('should parse merge command with --out', () => {
      const args = ['node', 'script.js', 'merge', '--out', 'data/combined.json'];
      const options = parseCommandArgs(args) as MergeCommandOptions;
      expect(options.out).toBe('data/combined.json');
    });

    it('should parse publish command', () => {
      const args = ['node', 'script.js', 'publish'];
      const options = parseCommandArgs(args) as PublishCommandOptions;
      expect(options.command).toBe('publish');
    });

    it('should parse publish command with --src and --dest', () => {
      const args = ['node', 'script.js', 'publish', '--src', 'data', '--dest', 'public/data'];
      const options = parseCommandArgs(args) as PublishCommandOptions;
      expect(options.src).toBe('data');
      expect(options.dest).toBe('public/data');
    });

    it('should parse serve command', () => {
      const args = ['node', 'script.js', 'serve'];
      const options = parseCommandArgs(args) as ServeCommandOptions;
      expect(options.command).toBe('serve');
      expect(options.port).toBe(8000); // default port
    });

    it('should parse serve command with --port', () => {
      const args = ['node', 'script.js', 'serve', '--port', '3000'];
      const options = parseCommandArgs(args) as ServeCommandOptions;
      expect(options.port).toBe(3000);
    });

    it('should throw error for invalid port', () => {
      const args = ['node', 'script.js', 'serve', '--port', 'invalid'];
      expect(() => parseCommandArgs(args)).toThrow('port must be a number');
    });

    it('should throw error for port out of range', () => {
      const args = ['node', 'script.js', 'serve', '--port', '99999'];
      expect(() => parseCommandArgs(args)).toThrow('port must be a number between 1 and 65535');
    });

    it('should support short flags for scrape', () => {
      const args = ['node', 'script.js', 'scrape', '-s', 'Amazing Spider-Man Annual Vol 1', '-i', '1-10'];
      const options = parseCommandArgs(args) as ScrapeCommandOptions;
      expect(options.series).toBe('Amazing Spider-Man Annual Vol 1');
      expect(options.issues.length).toBeGreaterThan(0);
    });

    it('should support short flags for process', () => {
      const args = ['node', 'script.js', 'process', '-s', 'Amazing Spider-Man Vol 1', '-o', 'output.json'];
      const options = parseCommandArgs(args) as ProcessCommandOptions;
      expect(options.series).toBe('Amazing Spider-Man Vol 1');
      expect(options.out).toBe('output.json');
    });

    it('should support short flags for publish', () => {
      const args = ['node', 'script.js', 'publish', '-s', 'data', '-d', 'public/data'];
      const options = parseCommandArgs(args) as PublishCommandOptions;
      expect(options.src).toBe('data');
      expect(options.dest).toBe('public/data');
    });

    it('should support short flags for serve', () => {
      const args = ['node', 'script.js', 'serve', '-p', '5000'];
      const options = parseCommandArgs(args) as ServeCommandOptions;
      expect(options.port).toBe(5000);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when --series flag has no argument', () => {
      const args = ['node', 'script.js', 'scrape', '--series'];
      expect(() => parseCommandArgs(args)).toThrow('--series flag requires an argument');
    });

    it('should throw error when --issues flag has no argument', () => {
      const args = ['node', 'script.js', 'scrape', '--issues'];
      expect(() => parseCommandArgs(args)).toThrow('--issues flag requires an argument');
    });

    it('should throw error when --out flag has no argument', () => {
      const args = ['node', 'script.js', 'scrape', '--out'];
      expect(() => parseCommandArgs(args)).toThrow('--out flag requires an argument');
    });

    it('should throw error when --port flag has no argument', () => {
      const args = ['node', 'script.js', 'serve', '--port'];
      expect(() => parseCommandArgs(args)).toThrow('--port flag requires an argument');
    });
  });
});
