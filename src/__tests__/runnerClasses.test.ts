/**
 * Runner Classes Unit Tests
 * 
 * Tests for ScrapeRunner, ProcessRunner, MergeRunner, and Publisher
 */

import * as fs from 'fs';
import * as path from 'path';
import { ScrapeRunner } from '../utils/ScrapeRunner';
import { ProcessRunner } from '../utils/ProcessRunner';
import { MergeRunner } from '../utils/MergeRunner';
import { Publisher } from '../utils/Publisher';

describe('ScrapeRunner', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(__dirname, 'temp-scrape');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('should initialize with custom data directory', () => {
    const runner = new ScrapeRunner(tempDir);
    expect(runner).toBeDefined();
  });

  it('should have a run method', () => {
    const runner = new ScrapeRunner(tempDir);
    expect(typeof runner.run).toBe('function');
  });

  it('should have a runMultipleSeries method', () => {
    const runner = new ScrapeRunner(tempDir);
    expect(typeof runner.runMultipleSeries).toBe('function');
  });
});

describe('ProcessRunner', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(__dirname, 'temp-process');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('should initialize with custom data directory', () => {
    const runner = new ProcessRunner(tempDir);
    expect(runner).toBeDefined();
  });

  it('should have a run method', () => {
    const runner = new ProcessRunner(tempDir);
    expect(typeof runner.run).toBe('function');
  });

  it('should have a runMultipleSeries method', () => {
    const runner = new ProcessRunner(tempDir);
    expect(typeof runner.runMultipleSeries).toBe('function');
  });

  it('should throw error when input file not found', async () => {
    const runner = new ProcessRunner(tempDir);
    try {
      await runner.run({
        inputPath: path.join(tempDir, 'nonexistent.json')
      });
      fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should require either inputPath or series', async () => {
    const runner = new ProcessRunner(tempDir);
    try {
      await runner.run({}); // No inputPath or series
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('Must provide either');
    }
  });
});

describe('MergeRunner', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(__dirname, 'temp-merge');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('should initialize with custom data directory', () => {
    const runner = new MergeRunner(tempDir);
    expect(runner).toBeDefined();
  });

  it('should have a run method', () => {
    const runner = new MergeRunner(tempDir);
    expect(typeof runner.run).toBe('function');
  });

  it('should throw error when no series files found', async () => {
    const runner = new MergeRunner(tempDir);
    try {
      await runner.run({});
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('No series files found');
    }
  });
});

describe('Publisher', () => {
  let tempSrc: string;
  let tempDest: string;

  beforeEach(() => {
    tempSrc = path.join(__dirname, 'temp-pub-src');
    tempDest = path.join(__dirname, 'temp-pub-dest');
    if (!fs.existsSync(tempSrc)) {
      fs.mkdirSync(tempSrc, { recursive: true });
    }
    if (!fs.existsSync(tempDest)) {
      fs.mkdirSync(tempDest, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempSrc)) {
      fs.rmSync(tempSrc, { recursive: true });
    }
    if (fs.existsSync(tempDest)) {
      fs.rmSync(tempDest, { recursive: true });
    }
  });

  it('should initialize with default directories', () => {
    const publisher = new Publisher();
    expect(publisher).toBeDefined();
  });

  it('should have a run method', () => {
    const publisher = new Publisher();
    expect(typeof publisher.run).toBe('function');
  });

  it('should have a publishFiles method', () => {
    const publisher = new Publisher();
    expect(typeof publisher.publishFiles).toBe('function');
  });

  it('should throw error when source directory does not exist', async () => {
    const publisher = new Publisher();
    try {
      await publisher.run({
        srcDir: path.join(__dirname, 'nonexistent-src'),
        destDir: tempDest
      });
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('Publishing validation failed');
    }
  });

  it('should handle empty source directory gracefully', async () => {
    const publisher = new Publisher();
    // Should throw validation error for no files
    try {
      await publisher.run({
        srcDir: tempSrc,
        destDir: tempDest
      });
      fail('Should have thrown an error for no files');
    } catch (error: any) {
      expect(error.message).toContain('Publishing validation failed');
    }
  });

  it('should copy files successfully', async () => {
    // Create test files
    const testFile = path.join(tempSrc, 'test.json');
    fs.writeFileSync(testFile, JSON.stringify({ test: true }));

    const publisher = new Publisher();
    await publisher.run({
      srcDir: tempSrc,
      destDir: tempDest
    });

    const destFile = path.join(tempDest, 'test.json');
    expect(fs.existsSync(destFile)).toBe(true);
    const content = JSON.parse(fs.readFileSync(destFile, 'utf-8'));
    expect(content.test).toBe(true);
  });
});
