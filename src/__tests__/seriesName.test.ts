/**
 * Tests for SeriesName utility class
 * 
 * Ensures series name format handling is consistent across:
 * - Display format (spaces): "Amazing Spider-Man Vol 1"
 * - Slug format (underscores): "Amazing_Spider-Man_Vol_1"
 * - Comparison (format-agnostic, case-insensitive)
 */

import { SeriesName, getSeriesColor, SERIES_COLORS } from '../utils/seriesName';

describe('SeriesName', () => {
  describe('normalize', () => {
    test('converts underscores to spaces', () => {
      expect(SeriesName.normalize('Amazing_Spider-Man_Vol_1')).toBe('Amazing Spider-Man Vol 1');
    });

    test('preserves hyphens in names', () => {
      expect(SeriesName.normalize('Amazing_Spider-Man_Vol_1')).toBe('Amazing Spider-Man Vol 1');
    });

    test('collapses multiple spaces', () => {
      expect(SeriesName.normalize('Amazing  Spider-Man   Vol  1')).toBe('Amazing Spider-Man Vol 1');
    });

    test('trims leading and trailing whitespace', () => {
      expect(SeriesName.normalize('  Amazing Spider-Man Vol 1  ')).toBe('Amazing Spider-Man Vol 1');
    });

    test('handles mixed underscores and spaces', () => {
      expect(SeriesName.normalize('Amazing_Spider-Man Vol_1')).toBe('Amazing Spider-Man Vol 1');
    });

    test('handles empty string', () => {
      expect(SeriesName.normalize('')).toBe('');
    });

    test('handles string with only underscores', () => {
      expect(SeriesName.normalize('___')).toBe('');
    });
  });

  describe('constructor and basic accessors', () => {
    test('creates SeriesName from space format', () => {
      const series = new SeriesName('Amazing Spider-Man Vol 1');
      expect(series.toDisplay()).toBe('Amazing Spider-Man Vol 1');
    });

    test('creates SeriesName from underscore format', () => {
      const series = new SeriesName('Amazing_Spider-Man_Vol_1');
      expect(series.toDisplay()).toBe('Amazing Spider-Man Vol 1');
    });

    test('toString returns canonical format', () => {
      const series = new SeriesName('Untold_Tales_of_Spider-Man_Vol_1');
      expect(series.toString()).toBe('Untold Tales of Spider-Man Vol 1');
    });
  });

  describe('toDisplay', () => {
    test('returns human-readable format with spaces', () => {
      const series = new SeriesName('Amazing_Spider-Man_Vol_1');
      expect(series.toDisplay()).toBe('Amazing Spider-Man Vol 1');
    });

    test('preserves display format if input already has spaces', () => {
      const series = new SeriesName('Amazing Spider-Man Vol 1');
      expect(series.toDisplay()).toBe('Amazing Spider-Man Vol 1');
    });
  });

  describe('toSlug', () => {
    test('returns slug format with underscores', () => {
      const series = new SeriesName('Amazing Spider-Man Vol 1');
      expect(series.toSlug()).toBe('Amazing_Spider-Man_Vol_1');
    });

    test('preserves slug format if input already has underscores', () => {
      const series = new SeriesName('Amazing_Spider-Man_Vol_1');
      expect(series.toSlug()).toBe('Amazing_Spider-Man_Vol_1');
    });

    test('converts all spaces to underscores', () => {
      const series = new SeriesName('Untold Tales of Spider-Man Vol 1');
      expect(series.toSlug()).toBe('Untold_Tales_of_Spider-Man_Vol_1');
    });
  });

  describe('equals', () => {
    test('matches identical space format names', () => {
      const series = new SeriesName('Amazing Spider-Man Vol 1');
      expect(series.equals('Amazing Spider-Man Vol 1')).toBe(true);
    });

    test('matches identical underscore format names', () => {
      const series = new SeriesName('Amazing_Spider-Man_Vol_1');
      expect(series.equals('Amazing_Spider-Man_Vol_1')).toBe(true);
    });

    test('matches space format against underscore format', () => {
      const series = new SeriesName('Amazing Spider-Man Vol 1');
      expect(series.equals('Amazing_Spider-Man_Vol_1')).toBe(true);
    });

    test('matches underscore format against space format', () => {
      const series = new SeriesName('Amazing_Spider-Man_Vol_1');
      expect(series.equals('Amazing Spider-Man Vol 1')).toBe(true);
    });

    test('comparison is case-insensitive', () => {
      const series = new SeriesName('Amazing Spider-Man Vol 1');
      expect(series.equals('amazing spider-man vol 1')).toBe(true);
      expect(series.equals('AMAZING SPIDER-MAN VOL 1')).toBe(true);
    });

    test('matches SeriesName instance', () => {
      const series1 = new SeriesName('Amazing Spider-Man Vol 1');
      const series2 = new SeriesName('Amazing_Spider-Man_Vol_1');
      expect(series1.equals(series2)).toBe(true);
    });

    test('does not match different series', () => {
      const series = new SeriesName('Amazing Spider-Man Vol 1');
      expect(series.equals('Untold Tales of Spider-Man Vol 1')).toBe(false);
    });

    test('handles empty strings', () => {
      const series = new SeriesName('Amazing Spider-Man Vol 1');
      expect(series.equals('')).toBe(false);
    });
  });

  describe('matchesAny', () => {
    test('returns true if any name matches', () => {
      const series = new SeriesName('Amazing Spider-Man Vol 1');
      expect(series.matchesAny([
        'Untold Tales of Spider-Man Vol 1',
        'Amazing_Spider-Man_Vol_1',
        'Amazing Spider-Man Annual Vol 1'
      ])).toBe(true);
    });

    test('returns false if no names match', () => {
      const series = new SeriesName('Amazing Spider-Man Vol 1');
      expect(series.matchesAny([
        'Untold Tales of Spider-Man Vol 1',
        'Amazing Spider-Man Annual Vol 1'
      ])).toBe(false);
    });

    test('works with SeriesName instances', () => {
      const series = new SeriesName('Amazing Spider-Man Vol 1');
      expect(series.matchesAny([
        new SeriesName('Untold Tales of Spider-Man Vol 1'),
        new SeriesName('Amazing_Spider-Man_Vol_1')
      ])).toBe(true);
    });

    test('handles empty array', () => {
      const series = new SeriesName('Amazing Spider-Man Vol 1');
      expect(series.matchesAny([])).toBe(false);
    });
  });

  describe('areEqual static method', () => {
    test('matches identical names', () => {
      expect(SeriesName.areEqual('Amazing Spider-Man Vol 1', 'Amazing Spider-Man Vol 1')).toBe(true);
    });

    test('matches different formats', () => {
      expect(SeriesName.areEqual('Amazing Spider-Man Vol 1', 'Amazing_Spider-Man_Vol_1')).toBe(true);
      expect(SeriesName.areEqual('Amazing_Spider-Man_Vol_1', 'Amazing Spider-Man Vol 1')).toBe(true);
    });

    test('comparison is case-insensitive', () => {
      expect(SeriesName.areEqual('Amazing Spider-Man Vol 1', 'amazing spider-man vol 1')).toBe(true);
    });

    test('returns false for different series', () => {
      expect(SeriesName.areEqual('Amazing Spider-Man Vol 1', 'Untold Tales of Spider-Man Vol 1')).toBe(false);
    });
  });

  describe('fromFilePath', () => {
    test('extracts series from villains file', () => {
      const series = SeriesName.fromFilePath('data/villains.Amazing_Spider-Man_Vol_1.json');
      expect(series).not.toBeNull();
      expect(series!.toDisplay()).toBe('Amazing Spider-Man Vol 1');
    });

    test('extracts series from raw file', () => {
      const series = SeriesName.fromFilePath('data/raw.Untold_Tales_of_Spider-Man_Vol_1.json');
      expect(series).not.toBeNull();
      expect(series!.toDisplay()).toBe('Untold Tales of Spider-Man Vol 1');
    });

    test('extracts series from d3-config file', () => {
      const series = SeriesName.fromFilePath('data/d3-config.Amazing_Spider-Man_Annual_Vol_1.json');
      expect(series).not.toBeNull();
      expect(series!.toDisplay()).toBe('Amazing Spider-Man Annual Vol 1');
    });

    test('handles absolute paths', () => {
      const series = SeriesName.fromFilePath('C:\\Users\\data\\villains.Amazing_Spider-Man_Vol_1.json');
      expect(series).not.toBeNull();
      expect(series!.toDisplay()).toBe('Amazing Spider-Man Vol 1');
    });

    test('returns null for invalid file patterns', () => {
      expect(SeriesName.fromFilePath('data/invalid.json')).toBeNull();
      expect(SeriesName.fromFilePath('data/Amazing_Spider-Man_Vol_1.txt')).toBeNull();
      expect(SeriesName.fromFilePath('data/other-file.json')).toBeNull();
    });
  });

  describe('getSupportedSeries', () => {
    test('returns array of SeriesName instances', () => {
      const series = SeriesName.getSupportedSeries();
      expect(Array.isArray(series)).toBe(true);
      expect(series.length).toBeGreaterThan(0);
      expect(series[0]).toBeInstanceOf(SeriesName);
    });

    test('includes all expected series', () => {
      const series = SeriesName.getSupportedSeries();
      const names = series.map(s => s.toDisplay());
      
      expect(names).toContain('Amazing Spider-Man Vol 1');
      expect(names).toContain('Amazing Spider-Man Annual Vol 1');
      expect(names).toContain('Untold Tales of Spider-Man Vol 1');
    });
  });

  describe('isSupported', () => {
    test('returns true for supported series in space format', () => {
      expect(SeriesName.isSupported('Amazing Spider-Man Vol 1')).toBe(true);
      expect(SeriesName.isSupported('Untold Tales of Spider-Man Vol 1')).toBe(true);
    });

    test('returns true for supported series in underscore format', () => {
      expect(SeriesName.isSupported('Amazing_Spider-Man_Vol_1')).toBe(true);
      expect(SeriesName.isSupported('Untold_Tales_of_Spider-Man_Vol_1')).toBe(true);
    });

    test('returns false for unsupported series', () => {
      expect(SeriesName.isSupported('Spider-Man 2099 Vol 1')).toBe(false);
      expect(SeriesName.isSupported('Unknown Series')).toBe(false);
    });

    test('is case-insensitive', () => {
      expect(SeriesName.isSupported('amazing spider-man vol 1')).toBe(true);
    });
  });
});

describe('getSeriesColor', () => {
  test('returns color for space format', () => {
    expect(getSeriesColor('Amazing Spider-Man Vol 1')).toBe('#e74c3c');
    expect(getSeriesColor('Untold Tales of Spider-Man Vol 1')).toBe('#3498db');
  });

  test('returns color for underscore format', () => {
    expect(getSeriesColor('Amazing_Spider-Man_Vol_1')).toBe('#e74c3c');
    expect(getSeriesColor('Untold_Tales_of_Spider-Man_Vol_1')).toBe('#3498db');
  });

  test('returns default color for unknown series', () => {
    expect(getSeriesColor('Unknown Series')).toBe('#999');
  });

  test('handles empty string', () => {
    expect(getSeriesColor('')).toBe('#999');
  });
});

describe('SERIES_COLORS constant', () => {
  test('includes both space and underscore formats', () => {
    expect(SERIES_COLORS['Amazing Spider-Man Vol 1']).toBeDefined();
    expect(SERIES_COLORS['Amazing_Spider-Man_Vol_1']).toBeDefined();
  });

  test('space and underscore formats have same color', () => {
    expect(SERIES_COLORS['Amazing Spider-Man Vol 1']).toBe(SERIES_COLORS['Amazing_Spider-Man_Vol_1']);
    expect(SERIES_COLORS['Untold Tales of Spider-Man Vol 1']).toBe(SERIES_COLORS['Untold_Tales_of_Spider-Man_Vol_1']);
  });
});

describe('Integration scenarios', () => {
  test('file slug matches data field after round-trip', () => {
    const original = 'Amazing Spider-Man Vol 1';
    const series = new SeriesName(original);
    const slug = series.toSlug();
    const restored = new SeriesName(slug);
    
    expect(restored.equals(original)).toBe(true);
  });

  test('CLI argument normalization', () => {
    // User passes underscore format from CLI
    const cliInput = 'Untold_Tales_of_Spider-Man_Vol_1';
    const series = new SeriesName(cliInput);
    
    // Should work for file naming
    expect(series.toSlug()).toBe('Untold_Tales_of_Spider-Man_Vol_1');
    
    // Should work for display
    expect(series.toDisplay()).toBe('Untold Tales of Spider-Man Vol 1');
    
    // Should work for color lookup
    expect(getSeriesColor(series.toString())).toBe('#3498db');
  });

  test('data file parsing scenario', () => {
    // Parse filename
    const series = SeriesName.fromFilePath('data/villains.Amazing_Spider-Man_Vol_1.json');
    expect(series).not.toBeNull();
    
    // Should match data from JSON
    const dataField = 'Amazing_Spider-Man_Vol_1';
    expect(series!.equals(dataField)).toBe(true);
    
    // Should get correct color
    expect(getSeriesColor(series!.toString())).toBe('#e74c3c');
  });

  test('comparison across different sources', () => {
    const fromCli = new SeriesName('Amazing_Spider-Man_Vol_1');
    const fromData = 'Amazing Spider-Man Vol 1';
    const fromConfig = new SeriesName('amazing spider-man vol 1');
    
    expect(fromCli.equals(fromData)).toBe(true);
    expect(fromCli.equals(fromConfig)).toBe(true);
    expect(SeriesName.areEqual(fromData, fromConfig.toString())).toBe(true);
  });
});
