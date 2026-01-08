/**
 * Test script to verify merge logic on existing JSON data files
 * without requiring a full scrape
 */

import * as fs from 'fs';
import * as path from 'path';
import { mergeDatasets } from './src/utils/mergeDatasets';

const DATA_DIR = path.join(__dirname, 'data');

// Load existing series JSON files
const files = fs.readdirSync(DATA_DIR).filter(f => 
  f.startsWith('villains.') && f.endsWith('.json') && f !== 'villains.json'
);

console.log(`Loading ${files.length} series files...\n`);

const datasets: any[] = [];
for (const f of files) {
  try {
    const content = fs.readFileSync(path.join(DATA_DIR, f), 'utf-8');
    const data = JSON.parse(content);
    datasets.push(data);
    console.log(`✓ Loaded ${f}: ${data.villains?.length || 0} villains, ${data.timeline?.length || 0} timeline entries`);
  } catch (err) {
    console.error(`✗ Failed to load ${f}: ${err}`);
  }
}

console.log(`\n=== PROCESSING MERGED DATA ===\n`);

// Use the separate merge logic to combine datasets
const mergedResult = mergeDatasets(datasets);

console.log(`\nTotal villains merged: ${mergedResult.villains.length}\n`);

// Show Doctor Octopus entries
const docOcks = mergedResult.villains.filter(v => v.name === 'Doctor Octopus');
console.log('=== DOCTOR OCTOPUS ENTRIES ===');
for (const doc of docOcks) {
  console.log(`Name: ${doc.name}`);
  console.log(`URL: ${doc.url}`);
  console.log(`First Appearance: Issue #${doc.firstAppearance} (${doc.firstAppearanceSeries})`);
  console.log(`Appearances: ${doc.appearances.join(', ')}`);
  console.log(`Frequency: ${doc.frequency}\n`);
}

// Show The Rose entries
const roses = mergedResult.villains.filter(v => v.name === 'The Rose');
console.log('=== THE ROSE ENTRIES ===');
if (roses.length === 0) {
  console.log('(No Rose entries in current data)');
} else {
  for (const rose of roses) {
    console.log(`Name: ${rose.name}`);
    console.log(`URL: ${rose.url}`);
    console.log(`First Appearance: Issue #${rose.firstAppearance} (${rose.firstAppearanceSeries})`);
    console.log(`Appearances: ${rose.appearances.join(', ')}`);
    console.log(`Frequency: ${rose.frequency}\n`);
  }
}

console.log('\n✅ Merge logic test complete!');
