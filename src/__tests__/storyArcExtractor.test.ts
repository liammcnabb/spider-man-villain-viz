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
          <div class="pi-item pi-data pi-item-spacing pi-border-color">
            <div class="pi-data-value pi-font">
              Part of the <span style="font-style:italic">
                <a href="/wiki/Clone_Saga_(Event)">Clone Saga (Event)</a>
              </span> storyline
            </div>
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
          <div class="pi-item pi-data pi-item-spacing pi-border-color">
            <div class="pi-data-value pi-font">
              Part of the <a href="/wiki/Power_and_Responsibility">Power and Responsibility</a>
               and <a href="/wiki/Double">Double</a> arcs
            </div>
          </div>
          <div class="pi-item pi-data pi-item-spacing pi-border-color">
            <div class="pi-data-value pi-font">
              Part of the <a href="/wiki/Clone_Saga_(Event)">Clone Saga (Event)</a> storyline
            </div>
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
          <div class="pi-item pi-data pi-item-spacing pi-border-color">
            <div class="pi-data-value pi-font">
              Part of the <a href="/wiki/Clone_Saga_(Event)">Clone Saga (Event)</a>
               and <a href="/wiki/Clone_Saga_(Event)">Clone Saga (Event)</a>
            </div>
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

    // Regression test for ASM #19 - arc in top banner instead of infobox
    it('should extract story arc from top banner when not in infobox', () => {
      const html = `
        <div class="page-content">
          Part of the <a href="/wiki/End_of_Spider-Man">End of Spider-Man</a> arc
        </div>
        <aside class="portable-infobox pi-background">
          <div class="pi-data-value pi-font">Some other info</div>
        </aside>
      `;
      
      const arcs = extractStoryArcsFromHtml(html, 19);
      
      expect(arcs).toHaveLength(1);
      expect(arcs[0].id).toBe('end-of-spider-man');
      expect(arcs[0].name).toBe('End of Spider-Man');
    });

    // Regression test for links without title attribute
    it('should extract arcs from links without title attribute using anchor text', () => {
      const html = `
        <aside class="portable-infobox pi-background">
          <div class="pi-item pi-data pi-item-spacing pi-border-color">
            <div class="pi-data-value pi-font">
              Part of the <a href="/wiki/Maximum_Carnage">Maximum Carnage</a> storyline
            </div>
          </div>
        </aside>
      `;
      
      const arcs = extractStoryArcsFromHtml(html, 378);
      
      expect(arcs).toHaveLength(1);
      expect(arcs[0].id).toBe('maximum-carnage');
      expect(arcs[0].name).toBe('Maximum Carnage');
    });

    // Regression test for top banner fallback with "storyline" keyword
    it('should extract arc from banner using "storyline" keyword', () => {
      const html = `
        <div class="banner">
          Part of the <a href="/wiki/Kravens_Last_Hunt">Kraven's Last Hunt</a> storyline
        </div>
        <aside class="portable-infobox">
          <div class="pi-data-value">Regular content</div>
        </aside>
      `;
      
      const arcs = extractStoryArcsFromHtml(html, 293);
      
      expect(arcs).toHaveLength(1);
      // ID is derived from anchor text "Kraven's Last Hunt" with apostrophe preserved
      expect(arcs[0].id).toBe("kraven's-last-hunt");
      expect(arcs[0].name).toBe("Kraven's Last Hunt");
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
