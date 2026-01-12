/**
 * Story Arc Extractor Unit Tests
 * 
 * Tests for story arc extraction utilities
 */

import {
  deriveArcIdFromUrl,
  categoryNameToDisplayName,
  normalizeArcUrl,
  extractStoryArcsFromHtml,
  inferArcType
} from '../utils/storyArcExtractor';
import type { StoryArc } from '../types';

describe('Story Arc Extractor', () => {
  describe('deriveArcIdFromUrl', () => {
    it('should derive ID from display name', () => {
      const name = 'Clone Saga';
      const id = deriveArcIdFromUrl(name);
      
      expect(id).toBe('clone-saga');
    });

    it('should derive ID from display name with parentheses', () => {
      const name = 'Clone Saga (Event)';
      const id = deriveArcIdFromUrl(name);
      
      expect(id).toBe('clone-saga-event');
    });

    it('should derive ID from URL path', () => {
      const url = '/wiki/Clone_Saga';
      const id = deriveArcIdFromUrl(url);
      
      expect(id).toBe('clone-saga');
    });
  });

  describe('categoryNameToDisplayName', () => {
    it('should convert underscores to spaces', () => {
      const name = categoryNameToDisplayName('Clone_Saga');
      expect(name).toBe('Clone Saga');
    });

    it('should handle multi-word names', () => {
      const name = categoryNameToDisplayName('Power_and_Responsibility');
      expect(name).toBe('Power and Responsibility');
    });

    it('should handle names without underscores', () => {
      const name = categoryNameToDisplayName('Inferno');
      expect(name).toBe('Inferno');
    });
  });

  describe('normalizeArcUrl', () => {
    it('should return absolute URL as-is', () => {
      const url = 'https://marvel.fandom.com/wiki/Category:Clone_Saga';
      const normalized = normalizeArcUrl(url);
      
      expect(normalized).toBe(url);
    });

    it('should convert relative URL to absolute', () => {
      const url = '/wiki/Category:Clone_Saga';
      const normalized = normalizeArcUrl(url);
      
      expect(normalized).toBe('https://marvel.fandom.com/wiki/Category:Clone_Saga');
    });

    it('should handle URL without leading slash', () => {
      const url = 'Category:Clone_Saga';
      const normalized = normalizeArcUrl(url);
      
      expect(normalized).toBe('https://marvel.fandom.com/wiki/Category:Clone_Saga');
    });
  });

  describe('extractStoryArcsFromHtml', () => {
    it('should extract story arcs from infobox', () => {
      const html = `
        <aside class="portable-infobox pi-background">
          <div class="pi-data-value pi-font">
            Part of the <span style="font-style:italic">
              <a href="/wiki/Clone_Saga_(Event)" title="Clone Saga (Event)">Clone Saga</a>
            </span> storyline
          </div>
        </aside>
      `;
      
      const arcs = extractStoryArcsFromHtml(html, 117);
      
      expect(arcs).toHaveLength(1);
      expect(arcs[0].id).toBe('clone-saga-event');
      expect(arcs[0].name).toBe('Clone Saga (Event)');
      expect(arcs[0].url).toBe('https://marvel.fandom.com/wiki/Clone_Saga_(Event)');
    });

    it('should extract multiple story arcs from infobox', () => {
      const html = `
        <aside class="portable-infobox pi-background">
          <div class="pi-data-value pi-font">
            Part of the <span style="font-style:italic">
              <a href="/wiki/Power_and_Responsibility" title="Power and Responsibility">Power and Responsibility</a>
            </span> and <span style="font-style:italic">
              <a href="/wiki/Double" title="Double">Double</a>
            </span> arcs<br>
            Part of the <span style="font-style:italic">
              <a href="/wiki/Clone_Saga_(Event)" title="Clone Saga (Event)">Clone Saga</a>
            </span> storyline
          </div>
        </aside>
      `;
      
      const arcs = extractStoryArcsFromHtml(html, 117);
      
      expect(arcs).toHaveLength(3);
      expect(arcs.map(a => a.id)).toContain('power-and-responsibility');
      expect(arcs.map(a => a.id)).toContain('double');
      expect(arcs.map(a => a.id)).toContain('clone-saga-event');
    });

    it('should skip category links in infobox', () => {
      const html = `
        <aside class="portable-infobox pi-background">
          <div class="pi-data-value pi-font">
            Part of the <span style="font-style:italic">
              <a href="/wiki/Clone_Saga_(Event)" title="Clone Saga (Event)">Clone Saga</a>
            </span> storyline
          </div>
        </aside>
        <footer>
          <a href="/wiki/Category:Comics">Comics</a>
        </footer>
      `;
      
      const arcs = extractStoryArcsFromHtml(html, 1);
      
      // Should only get the arc from the infobox, not the category from footer
      expect(arcs).toHaveLength(1);
      expect(arcs[0].id).toMatch(/clone-saga/);
    });

    it('should deduplicate duplicate arcs in infobox', () => {
      const html = `
        <aside class="portable-infobox pi-background">
          <div class="pi-data-value pi-font">
            Part of the <span style="font-style:italic">
              <a href="/wiki/Clone_Saga_(Event)" title="Clone Saga (Event)">Clone Saga</a>
            </span> and <span style="font-style:italic">
              <a href="/wiki/Clone_Saga_(Event)" title="Clone Saga (Event)">Clone Saga</a>
            </span>
          </div>
        </aside>
      `;
      
      const arcs = extractStoryArcsFromHtml(html, 1);
      
      expect(arcs).toHaveLength(1);
    });

    it('should return empty array when no infobox found', () => {
      const html = '<div class="page-content">Some content without infobox</div>';
      
      const arcs = extractStoryArcsFromHtml(html, 1);
      
      expect(arcs).toEqual([]);
    });

    it('should return empty array when infobox has no story arc section', () => {
      const html = `
        <aside class="portable-infobox pi-background">
          <div class="pi-data-value pi-font">Just some regular info</div>
        </aside>
      `;
      
      const arcs = extractStoryArcsFromHtml(html, 1);
      
      expect(arcs).toEqual([]);
    });

    it('should filter out excluded categories from infobox', () => {
      const html = `
        <aside class="portable-infobox pi-background">
          <div class="pi-data-value pi-font">
            Part of the <span style="font-style:italic">
              <a href="/wiki/Spider-Man" title="Spider-Man">Spider-Man</a>
            </span> and <span style="font-style:italic">
              <a href="/wiki/Clone_Saga_(Event)" title="Clone Saga (Event)">Clone Saga</a>
            </span> comics
          </div>
        </aside>
      `;
      
      const arcs = extractStoryArcsFromHtml(html, 1);
      
      // Should only get Clone Saga, not Spider-Man (excluded category)
      expect(arcs).toHaveLength(1);
      expect(arcs[0].id).toMatch(/clone-saga/);
    });
  });

  describe('inferArcType', () => {
    it('should identify saga type', () => {
      const arc: StoryArc = {
        url: 'https://marvel.fandom.com/wiki/Category:Clone_Saga',
        id: 'clone-saga',
        name: 'Clone Saga'
      };
      
      const type = inferArcType(arc);
      expect(type).toBe('saga');
    });

    it('should identify event type', () => {
      const arc: StoryArc = {
        url: 'https://marvel.fandom.com/wiki/Category:Secret_Wars',
        id: 'secret-wars',
        name: 'Secret Wars'
      };
      
      const type = inferArcType(arc);
      expect(type).toBe('event');
    });

    it('should identify crossover type', () => {
      const arc: StoryArc = {
        url: 'https://marvel.fandom.com/wiki/Category:Spider-Man_Crossover',
        id: 'spider-man-crossover',
        name: 'Spider-Man Crossover'
      };
      
      const type = inferArcType(arc);
      expect(type).toBe('crossover');
    });

    it('should default to arc type', () => {
      const arc: StoryArc = {
        url: 'https://marvel.fandom.com/wiki/Category:Maximum_Carnage',
        id: 'maximum-carnage',
        name: 'Maximum Carnage'
      };
      
      const type = inferArcType(arc);
      expect(type).toBe('arc');
    });

    it('should identify double issue type', () => {
      const arc: StoryArc = {
        url: 'https://marvel.fandom.com/wiki/Category:Part_1',
        id: 'part-1',
        name: 'Part 1'
      };
      
      const type = inferArcType(arc);
      expect(type).toBe('double');
    });
  });
});
