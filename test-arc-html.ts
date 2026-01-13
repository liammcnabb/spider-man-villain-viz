import { extractStoryArcsFromHtml } from './src/utils/storyArcExtractor';

// Test filtered excluded categories
const testHtml3 = `
<aside class="portable-infobox pi-background">
  <div class="pi-item pi-data pi-item-spacing pi-border-color">
    <div class="pi-data-value pi-font">
      Part of the <a href="/wiki/Spider-Man">Spider-Man</a>
       and <a href="/wiki/Clone_Saga_(Event)">Clone Saga (Event)</a> comics
    </div>
  </div>
</aside>
`;

console.log('\n\nTest 3: Filtered excluded categories');
const arcs3 = extractStoryArcsFromHtml(testHtml3, 1);
console.log('Found arcs:', arcs3);
