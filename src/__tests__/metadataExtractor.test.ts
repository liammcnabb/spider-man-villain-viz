/**
 * Metadata Extractor Unit Tests
 * 
 * Tests for extractAppearanceMetadata function
 */

import { extractAppearanceMetadata, logUncapturedMetadata } from '../utils/metadataExtractor';
import * as fs from 'fs';
import * as path from 'path';

describe('Metadata Extractor', () => {
  describe('extractAppearanceMetadata', () => {
    it('should extract first appearance metadata', () => {
      const text = 'Lucky Lobo (First appearance)';
      const { metadata, uncaptured } = extractAppearanceMetadata(text, 'Lucky Lobo');
      
      expect(metadata.firstAppearance).toBe(true);
      expect(metadata.rawMetadata).toEqual(['First appearance']);
      expect(uncaptured).toEqual([]);
    });

    it('should extract death metadata', () => {
      const text = 'Burglar (dies)';
      const { metadata, uncaptured } = extractAppearanceMetadata(text, 'Burglar');
      
      expect(metadata.death).toBe(true);
      expect(metadata.rawMetadata).toEqual(['dies']);
      expect(uncaptured).toEqual([]);
    });

    it('should extract multiple metadata fields', () => {
      const text = 'Burglar (Final appearance; dies) (Appears in flashback)';
      const { metadata, uncaptured } = extractAppearanceMetadata(text, 'Burglar');
      
      expect(metadata.finalAppearance).toBe(true);
      expect(metadata.death).toBe(true);
      expect(metadata.flashback).toBe(true);
      expect(metadata.rawMetadata).toEqual(['Final appearance; dies', 'Appears in flashback']);
      expect(uncaptured).toEqual([]);
    });

    it('should extract mentioned only metadata', () => {
      const text = 'Green Goblin (Mentioned only)';
      const { metadata, uncaptured } = extractAppearanceMetadata(text, 'Green Goblin');
      
      expect(metadata.mentionedOnly).toBe(true);
      expect(uncaptured).toEqual([]);
    });

    it('should extract behind the scenes metadata', () => {
      const text = 'Doctor Octopus (Behind the scenes)';
      const { metadata, uncaptured } = extractAppearanceMetadata(text, 'Doctor Octopus');
      
      expect(metadata.behindTheScenes).toBe(true);
      expect(uncaptured).toEqual([]);
    });

    it('should extract voice only metadata', () => {
      const text = 'Kingpin (Voice only)';
      const { metadata, uncaptured } = extractAppearanceMetadata(text, 'Kingpin');
      
      expect(metadata.voiceOnly).toBe(true);
      expect(uncaptured).toEqual([]);
    });

    it('should extract cameo metadata', () => {
      const text = 'Venom (Cameo appearance)';
      const { metadata, uncaptured } = extractAppearanceMetadata(text, 'Venom');
      
      expect(metadata.cameo).toBe(true);
      expect(uncaptured).toEqual([]);
    });

    it('should handle case-insensitive matching', () => {
      const text = 'Villain (FIRST APPEARANCE)';
      const { metadata } = extractAppearanceMetadata(text, 'Villain');
      
      expect(metadata.firstAppearance).toBe(true);
    });

    it('should distinguish between first appearance and first appearance chronologically', () => {
      const text1 = 'Hero (First appearance)';
      const { metadata: metadata1 } = extractAppearanceMetadata(text1, 'Hero');
      expect(metadata1.firstAppearance).toBe(true);
      expect(metadata1.firstAppearanceChronological).toBeUndefined();

      const text2 = 'Hero (First appearance chronologically)';
      const { metadata: metadata2 } = extractAppearanceMetadata(text2, 'Hero');
      expect(metadata2.firstAppearance).toBeUndefined();
      expect(metadata2.firstAppearanceChronological).toBe(true);
    });

    it('should capture uncategorized metadata', () => {
      const text = 'Mutantmen (First appearance) (Destroyed)';
      const { metadata, uncaptured } = extractAppearanceMetadata(text, 'Mutantmen');
      
      expect(metadata.firstAppearance).toBe(true);
      expect(uncaptured).toEqual(['Destroyed']);
      expect(metadata.uncategorized).toEqual(['Destroyed']);
    });

    it('should handle navigation symbols in text', () => {
      const text = 'Green Goblin ⏵ (Mentioned only)';
      const { metadata } = extractAppearanceMetadata(text, 'Green Goblin');
      
      expect(metadata.mentionedOnly).toBe(true);
    });

    it('should handle empty parentheticals gracefully', () => {
      const text = 'Character Name';
      const { metadata, uncaptured } = extractAppearanceMetadata(text, 'Character Name');
      
      expect(metadata.rawMetadata).toBeUndefined();
      expect(uncaptured).toEqual([]);
    });

    it('should extract all metadata from complex string', () => {
      const text = 'Doctor Octopus (Final appearance) (Behind the scenes) (Voice only)';
      const { metadata, uncaptured } = extractAppearanceMetadata(text, 'Doctor Octopus');
      
      expect(metadata.finalAppearance).toBe(true);
      expect(metadata.behindTheScenes).toBe(true);
      expect(metadata.voiceOnly).toBe(true);
      expect(uncaptured).toEqual([]);
    });

    // Regression test for label-based metadata extraction
    it('should extract metadata from green_text labels array', () => {
      const text = 'Chameleon';
      const labels = ['First appearance'];
      const { metadata, uncaptured } = extractAppearanceMetadata(text, 'Chameleon', labels);
      
      expect(metadata.firstAppearance).toBe(true);
      expect(metadata.rawMetadata).toEqual(['First appearance']);
      expect(uncaptured).toEqual([]);
    });

    // Regression test for multiple labels
    it('should extract multiple metadata from labels array', () => {
      const text = 'Sandman';
      const labels = ['Flint Marko', 'Death', 'Flashback'];
      const { metadata, uncaptured } = extractAppearanceMetadata(text, 'Sandman', labels);
      
      expect(metadata.death).toBe(true);
      expect(metadata.flashback).toBe(true);
      expect(uncaptured).toEqual(['Flint Marko']);
      expect(metadata.uncategorized).toContain('Flint Marko');
    });

    // Regression test for label priority over parenthetical
    it('should prioritize labels over parenthetical metadata', () => {
      const text = 'Rock Gimpy (Some other info)';
      const labels = ['First appearance'];
      const { metadata, uncaptured } = extractAppearanceMetadata(text, 'Rock Gimpy', labels);
      
      expect(metadata.firstAppearance).toBe(true);
      expect(metadata.rawMetadata).toContain('First appearance');
      // When labels are present, parentheticals are NOT parsed
      expect(uncaptured).toEqual([]);
    });

    // Regression test for fallback to parenthetical when no labels
    it('should fall back to parenthetical parsing when labels array is empty', () => {
      const text = 'Villain (First appearance)';
      const labels: string[] = [];
      const { metadata } = extractAppearanceMetadata(text, 'Villain', labels);
      
      expect(metadata.firstAppearance).toBe(true);
    });

    // Regression test for handling real names in labels
    it('should mark real names as uncategorized when in labels', () => {
      const text = 'Enforcers';
      const labels = ['Daniel Brito', 'Raymond Bloch', 'Jackson Brice'];
      const { metadata, uncaptured } = extractAppearanceMetadata(text, 'Enforcers', labels);
      
      expect(uncaptured).toEqual(['Daniel Brito', 'Raymond Bloch', 'Jackson Brice']);
      expect(metadata.uncategorized).toEqual(['Daniel Brito', 'Raymond Bloch', 'Jackson Brice']);
    });
  });

  describe('logUncapturedMetadata', () => {
    const logDir = path.join(process.cwd(), 'logs');
    const logFile = path.join(logDir, 'uncaptured-metadata.json');

    beforeEach(() => {
      // Clean up log file before each test
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }
      if (fs.existsSync(logDir)) {
        fs.rmdirSync(logDir);
      }
    });

    afterEach(() => {
      // Clean up after tests
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }
      if (fs.existsSync(logDir)) {
        fs.rmdirSync(logDir);
      }
    });

    it('should create logs directory if it does not exist', () => {
      logUncapturedMetadata(1, 'Test Character', ['Unknown metadata']);
      
      expect(fs.existsSync(logDir)).toBe(true);
    });

    it('should log uncaptured metadata to file', () => {
      logUncapturedMetadata(1, 'Test Character', ['Destroyed', 'Resurrected']);
      
      expect(fs.existsSync(logFile)).toBe(true);
      
      const content = fs.readFileSync(logFile, 'utf-8');
      const logData = JSON.parse(content);
      
      expect(logData).toHaveLength(1);
      expect(logData[0].issueNumber).toBe(1);
      expect(logData[0].characterName).toBe('Test Character');
      expect(logData[0].uncaptured).toEqual(['Destroyed', 'Resurrected']);
      expect(logData[0].timestamp).toBeDefined();
    });

    it('should append to existing log file', () => {
      logUncapturedMetadata(1, 'Character 1', ['Metadata 1']);
      logUncapturedMetadata(2, 'Character 2', ['Metadata 2']);
      
      const content = fs.readFileSync(logFile, 'utf-8');
      const logData = JSON.parse(content);
      
      expect(logData).toHaveLength(2);
      expect(logData[0].characterName).toBe('Character 1');
      expect(logData[1].characterName).toBe('Character 2');
    });

    it('should not log if uncaptured array is empty', () => {
      logUncapturedMetadata(1, 'Character', []);
      
      expect(fs.existsSync(logFile)).toBe(false);
    });
  });
});
