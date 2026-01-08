/**
 * CLI Parser Unit Tests
 * 
 * Tests for command-line argument parsing functionality
 */

import {
  parseIssueSpec,
  parseScrapeArgs,
  getDefaultIssuesForVolume
} from '../utils/cliParser';

describe('CLI Parser', () => {
  describe('parseIssueSpec', () => {
    it('should parse single issue numbers', () => {
      expect(parseIssueSpec('1')).toEqual([1]);
      expect(parseIssueSpec('5')).toEqual([5]);
      expect(parseIssueSpec('100')).toEqual([100]);
    });

    it('should parse issue ranges', () => {
      expect(parseIssueSpec('1-5')).toEqual([1, 2, 3, 4, 5]);
      expect(parseIssueSpec('10-15')).toEqual([10, 11, 12, 13, 14, 15]);
    });

    it('should parse comma-separated issues', () => {
      expect(parseIssueSpec('1,5,10')).toEqual([1, 5, 10]);
      expect(parseIssueSpec('1,2,3')).toEqual([1, 2, 3]);
    });

    it('should parse combined ranges and issues', () => {
      expect(parseIssueSpec('1-3,5,10-12')).toEqual([1, 2, 3, 5, 10, 11, 12]);
      expect(parseIssueSpec('1,5-7,10')).toEqual([1, 5, 6, 7, 10]);
    });

    it('should remove duplicates and sort', () => {
      expect(parseIssueSpec('1,1,2,2,3')).toEqual([1, 2, 3]);
      expect(parseIssueSpec('5,1,3,2,4')).toEqual([1, 2, 3, 4, 5]);
      expect(parseIssueSpec('1-5,3-7')).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('should handle whitespace', () => {
      expect(parseIssueSpec('1, 5, 10')).toEqual([1, 5, 10]);
      expect(parseIssueSpec('1 - 5')).toEqual([1, 2, 3, 4, 5]);
      expect(parseIssueSpec(' 1-3 , 5 , 10-12 ')).toEqual([1, 2, 3, 5, 10, 11, 12]);
    });

    it('should throw error for invalid numbers', () => {
      expect(() => parseIssueSpec('abc')).toThrow('Invalid issue number: abc');
      expect(() => parseIssueSpec('1-abc')).toThrow('Invalid range: 1-abc');
      expect(() => parseIssueSpec('abc-5')).toThrow('Invalid range: abc-5');
    });

    it('should throw error for invalid ranges', () => {
      expect(() => parseIssueSpec('5-1')).toThrow('Invalid range: 5-1');
      expect(() => parseIssueSpec('0-5')).toThrow('Invalid range: 0-5');
      expect(() => parseIssueSpec('-1-5')).toThrow('Invalid range: -1-5');
    });

    it('should throw error for issue numbers less than 1', () => {
      expect(() => parseIssueSpec('0')).toThrow('Issue number must be >= 1: 0');
      expect(() => parseIssueSpec('-1')).toThrow('Invalid range');
    });

    it('should throw error for empty spec', () => {
      expect(() => parseIssueSpec('')).toThrow('No valid issues specified');
      expect(() => parseIssueSpec('   ')).toThrow('No valid issues specified');
    });
  });

  describe('parseScrapeArgs', () => {
    it('should parse --issues flag with single issue', () => {
      const args = ['node', 'index.js', 'scrape', '--issues', '1'];
      const result = parseScrapeArgs(args);
      expect(result.issues).toEqual([1]);
      expect(result.volume).toBe('Amazing Spider-Man Vol 1');
    });

    it('should parse --issues flag with range', () => {
      const args = ['node', 'index.js', 'scrape', '--issues', '1-20'];
      const result = parseScrapeArgs(args);
      expect(result.issues).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    });

    it('should parse --issues flag with complex spec', () => {
      const args = ['node', 'index.js', 'scrape', '--issues', '1-5,10,20-22'];
      const result = parseScrapeArgs(args);
      expect(result.issues).toEqual([1, 2, 3, 4, 5, 10, 20, 21, 22]);
    });

    it('should parse -i shorthand', () => {
      const args = ['node', 'index.js', 'scrape', '-i', '1-5'];
      const result = parseScrapeArgs(args);
      expect(result.issues).toEqual([1, 2, 3, 4, 5]);
    });

    it('should parse --volume flag', () => {
      const args = ['node', 'index.js', 'scrape', '--volume', 'Amazing Spider-Man Vol 2'];
      const result = parseScrapeArgs(args);
      expect(result.volume).toBe('Amazing Spider-Man Vol 2');
      expect(result.issues).toEqual([]);
    });

    it('should parse -v shorthand', () => {
      const args = ['node', 'index.js', 'scrape', '-v', 'Amazing Spider-Man Vol 3'];
      const result = parseScrapeArgs(args);
      expect(result.volume).toBe('Amazing Spider-Man Vol 3');
    });

    it('should parse both --volume and --issues', () => {
      const args = ['node', 'index.js', 'scrape', '--volume', 'Amazing Spider-Man Vol 2', '--issues', '1-10'];
      const result = parseScrapeArgs(args);
      expect(result.volume).toBe('Amazing Spider-Man Vol 2');
      expect(result.issues).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('should handle flags in any order', () => {
      const args = ['node', 'index.js', 'scrape', '--issues', '1-5', '--volume', 'Amazing Spider-Man Vol 2'];
      const result = parseScrapeArgs(args);
      expect(result.volume).toBe('Amazing Spider-Man Vol 2');
      expect(result.issues).toEqual([1, 2, 3, 4, 5]);
    });

    it('should return defaults when no flags provided', () => {
      const args = ['node', 'index.js', 'scrape'];
      const result = parseScrapeArgs(args);
      expect(result.volume).toBe('Amazing Spider-Man Vol 1');
      expect(result.issues).toEqual([]);
    });

    it('should return defaults when scrape command not found', () => {
      const args = ['node', 'index.js', 'help'];
      const result = parseScrapeArgs(args);
      expect(result.volume).toBe('Amazing Spider-Man Vol 1');
      expect(result.issues).toEqual([]);
    });

    it('should throw error when --issues flag has no value', () => {
      const args = ['node', 'index.js', 'scrape', '--issues'];
      expect(() => parseScrapeArgs(args)).toThrow('--issues flag requires an argument');
    });

    it('should throw error when --volume flag has no value', () => {
      const args = ['node', 'index.js', 'scrape', '--volume'];
      expect(() => parseScrapeArgs(args)).toThrow('--volume/--series flag requires an argument');
    });
  });

  describe('getDefaultIssuesForVolume', () => {
    it('should return correct range for Amazing Spider-Man Vol 1', () => {
      const issues = getDefaultIssuesForVolume('Amazing Spider-Man Vol 1');
      expect(issues.length).toBe(441);
      expect(issues[0]).toBe(1);
      expect(issues[issues.length - 1]).toBe(441);
    });

    it('should return correct range for Amazing Spider-Man Vol 2', () => {
      const issues = getDefaultIssuesForVolume('Amazing Spider-Man Vol 2');
      expect(issues.length).toBe(58);
      expect(issues[0]).toBe(1);
      expect(issues[issues.length - 1]).toBe(58);
    });

    it('should return correct range for Amazing Spider-Man Vol 3', () => {
      const issues = getDefaultIssuesForVolume('Amazing Spider-Man Vol 3');
      expect(issues.length).toBe(20);
      expect(issues[0]).toBe(1);
      expect(issues[issues.length - 1]).toBe(20);
    });

    it('should return default 1-20 for unknown volumes', () => {
      const issues = getDefaultIssuesForVolume('Unknown Volume');
      expect(issues.length).toBe(20);
      expect(issues[0]).toBe(1);
      expect(issues[issues.length - 1]).toBe(20);
    });

    it('should return consecutive issue numbers', () => {
      const issues = getDefaultIssuesForVolume('Amazing Spider-Man Vol 1');
      for (let i = 1; i < issues.length; i++) {
        expect(issues[i]).toBe(issues[i - 1] + 1);
      }
    });
  });
});
