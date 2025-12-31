/**
 * Marvel Fandom Web Scraper for Spider-Man comic book data
 * 
 * Extracts antagonist information from Marvel Fandom wiki pages.
 */

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

import type { IssueData, RawVillainData } from '../types';

// Configuration constants
const MARVEL_FANDOM_BASE = 'https://marvel.fandom.com';
const AMAZING_SPIDER_MAN_URL_TEMPLATE = 
  `${MARVEL_FANDOM_BASE}/wiki/Amazing_Spider-Man_Vol_1_{issue}`;
const DEFAULT_TIMEOUT = 10000;
const REQUEST_DELAY_MS = 1000; // Respectful scraping

/**
 * Scrapes Marvel Fandom for Spider-Man villain data
 */
export class MarvelScraper {
  private axiosClient: AxiosInstance;
  private requestCount: number = 0;

  constructor() {
    this.axiosClient = axios.create({
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'User-Agent': 'Spider-Man Villain Timeline (Educational Project)'
      }
    });
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
    console.log(`Starting scrape: Issues ${startIssue}-${endIssue}`);
    
    if (startIssue < 1 || endIssue < startIssue) {
      throw new Error(
        `Invalid issue range: ${startIssue}-${endIssue}`
      );
    }

    const issues: IssueData[] = [];
    const issueNumbers = Array.from(
      { length: endIssue - startIssue + 1 },
      (_, i) => startIssue + i
    );

    for (const issueNumber of issueNumbers) {
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

    return {
      series: 'Amazing Spider-Man Vol 1',
      baseUrl: AMAZING_SPIDER_MAN_URL_TEMPLATE,
      issues
    };
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

      return {
        issueNumber,
        title: `Amazing Spider-Man #${issueNumber}`,
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
   * Generates the URL for an issue page
   * 
   * @param issueNumber - The issue number
   * @returns Formatted URL string
   */
  private getIssueUrl(issueNumber: number): string {
    return AMAZING_SPIDER_MAN_URL_TEMPLATE.replace(
      '{issue}',
      issueNumber.toString()
    );
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
   * @returns Array of antagonist names
   */
  private parseAntagonistsFromHtml(
    html: string,
    issueNumber: number
  ): string[] {
    try {
      const $ = cheerio.load(html);
      const antagonists: string[] = [];

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
                  // Extract character name by:
                  // 1. Getting all links in the <li>
                  // 2. Filtering out navigation symbol links
                  // 3. Taking the character name (usually 2nd link)
                  
                  const $li = $(liElement);
                  const links = $li.find('a');
                  
                  let name = '';
                  
                  if (links.length === 1) {
                    // Simple case: single link is the character name
                    name = links.first().text().trim();
                  } else if (links.length > 1) {
                    // Complex case: multiple links
                    // Skip navigation symbols (usually single characters or symbols)
                    // and get the character name
                    for (let j = 0; j < links.length; j++) {
                      const linkText = $(links[j]).text().trim();
                      
                      // Skip navigation symbols and helper links
                      if (linkText && 
                          linkText.length > 1 && 
                          !linkText.match(/^[\s⏴◀▶→←↑↓]+$/) &&
                          !linkText.match(/^See/i)) {
                        name = linkText;
                        break;
                      }
                    }
                  }
                  
                  // If no name from links, try text content
                  if (!name) {
                    const text = $li.text().split('\n')[0].trim();
                    // Filter out navigation symbols
                    if (text && text.length > 1 && 
                        !text.match(/^[\s⏴◀▶→←↑↓]+$/)) {
                      name = text;
                    }
                  }
                  
                  // Add to antagonists if valid
                  if (name && name.length > 1) {
                    antagonists.push(name);
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
   * Delays execution for respectful scraping
   * 
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current request count
   */
  getRequestCount(): number {
    return this.requestCount;
  }
}
