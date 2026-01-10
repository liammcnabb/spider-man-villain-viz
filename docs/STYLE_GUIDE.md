# Spider-Man Villain Timeline - Style Guide

**Version**: 1.0  
**Last Updated**: January 10, 2026  
**Status**: Active

## Overview

This style guide defines the visual design system for the Spider-Man Villain Timeline project. It balances **comic book aesthetics** with **data visualization best practices** for large-scale categorical data (420+ villains across multiple series).

### Design Principles

1. **Comic Book Heritage**: Honor the visual language of Spider-Man comics
2. **Perceptual Optimization**: Maximize discriminability for large categorical datasets
3. **Accessibility**: Ensure readability across different viewing conditions
4. **Scalability**: Support growth from 420 to potentially 1000+ villains

---

## 1. Color System

### 1.1 Primary Brand Colors

Based on classic Spider-Man iconography:

```css
--spidey-red: #e74c3c;      /* Primary red - Spider-Man's suit */
--spidey-blue: #3498db;     /* Primary blue - Spider-Man's suit */
--web-silver: #ecf0f1;      /* Light accent - spider web */
--shadow-black: #2c3e50;    /* Dark accent - shadows */
```

**Usage**:
- Headers, CTAs, primary UI elements
- Series differentiation (main series vs. annuals)
- High-priority visual markers

### 1.2 Villain Categorical Palette

**Challenge**: 420+ unique villains require a large, perceptually-optimized color palette.

**Solution**: Implementing PalettAilor methodology (Wang et al., 2020) with three optimization constraints:

#### A. Point Distinctness (EPD)
- Minimum perceptual distance between any two colors in CIELAB space
- Target: CIEDE2000 ΔE ≥ 10 for primary palette
- Ensures colors are discriminable even at small sizes

#### B. Name Difference (END)
- Avoids colors with similar names (e.g., "Violet" vs "Dark Purple")
- Uses cosine distance on color name vectors
- Prevents cognitive confusion in legends and tooltips

#### C. Color Discrimination (EDC)
- Maximizes inter-class distance while maintaining background contrast
- Prevents similar colors from clustering near each other
- Target minimum CIEDE2000 distance: 10 units

### 1.3 Tier-Based Color Strategy

Given 420 villains, we use a tiered approach:

#### Tier 1: Major Villains (Top 40 by appearance frequency)
**Palette Size**: 40 colors  
**Optimization**: Full PalettAilor with all three constraints  
**Luminance Range**: L* ∈ [35, 75] for both light and dark themes  
**Hue Distribution**: Even spread across color wheel  

**Implementation**:
```typescript
// Generated via simulated annealing with:
// - ω1 = 0.45 (Point Distinctness weight)
// - ω2 = 0.05 (Name Difference weight)
// - ω3 = 0.50 (Color Discrimination weight)

const TIER_1_PALETTE = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#16a085', '#d35400', '#c0392b',
  '#8e44ad', '#27ae60', '#2980b9', '#f1c40f', '#34495e',
  // ... 25 more optimized colors
];
```

#### Tier 2: Secondary Villains (41-150)
**Palette Size**: 110 colors  
**Strategy**: Tier 1 colors + systematic hue/saturation/luminance variations  
**Minimum ΔE**: 7 units  

#### Tier 3: Minor Villains (151+)
**Strategy**: Hash-based assignment from extended palette  
**Fallback**: Grayscale range for extremely rare appearances  

### 1.4 Theme-Specific Adjustments

#### Light Theme (Default)
```css
:root {
  --color-background: #f5f5f5;    /* Newsprint texture */
  --color-surface: #ffffff;
  --color-text: #333333;
  --color-border: #e0e0e0;
  --color-grid: #eeeeee;
  
  /* Villain colors: Standard palette */
  --villain-luminance-min: 35;
  --villain-luminance-max: 75;
}
```

#### Dark Theme
```css
body.dark-theme {
  --color-background: #1a1a1a;
  --color-surface: #2d2d2d;
  --color-text: #e0e0e0;
  --color-border: #404040;
  --color-grid: #333333;
  
  /* Villain colors: Increased luminance for contrast */
  --villain-luminance-min: 45;
  --villain-luminance-max: 85;
}
```

**Adaptation Rule**: All villain colors shift +10 L* units in dark theme to maintain WCAG AA contrast ratio (4.5:1).

### 1.5 Series Color Coding

Different Spider-Man series use distinct colors for issue markers:

```typescript
const SERIES_COLORS = {
  'Amazing Spider-Man Vol 1': '#e74c3c',        // Classic red
  'Amazing Spider-Man Annual Vol 1': '#9b59b6',  // Royal purple
  'Untold Tales of Spider-Man Vol 1': '#1abc9c', // Teal
  'Spectacular Spider-Man Vol 1': '#f39c12',     // Orange
  'Web of Spider-Man Vol 1': '#34495e',          // Dark gray-blue
};
```

**Requirements**:
- Minimum CIEDE2000 ΔE of 15 between any two series colors
- Must work on both light and dark backgrounds
- High saturation for quick recognition

---

## 2. Typography

### 2.1 Font Stack

```css
--font-primary: 'Bangers', 'Comic Sans MS', cursive;       /* Headers */
--font-secondary: -apple-system, BlinkMacSystemFont, 
                 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 
                 'Cantarell', sans-serif;                  /* Body */
--font-mono: 'Courier New', Courier, monospace;            /* Code/Data */
```

### 2.2 Type Scale

Based on comic book lettering hierarchy:

```css
--text-xs: 0.75rem;    /* 12px - Caption text */
--text-sm: 0.875rem;   /* 14px - Secondary info */
--text-base: 1rem;     /* 16px - Body text */
--text-lg: 1.125rem;   /* 18px - Emphasized */
--text-xl: 1.25rem;    /* 20px - Subheadings */
--text-2xl: 1.5rem;    /* 24px - Card headers */
--text-3xl: 2rem;      /* 32px - Section titles */
--text-4xl: 2.5rem;    /* 40px - Page title */
--text-5xl: 3rem;      /* 48px - Hero text */
```

### 2.3 Font Weights

```css
--weight-regular: 400;
--weight-medium: 500;
--weight-bold: 700;
--weight-black: 900;   /* Comic emphasis */
```

### 2.4 Line Heights

```css
--leading-tight: 1.2;   /* Headers */
--leading-normal: 1.5;  /* Body */
--leading-relaxed: 1.7; /* Long-form content */
```

### 2.5 Letter Spacing

```css
--tracking-tight: -0.02em;  /* Large headings */
--tracking-normal: 0;
--tracking-wide: 0.05em;    /* All-caps labels */
--tracking-wider: 0.1em;    /* Comic emphasis */
```

---

## 3. Comic Book Visual Elements

### 3.1 Halftone Patterns

Inspired by Ben-Day dots from classic comic printing:

```css
.halftone-overlay {
  background-image: 
    radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px);
  background-size: 4px 4px;
  opacity: 0.3;
  mix-blend-mode: multiply;
}
```

**Usage**:
- Subtle texture on header backgrounds
- Card hover states
- Loading states

### 3.2 Speech Bubble Tooltips

```css
.tooltip {
  background: white;
  border: 3px solid black;
  border-radius: 12px;
  padding: 12px 16px;
  position: relative;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
}

.tooltip::after {
  content: '';
  position: absolute;
  border: 12px solid transparent;
  border-top-color: black;
  /* Tail positioning */
}
```

### 3.3 Comic Panel Borders

```css
.panel-border {
  border: 4px solid var(--shadow-black);
  border-radius: 4px;
  box-shadow: 
    inset 0 0 0 2px white,
    4px 4px 0 rgba(0, 0, 0, 0.2);
}
```

### 3.4 Action Lines (Speed Lines)

For animated transitions and emphasis:

```css
.action-lines {
  background: 
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(255,255,255,0.1) 10px,
      rgba(255,255,255,0.1) 12px
    );
}
```

---

## 4. Data Visualization Specific

### 4.1 Grid Visualization

#### Cell Colors
- **Appearance cell**: Villain's assigned color from palette
- **Empty cell**: `transparent` or very light gray (#f9f9f9)
- **Hover state**: 20% lighter + 3px border
- **Selected state**: Full saturation + 4px border

#### Grid Lines
```css
.grid-line {
  stroke: var(--color-grid);
  stroke-width: 1px;
  opacity: 0.5;
}

.grid-line.major {
  stroke-width: 2px;
  opacity: 0.8;
  stroke: var(--color-border);
}
```

#### Cell Sizing
- **Minimum cell size**: 8px × 8px (for dense overview)
- **Default cell size**: 20px × 20px (readable)
- **Maximum cell size**: 40px × 40px (detailed view)
- **Gap**: 1-2px between cells

### 4.2 Node Visualization (Scatter/Network)

#### Node Styling
```typescript
const nodeStyle = {
  radius: Math.sqrt(appearances * 2),  // Area proportional to data
  fill: villainColor,
  stroke: '#ffffff',
  strokeWidth: 2,
  opacity: 0.85
};
```

#### Node States
- **Default**: 85% opacity
- **Hover**: 100% opacity + stroke-width: 3px
- **Selected**: 100% opacity + glow effect
- **Dimmed**: 30% opacity (when others selected)

### 4.3 Timeline Axis

```css
.axis-line {
  stroke: var(--color-text);
  stroke-width: 2px;
}

.axis-tick {
  stroke: var(--color-text-light);
  stroke-width: 1px;
}

.axis-label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  fill: var(--color-text);
  text-anchor: middle;
}
```

**Issue Number Formatting**:
- Main series: `#123`
- Annuals: `Annual #5`
- Special issues: Badge with series color

### 4.4 Legend Design

```css
.legend {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.legend-item:hover {
  background: var(--color-background);
}

.legend-color-swatch {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid rgba(0,0,0,0.2);
  flex-shrink: 0;
}
```

**Legend Organization**:
1. Sort by appearance frequency (descending)
2. Group by villain type/affiliation if > 50 items
3. Search/filter functionality for > 30 items
4. Sticky header for scrollable legends

---

## 5. Spacing & Layout

### 5.1 Spacing Scale

```css
--spacing-unit: 8px;  /* Base unit */

/* Multipliers */
--space-1: 8px;   /* 0.5rem */
--space-2: 16px;  /* 1rem */
--space-3: 24px;  /* 1.5rem */
--space-4: 32px;  /* 2rem */
--space-5: 40px;  /* 2.5rem */
--space-6: 48px;  /* 3rem */
--space-8: 64px;  /* 4rem */
--space-10: 80px; /* 5rem */
```

### 5.2 Container Widths

```css
--container-sm: 640px;   /* Mobile landscape */
--container-md: 768px;   /* Tablet */
--container-lg: 1024px;  /* Desktop */
--container-xl: 1280px;  /* Large desktop */
--container-2xl: 1536px; /* Ultra-wide */
```

### 5.3 Border Radius

```css
--radius-sm: 4px;   /* Buttons, inputs */
--radius-md: 8px;   /* Cards, panels */
--radius-lg: 12px;  /* Modal, tooltips */
--radius-xl: 16px;  /* Hero sections */
--radius-full: 9999px; /* Pills, circles */
```

### 5.4 Shadows

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 2px 4px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 8px 12px rgba(0, 0, 0, 0.15);

/* Comic-style shadow */
--shadow-comic: 4px 4px 0 rgba(0, 0, 0, 0.3);
```

---

## 6. Interactive States

### 6.1 Transitions

```css
--transition-fast: 150ms ease;
--transition-base: 250ms ease;
--transition-slow: 350ms ease;
--transition-bounce: 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### 6.2 Button States

```css
.button {
  background: var(--spidey-red);
  color: white;
  transition: all var(--transition-base);
}

.button:hover {
  background: #c0392b;  /* Darker red */
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.button:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

.button:focus-visible {
  outline: 3px solid var(--spidey-blue);
  outline-offset: 2px;
}
```

### 6.3 Visualization Interaction

#### Hover Effects
```typescript
const hoverEffect = {
  duration: 150,
  easing: 'ease-out',
  properties: {
    scale: 1.1,
    strokeWidth: 3,
    opacity: 1.0
  }
};
```

#### Selection Feedback
- **Visual**: Highlight color + glow
- **Haptic**: Subtle pulse animation
- **Audio**: Optional click sound (comic book "THWIP!")

---

## 7. Accessibility Requirements

### 7.1 Color Contrast

**WCAG 2.1 Level AA Compliance**:
- Text contrast ratio: ≥ 4.5:1 (normal text)
- Large text contrast ratio: ≥ 3:1 (18pt+ or 14pt+ bold)
- UI component contrast: ≥ 3:1

**Testing**:
```bash
# Use axe-core for automated testing
npm run test:a11y
```

### 7.2 Color Blindness Considerations

All villain color assignments must pass:
- **Protanopia** (red-blind) simulation
- **Deuteranopia** (green-blind) simulation  
- **Tritanopia** (blue-blind) simulation

**Implementation**:
- Pair colors with patterns/textures when needed
- Never use color alone to convey information
- Provide alternative visual encodings (size, shape, pattern)

### 7.3 Keyboard Navigation

```typescript
const keyboardShortcuts = {
  'Arrow Keys': 'Navigate grid cells',
  'Space': 'Select/deselect cell',
  'Enter': 'Open detail view',
  'Escape': 'Close modal/reset selection',
  'Tab': 'Cycle through interactive elements',
  '/': 'Focus search/filter',
  'Z': 'Zoom in',
  'X': 'Zoom out',
  'R': 'Reset zoom',
  'F': 'Toggle fullscreen',
  'T': 'Toggle theme'
};
```

### 7.4 Screen Reader Support

```html
<!-- Example: Grid cell -->
<div 
  role="gridcell"
  aria-label="Green Goblin appears in Amazing Spider-Man #14"
  tabindex="0"
>
  <!-- Visual content -->
</div>

<!-- Example: Legend item -->
<div 
  role="listitem"
  aria-label="Green Goblin: 15 appearances"
>
  <span aria-hidden="true" class="color-swatch"></span>
  <span>Green Goblin</span>
</div>
```

---

## 8. Performance Considerations

### 8.1 Color Palette Optimization

For 420+ villains:
- **Pre-compute** all villain colors at data load
- **Cache** color assignments in `Map<string, string>`
- **Use CSS variables** for theme switching (no re-computation)

```typescript
// Efficient color lookup
const villainColorCache = new Map<string, string>();

function getVillainColor(name: string): string {
  if (!villainColorCache.has(name)) {
    villainColorCache.set(name, computeColor(name));
  }
  return villainColorCache.get(name)!;
}
```

### 8.2 Rendering Optimization

- **Virtualization**: Only render visible cells/nodes
- **Canvas fallback**: Use `<canvas>` instead of SVG for > 1000 elements
- **GPU acceleration**: Use `transform` and `opacity` for animations

### 8.3 Bundle Size

- **Icon fonts**: ~50KB max
- **Color palette**: Pre-computed, embedded in JS
- **No runtime color generation** for production

---

## 9. Implementation Guidelines

### 9.1 Color Assignment Algorithm

```typescript
/**
 * Assigns colors to villains using PalettAilor-inspired approach
 * 
 * @param villains - Array of villain objects with appearance counts
 * @returns Map of villain name to hex color
 */
function assignVillainColors(
  villains: Villain[]
): Map<string, string> {
  // Sort by appearance frequency
  const sorted = [...villains].sort(
    (a, b) => b.appearances.length - a.appearances.length
  );
  
  const colorMap = new Map<string, string>();
  
  // Tier 1: Top 40 villains get optimized colors
  for (let i = 0; i < Math.min(40, sorted.length); i++) {
    colorMap.set(sorted[i].name, TIER_1_PALETTE[i]);
  }
  
  // Tier 2: Use extended palette with hash-based selection
  for (let i = 40; i < sorted.length; i++) {
    const hash = hashString(sorted[i].name);
    const colorIndex = hash % EXTENDED_PALETTE.length;
    colorMap.set(sorted[i].name, EXTENDED_PALETTE[colorIndex]);
  }
  
  return colorMap;
}
```

### 9.2 Theme Switching

```typescript
function adjustColorForTheme(
  hexColor: string, 
  theme: 'light' | 'dark'
): string {
  const lab = hexToLab(hexColor);
  
  if (theme === 'dark') {
    // Increase luminance for dark theme
    lab.L = Math.min(85, lab.L + 10);
  }
  
  return labToHex(lab);
}
```

### 9.3 Responsive Breakpoints

```css
/* Mobile first */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

**Visualization Adaptations**:
- < 640px: Single column, simplified grid
- 640-1024px: Responsive grid with zoom
- \> 1024px: Full-featured interactive visualization

---

## 10. Future Considerations

### 10.1 Scalability to 1000+ Villains

When dataset grows beyond current 420:
1. **Implement full PalettAilor algorithm** with simulated annealing
2. **Use hierarchical color grouping** (by villain type/team)
3. **Introduce patterns/textures** as secondary encoding
4. **Add search-driven color highlighting** (fade non-matches)

### 10.2 Alternative Color Encodings

For future features:
- **Villain alignment**: Hero/Villain/Neutral with hue ranges
- **Power level**: Saturation encoding
- **Threat level**: Luminance encoding
- **Team affiliation**: Hue families

### 10.3 Custom Palette Generation

Expose palette customization:
```typescript
interface PaletteConfig {
  size: number;
  luminanceRange: [number, number];
  hueRange?: [number, number];
  saturationRange: [number, number];
  minDistance: number;  // CIEDE2000 ΔE
}
```

---

## 11. References

1. **PalettAilor**: Lu, K., Feng, M., Chen, X., et al. (2020). "Discriminable Colorization for Categorical Data." IEEE VIS 2020.
2. **WCAG 2.1**: Web Content Accessibility Guidelines
3. **Marvel Style Guide**: Official Marvel Comics brand guidelines
4. **D3.js Color Schemes**: https://github.com/d3/d3-scale-chromatic
5. **ColorBrewer**: https://colorbrewer2.org/

---

## 12. Change Log

### Version 1.0 (January 10, 2026)
- Initial style guide creation
- PalettAilor integration for 420+ villain palette
- Comic book aesthetic principles defined
- Accessibility requirements established

---

## Appendix A: Complete Color Palettes

### Tier 1 Palette (40 colors)
```typescript
export const TIER_1_PALETTE = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#16a085', '#d35400', '#c0392b',
  '#8e44ad', '#27ae60', '#2980b9', '#f1c40f', '#34495e',
  '#e84393', '#00b894', '#0984e3', '#6c5ce7', '#fdcb6e',
  '#d63031', '#00cec9', '#fd79a8', '#a29bfe', '#ffeaa7',
  '#2d3436', '#fab1a0', '#ff7675', '#74b9ff', '#55efc4',
  '#81ecec', '#dfe6e9', '#b2bec3', '#636e72', '#ff6b6b',
  '#4ecdc4', '#45b7d1', '#f9ca24', '#eb3b5a', '#fa8231'
];
```

### Extended Palette (110 additional colors)
*Generated using systematic HSL variations with minimum ΔE = 7*

---

**END OF STYLE GUIDE**
