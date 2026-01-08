import * as fs from 'fs';
import * as path from 'path';

/**
 * Generates D3 config from combined villains.json
 * Used to create visualization config for merged timeline
 */
export function generateD3ConfigFromCombined(villainsJsonPath: string, outputPath: string): void {
  try {
    const content = fs.readFileSync(villainsJsonPath, 'utf-8');
    const data = JSON.parse(content);

    if (!Array.isArray(data.timeline)) {
      throw new Error('No timeline found in villains.json');
    }

    const timeline = data.timeline as any[];

    // Create D3 data points
    const d3Data = timeline.map((entry) => ({
      issueNumber: entry.issue,
      chronologicalPosition: entry.chronologicalPosition,
      series: entry.series,
      releaseDate: entry.releaseDate,
      villainsInIssue: Array.isArray(entry.villains) ? entry.villains : [],
      villainCount: entry.villainCount || (Array.isArray(entry.villains) ? entry.villains.length : 0)
    }));

    // Build color map
    const colorMap: Record<string, string> = {};
    if (Array.isArray(data.villains)) {
      for (const villain of data.villains) {
        colorMap[villain.name] = '#e74c3c'; // Default color
      }
    }

    // Calculate max villain count for y-scale
    const maxVillainCount = Math.max(...d3Data.map(d => d.villainCount || 0), 1);

    // Generate D3 config
    const d3Config = {
      data: d3Data,
      scales: {
        x: {
          domain: [1, d3Data.length],
          range: [70, 1200 - 30]
        },
        y: {
          domain: [0, maxVillainCount],
          range: [600 - 30, 30]
        }
      },
      colors: colorMap
    };

    // Write output
    fs.writeFileSync(outputPath, JSON.stringify(d3Config, null, 2));
    console.log(`✓ Generated D3 config with ${d3Data.length} data points`);
  } catch (error) {
    console.error('Error generating D3 config from combined data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const dataDir = path.join(__dirname, '../../data');
  const villainsPath = path.join(dataDir, 'villains.json');
  const configPath = path.join(dataDir, 'd3-config.json');
  generateD3ConfigFromCombined(villainsPath, configPath);
}
