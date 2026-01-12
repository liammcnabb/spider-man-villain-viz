/**
 * Marvel Fandom Web Scraper for Spider-Man comic book data
 * 
 * Extracts antagonist information from Marvel Fandom wiki pages.
 */

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

import type { IssueData, RawVillainData, Antagonist } from '../types';
import { isUnnamedOrInvalidAntagonist } from '../utils/nameValidation';

// Configuration constants
const MARVEL_FANDOM_BASE = 'https://marvel.fandom.com';

interface SeriesConfig {
  slugTemplate: string; // e.g., `${MARVEL_FANDOM_BASE}/wiki/Amazing_Spider-Man_Vol_1_{issue}`
  titlePrefix: string;  // e.g., 'Amazing Spider-Man'
}

// Known series configurations (extendable)
const SERIES_CONFIG: Record<string, SeriesConfig> = {
  'Amazing Spider-Man Vol 1': {
    slugTemplate: `${MARVEL_FANDOM_BASE}/wiki/Amazing_Spider-Man_Vol_1_{issue}`,
    titlePrefix: 'Amazing Spider-Man'
  },
  // Alias: accept wiki-style slug as volume input
  'Amazing_Spider-Man_Vol_1': {
    slugTemplate: `${MARVEL_FANDOM_BASE}/wiki/Amazing_Spider-Man_Vol_1_{issue}`,
    titlePrefix: 'Amazing Spider-Man'
  },
  // New series support
  'Untold Tales of Spider-Man Vol 1': {
    slugTemplate: `${MARVEL_FANDOM_BASE}/wiki/Untold_Tales_of_Spider-Man_Vol_1_{issue}`,
    titlePrefix: 'Untold Tales of Spider-Man'
  }
  ,
  // Alias: wiki-style slug
  'Untold_Tales_of_Spider-Man_Vol_1': {
    slugTemplate: `${MARVEL_FANDOM_BASE}/wiki/Untold_Tales_of_Spider-Man_Vol_1_{issue}`,
    titlePrefix: 'Untold Tales of Spider-Man'
  },
  // Amazing Spider-Man Annual Vol 1
  'Amazing Spider-Man Annual Vol 1': {
    slugTemplate: `${MARVEL_FANDOM_BASE}/wiki/Amazing_Spider-Man_Annual_Vol_1_{issue}`,
    titlePrefix: 'Amazing Spider-Man Annual'
  },
  // Alias: wiki-style slug
  'Amazing_Spider-Man_Annual_Vol_1': {
    slugTemplate: `${MARVEL_FANDOM_BASE}/wiki/Amazing_Spider-Man_Annual_Vol_1_{issue}`,
    titlePrefix: 'Amazing Spider-Man Annual'
  }
  ,
  // Peter Parker, The Spectacular Spider-Man Vol 1
  'Peter Parker, The Spectacular Spider-Man Vol 1': {
    slugTemplate: `${MARVEL_FANDOM_BASE}/wiki/Peter_Parker,_The_Spectacular_Spider-Man_Vol_1_{issue}`,
    titlePrefix: 'Peter Parker, The Spectacular Spider-Man'
  },
  'Peter_Parker,_The_Spectacular_Spider-Man_Vol_1': {
    slugTemplate: `${MARVEL_FANDOM_BASE}/wiki/Peter_Parker,_The_Spectacular_Spider-Man_Vol_1_{issue}`,
    titlePrefix: 'Peter Parker, The Spectacular Spider-Man'
  },
  // Web of Spider-Man Vol 1
  'Web of Spider-Man Vol 1': {
    slugTemplate: `${MARVEL_FANDOM_BASE}/wiki/Web_of_Spider-Man_Vol_1_{issue}`,
    titlePrefix: 'Web of Spider-Man'
  },
  'Web_of_Spider-Man_Vol_1': {
    slugTemplate: `${MARVEL_FANDOM_BASE}/wiki/Web_of_Spider-Man_Vol_1_{issue}`,
    titlePrefix: 'Web of Spider-Man'
  },
  // Spider-Man (Adjectiveless) Vol 1
  'Spider-Man Vol 1': {
    slugTemplate: `${MARVEL_FANDOM_BASE}/wiki/Spider-Man_Vol_1_{issue}`,
    titlePrefix: 'Spider-Man'
  },
  'Spider-Man_Vol_1': {
    slugTemplate: `${MARVEL_FANDOM_BASE}/wiki/Spider-Man_Vol_1_{issue}`,
    titlePrefix: 'Spider-Man'
  },
  // Sensational Spider-Man Vol 1
  'Sensational Spider-Man Vol 1': {
    slugTemplate: `${MARVEL_FANDOM_BASE}/wiki/Sensational_Spider-Man_Vol_1_{issue}`,
    titlePrefix: 'Sensational Spider-Man'
  },
  'Sensational_Spider-Man_Vol_1': {
    slugTemplate: `${MARVEL_FANDOM_BASE}/wiki/Sensational_Spider-Man_Vol_1_{issue}`,
    titlePrefix: 'Sensational Spider-Man'
  },
  // Spider-Man Unlimited Vol 1
  'Spider-Man Unlimited Vol 1': {
    slugTemplate: `${MARVEL_FANDOM_BASE}/wiki/Spider-Man_Unlimited_Vol_1_{issue}`,
    titlePrefix: 'Spider-Man Unlimited'
  },
  'Spider-Man_Unlimited_Vol_1': {
    slugTemplate: `${MARVEL_FANDOM_BASE}/wiki/Spider-Man_Unlimited_Vol_1_{issue}`,
    titlePrefix: 'Spider-Man Unlimited'
  }
};
const DEFAULT_TIMEOUT = 10000;
const REQUEST_DELAY_MS = 1000; // Respectful scraping
const IMAGE_DIR = path.join(process.cwd(), 'public', 'images');

/**
 * Scrapes Marvel Fandom for Spider-Man villain data
 */
export class MarvelScraper {
  private axiosClient: AxiosInstance;
  private requestCount: number = 0;
  private currentSeries: SeriesConfig = SERIES_CONFIG['Amazing Spider-Man Vol 1'];

  constructor() {
    this.axiosClient = axios.create({
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'User-Agent': 'Spider-Man Villain Timeline (Educational Project)'
      }
    });
  }

  /**
   * Scrapes specific issues of Amazing Spider-Man Vol 1 for antagonist data
   * 
   * @param issueNumbers - Array of issue numbers to scrape
   * @param volumeName - Name of the volume (default: "Amazing Spider-Man Vol 1")
   * @returns Promise resolving to raw scraped data
   * @throws Error if scraping fails
   */
  /**
   * Scrapes specific issues of a selected series for antagonist data
   *
   * @param issueNumbers - Array of issue numbers to scrape
   * @param volumeName - Human-readable volume/series name
   */
  async scrapeIssues(
    issueNumbers: number[],
    volumeName: string = 'Amazing Spider-Man Vol 1'
  ): Promise<RawVillainData> {
    if (issueNumbers.length === 0) {
      throw new Error('No issue numbers provided. Please specify at least one issue number using the --issues flag.');
    }
    
    // Validate all issue numbers
    for (const num of issueNumbers) {
      if (num < 1) {
        throw new Error(`Invalid issue number: ${num} (must be >= 1)`);
      }
    }
    
    const sortedIssues = [...issueNumbers].sort((a, b) => a - b);
    const min = sortedIssues[0];
    const max = sortedIssues[sortedIssues.length - 1];
    
    console.log(
      `Starting scrape: ${sortedIssues.length} issues (${min}-${max})`
    );

    // Resolve and store current series configuration (fallback to ASM Vol 1)
    this.currentSeries = SERIES_CONFIG[volumeName] || SERIES_CONFIG['Amazing Spider-Man Vol 1'];

    const issues: IssueData[] = [];

    for (const issueNumber of sortedIssues) {
      try {
        console.log(`Scraping issue ${issueNumber}...`);
        const issueData = await this.scrapeIssue(issueNumber);
        issues.push(issueData);
        
        // Respectful delay between requests
        await this.delay(REQUEST_DELAY_MS);
      } catch (error) {
        console.error(
          `Failed to scrape issue ${issueNumber}: ${error}`
        );
        // Continue with next issue rather than failing entirely
        issues.push({
          issueNumber,
          title: `Issue ${issueNumber} (Failed)`,
          antagonists: []
        });
      }
    }

    console.log(
      `Scraped ${issues.filter(i => i.antagonists.length > 0).length}
       /${issues.length} issues successfully`
    );

    // Extract series slug from URL template for accurate series identification
    // URL template: "https://marvel.fandom.com/wiki/Amazing_Spider-Man_Vol_1_{issue}"
    // We want: "Amazing Spider-Man Vol 1"
    const seriesSlug = this.extractSeriesSlugFromTemplate(this.currentSeries.slugTemplate);

    return {
      series: seriesSlug,
      baseUrl: this.currentSeries.slugTemplate,
      issues
    };
  }

  /**
   * Scrapes Amazing Spider-Man Vol 1 for antagonist data
   * 
   * @param startIssue - First issue to scrape (1-based)
   * @param endIssue - Last issue to scrape (inclusive)
   * @returns Promise resolving to raw scraped data
   * @throws Error if scraping fails
   */
  async scrapeAmazingSpiderManVol1(
    startIssue: number = 1,
    endIssue: number = 441
  ): Promise<RawVillainData> {
    if (startIssue < 1 || endIssue < startIssue) {
      throw new Error(
        `Invalid issue range: ${startIssue}-${endIssue}`
      );
    }

    // Generate array of issue numbers and use scrapeIssues
    const issueNumbers = Array.from(
      { length: endIssue - startIssue + 1 },
      (_, i) => startIssue + i
    );

    return this.scrapeIssues(issueNumbers, 'Amazing Spider-Man Vol 1');
  }

  /**
   * Scrapes a single issue for antagonist data
   * 
   * @param issueNumber - Issue number to scrape
   * @returns Promise resolving to issue data with antagonists
   */
  private async scrapeIssue(issueNumber: number): Promise<IssueData> {
    const url = this.getIssueUrl(issueNumber);
    
    try {
      const response = await this.axiosClient.get(url);
      
      if (!response.data) {
        throw new Error('No response data received');
      }

      const antagonists = this.parseAntagonistsFromHtml(
        response.data,
        issueNumber
      );
      
      const releaseDate = this.parseReleaseDate(
        response.data,
        issueNumber
      );

      const chronologicalPlacementHint = this.parseChronologicalPlacement(
        response.data,
        issueNumber
      );

      // Scrape images for new villains
      await this.scrapeVillainImages(antagonists);

      return {
        issueNumber,
        title: `${this.currentSeries.titlePrefix} #${issueNumber}`,
        releaseDate,
        chronologicalPlacementHint,
        antagonists
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `HTTP Error ${error.response?.status}: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Extracts the series slug from a URL template
   * Converts wiki format (underscores) to display format (spaces)
   * 
   * Example: "https://marvel.fandom.com/wiki/Amazing_Spider-Man_Vol_1_{issue}"
   * Returns: "Amazing Spider-Man Vol 1"
   * 
   * @param urlTemplate - URL template string
   * @returns Series name in display format
   */
  private extractSeriesSlugFromTemplate(urlTemplate: string): string {
    // Extract the series slug between "/wiki/" and "_{issue}"
    const match = urlTemplate.match(/\/wiki\/(.+?)_\{issue\}/);
    if (match && match[1]) {
      // Convert underscores to spaces
      return match[1].replace(/_/g, ' ');
    }
    // Fallback to a default if extraction fails
    return 'Amazing Spider-Man Vol 1';
  }

  /**
   * Generates the URL for an issue page
   * 
   * @param issueNumber - The issue number
   * @returns Formatted URL string
   */
  private getIssueUrl(issueNumber: number): string {
    const tmpl = this.currentSeries.slugTemplate;
    return tmpl.replace('{issue}', issueNumber.toString());
  }

  /**
   * Parses the release date from issue HTML
   * 
   * Marvel Fandom structure:
   * - Page contains "Release Date" and "Cover Date" sections in the info area
   * - Look for h3 with specific text, then get next sibling paragraph
   * 
   * @param html - HTML content of the issue page
   * @param issueNumber - The issue number (for logging)
   * @returns Release date string (or undefined if not found)
   */
  private parseReleaseDate(
    html: string,
    issueNumber: number
  ): string | undefined {
    try {
      const $ = cheerio.load(html);
      
      // Look for all h3 elements and check their text
      const h3Elements = $('h3');
      
      for (let i = 0; i < h3Elements.length; i++) {
        const h3 = $(h3Elements[i]);
        const headingText = h3.text().trim();
        
        // Check for "Release Date" (preferred) or "Cover Date" (fallback)
        if (headingText === 'Release Date' || headingText === 'Cover Date') {
          // The date is in the next sibling element (could be p, div, or other)
          const nextElement = h3.next();
          
          if (nextElement.length > 0) {
            const dateText = nextElement.text().trim();
            if (dateText) {
              return dateText;
            }
          }
        }
      }
      
      return undefined;
    } catch (error) {
      console.warn(
        `Could not parse release date for issue ${issueNumber}: ${error}`
      );
      return undefined;
    }
  }

  /**
   * Parses antagonists from issue HTML
   * 
   * Marvel Fandom structure:
   * - Page contains "Appearing in" h2 sections for each story
   * - Within each "Appearing in" section:
   *   - <p> with <b>Antagonists:</b> label
   *   - Followed by <ul> with <li> containing character links
   * - Each <li> may contain: navigation links, character link, info spans
   * 
   * @param html - HTML content of the issue page
   * @param issueNumber - The issue number (for logging)
   * @returns Array of antagonist objects with name and URL
   */
  private parseAntagonistsFromHtml(
    html: string,
    issueNumber: number
  ): Antagonist[] {
    try {
      const $ = cheerio.load(html);
      const antagonists: Antagonist[] = [];

      // Find "Appearing in" sections (story sections)
      const sections = $('h2');
      
      for (let i = 0; i < sections.length; i++) {
        const heading = $(sections[i]);
        const headingText = heading.text().toLowerCase();
        
        // Look for "Appearing in" sections
        if (headingText.includes('appearing in')) {
          // Get content between this h2 and the next h2
          const nextH2 = heading.nextAll('h2').first();
          const content = nextH2.length > 0
            ? heading.nextUntil(nextH2)
            : heading.nextAll();

          // Find all elements that contain "Antagonists:" label
          content.each((_, element) => {
            const $el = $(element);
            
            // Check if this element or its children contain "Antagonists:"
            const hasAntagonistLabel = 
              ($el.is('b') && $el.text().includes('Antagonists')) ||
              $el.find('b:contains("Antagonists")').length > 0;
            
            if (hasAntagonistLabel) {
              // Find the list after this element
              const nextList = $el.is('ul, ol') 
                ? $el 
                : $el.next('ul, ol');

              if (nextList.length > 0) {
                nextList.find('li').each((_, liElement) => {
                  // Marvel Fandom lists may have navigation symbols
                  // Extract character name and URL by:
                  // 1. Getting all links in the <li>
                  // 2. Filtering out navigation symbol links
                  // 3. Taking the character link (usually 2nd link)
                  
                  const $li = $(liElement);
                  const links = $li.find('a');
                  
                  let name = '';
                  let url = '';
                  
                  if (links.length === 1) {
                    // Simple case: single link is the character name
                    const link = links.first();
                    name = link.text().trim();
                    url = link.attr('href') || '';
                  } else if (links.length > 1) {
                    // Complex case: multiple links
                    // Skip navigation symbols (usually single characters or symbols)
                    // and get the character name
                    for (let j = 0; j < links.length; j++) {
                      const link = $(links[j]);
                      const linkText = link.text().trim();
                      
                      // Skip navigation symbols and helper links
                      if (linkText && 
                          linkText.length > 1 && 
                          !linkText.match(/^[\s⏴◀▶→←↑↓]+$/) &&
                          !linkText.match(/^See/i)) {
                        name = linkText;
                        url = link.attr('href') || '';
                        break;
                      }
                    }
                  }
                  
                  // If no name from links, try text content (no URL available)
                  if (!name) {
                    const text = $li.text().split('\n')[0].trim();
                    // Filter out navigation symbols
                    if (text && text.length > 1 && 
                        !text.match(/^[\s⏴◀▶→←↑↓]+$/)) {
                      name = text;
                    }
                  }
                  
                  // Normalize URL to full path if it's relative
                  if (url && !url.startsWith('http')) {
                    url = `${MARVEL_FANDOM_BASE}${url}`;
                  }
                  
                  // Filter out Character_Index URLs (generic disambiguation pages, not specific characters)
                  const isCharacterIndexPage = url && url.includes('/Character_Index/');
                  
                  // Add to antagonists if valid and has a URL (named character)
                  // Exclude unnamed/unidentified/unknown characters and Character_Index pages
                  if (name && name.length > 1 && url && !isUnnamedOrInvalidAntagonist(name) && !isCharacterIndexPage) {
                    antagonists.push({ name, url });
                  }
                });
              }
            }
          });

          // Continue looking for more stories in the same issue
        }
      }

      return antagonists;
    } catch (error) {
      console.error(
        `Error parsing HTML for issue ${issueNumber}: ${error}`
      );
      return [];
    }
  }

  /**
   * Parses chronological placement hints from issue's Notes section
   * 
   * Marvel Fandom often includes notes like:
   * "Chronologically speaking, this story takes place between Amazing Spider-Man #6 and #7"
   * 
   * @param html - HTML content of the issue page
   * @param issueNumber - The issue number (for logging)
   * @returns Placement hint string if found (e.g., "between Amazing Spider-Man Vol 1 #6 and #7")
   */
  private parseChronologicalPlacement(
    html: string,
    issueNumber: number
  ): string | undefined {
    try {
      const $ = cheerio.load(html);
      
      // Look for "Notes" section which typically contains chronological info
      // The structure is usually: <h2>Notes</h2> followed by content
      const h2Elements = $('h2');
      
      for (let i = 0; i < h2Elements.length; i++) {
        const h2 = $(h2Elements[i]);
        const headingText = h2.text().trim();
        
        if (headingText === 'Notes' || headingText.includes('Notes')) {
          // Get all text content after this heading until the next h2
          let currentElement = h2.next();
          const textSegments: string[] = [];
          
          // Traverse siblings until we hit another h2 or run out of elements
          while (currentElement.length > 0 && currentElement.prop('tagName') !== 'H2') {
            const text = currentElement.text().trim();
            if (text) {
              textSegments.push(text);
            }
            currentElement = currentElement.next();
          }
          
          const notesText = textSegments.join(' ');
          
          // Look for chronological placement patterns
          // Pattern: "Chronologically speaking, this story takes place between [Series] #X and #Y"
          // Also handle: "takes place between [Series] #X and [Series] #Y"
          const betweenPattern = /(?:chronologically|this story takes place).*?between\s+([^#]+?)\s*#(\d+)\s+and\s+(?:#)?(\d+)/i;
          const match = notesText.match(betweenPattern);
          
          if (match) {
            const seriesName = match[1].trim();
            const issue1 = match[2];
            const issue2 = match[3];
            return `between ${seriesName} #${issue1} and #${issue2}`;
          }
          
          break; // Found Notes section, don't look further
        }
      }
      
      return undefined;
    } catch (error) {
      console.warn(
        `Could not parse chronological placement for issue ${issueNumber}: ${error}`
      );
      return undefined;
    }
  }

  /**
   * Delays execution for respectful scraping
   * 
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Scrapes character images from villain wiki pages
   * Updates antagonist objects with imageUrl if found
   * 
   * @param antagonists - Array of antagonists to scrape images for
   */
  private async scrapeVillainImages(antagonists: Antagonist[]): Promise<void> {
    if (!fs.existsSync(IMAGE_DIR)) {
      fs.mkdirSync(IMAGE_DIR, { recursive: true });
    }

    for (const antagonist of antagonists) {
      // Only scrape if villain has a URL and doesn't already have an image
      if (!antagonist.url || antagonist.imageUrl) {
        continue;
      }

      try {
        const response = await this.axiosClient.get(antagonist.url);
        
        if (response.data) {
          const imageUrl = this.parseCharacterImage(response.data);
          if (imageUrl) {
            // Use page URL slug to disambiguate characters with the same display name
            const filename = this.buildImageFilename(antagonist.name, imageUrl, antagonist.url);
            const targetPath = path.join(IMAGE_DIR, filename);
            const savedPath = `/images/${filename}`;

            if (fs.existsSync(targetPath)) {
              antagonist.imageUrl = savedPath; // reuse cached image without logging
            } else {
              console.log(`  Scraping image for ${antagonist.name}...`);
              const downloadedPath = await this.saveImageLocally(imageUrl, filename);
              antagonist.imageUrl = downloadedPath; // use local path for reliable loading
            }
          }
        }
        
        // Respectful delay between image scrapes
        await this.delay(REQUEST_DELAY_MS);
      } catch (error) {
        console.warn(`    Failed to scrape image for ${antagonist.name}: ${error}`);
        // Continue with other villains even if one fails
      }
    }
  }

  /**
   * Parses character portrait image from character wiki page
   * 
   * Marvel Fandom structure:
   * - Main character image is typically in an 'infobox' or 'pi-item' section
   * - Look for <figure> or <img> with class 'pi-image' or in 'infobox' area
   * 
   * @param html - HTML content of the character page
   * @returns Image URL or undefined if not found
   */
  private parseCharacterImage(html: string): string | undefined {
    try {
      const $ = cheerio.load(html);
      
      // Strategy 1: Look for infobox image (most common)
      const infoboxImg = $('.pi-image-thumbnail, .pi-image img, figure.pi-item img').first();
      if (infoboxImg.length > 0) {
        const src = infoboxImg.attr('src');
        if (src) {
          // Convert thumbnail URLs to larger versions
          // Marvel Fandom uses /revision/latest/scale-to-width-down/{width}
          // We want a reasonable size, not the huge original
          return src.replace(/\/scale-to-width-down\/\d+/, '/scale-to-width-down/300');
        }
      }
      
      // Strategy 2: Look for any image in an 'infobox' class element
      const infoboxImage = $('.infobox img, .portable-infobox img').first();
      if (infoboxImage.length > 0) {
        const src = infoboxImage.attr('src');
        if (src) {
          return src.replace(/\/scale-to-width-down\/\d+/, '/scale-to-width-down/300');
        }
      }
      
      // Strategy 3: Look for image with 'data-src' attribute (lazy loaded)
      const lazyImg = $('img[data-src*="marvel.fandom.com"]').first();
      if (lazyImg.length > 0) {
        const dataSrc = lazyImg.attr('data-src');
        if (dataSrc) {
          return dataSrc.replace(/\/scale-to-width-down\/\d+/, '/scale-to-width-down/300');
        }
      }
      
      return undefined;
    } catch (error) {
      console.warn(`Error parsing character image: ${error}`);
      return undefined;
    }
  }

  /**
   * Builds a safe filename for the villain image
   */
  private buildImageFilename(name: string, imageUrl: string, sourceUrl?: string): string {
    const slugFromUrl = imageUrl.split('/').pop() || 'image';
    const extMatch = slugFromUrl.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    const ext = extMatch ? extMatch[1] : 'jpg';

    // Prefer the wiki page slug to disambiguate same-name characters (e.g., multiple Roses)
    const sourceSlug = sourceUrl
      ? sourceUrl.split('/').pop()?.split('#')[0]?.split('?')[0]
      : undefined;

    const baseSlug = (sourceSlug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'villain';

    return `${baseSlug}.${ext}`;
  }

  /**
   * Downloads the image and saves it locally, returning the public path
   */
  private async saveImageLocally(imageUrl: string, filename: string): Promise<string> {
    const targetPath = path.join(IMAGE_DIR, filename);
    if (fs.existsSync(targetPath)) {
      return `/images/${filename}`;
    }

    const response = await this.axiosClient.get<ArrayBuffer>(imageUrl, {
      responseType: 'arraybuffer',
      timeout: DEFAULT_TIMEOUT
    });

    fs.writeFileSync(targetPath, Buffer.from(response.data));
    return `/images/${filename}`;
  }

  /**
   * Get current request count
   */
  getRequestCount(): number {
    return this.requestCount;
  }
}
