/**
 * Spider-Man Villain Timeline - D3.js Visualization
 * 
 * Renders interactive timeline visualization of villain appearances
 */

// Configuration constants
const VIZ_CONFIG = {
    margin: { top: 30, right: 30, bottom: 40, left: 70 },
    animationDuration: 750,
    tooltipDelay: 100
};

/**
 * Main visualization class
 */
class SpiderManVisualization {
    constructor() {
        this.data = null;
        this.config = null;
        this.villains = [];
        this.groups = [];
        this.seriesData = [];  // Store separate series data for grid display
        this.showTrailingGrids = true; // Toggle state for trailing empty cells
        this.elasticMode = false; // Elastic X-axis toggle state
        this.minAppearancesFilter = 3; // Minimum number of appearances to display
        this.yAxisSort = 'default'; // Sorting method: 'default' or 'span'
        this.gridSvg = null; // Reference to current grid SVG
        this.gridZoom = null; // Reference to current zoom behavior
        this.gridGroup = null; // Reference to zoomed group
        this.activeVillainIds = new Set(); // Filter: selected villains
        this.activeVillainNames = new Set(); // Lowercased names for fallback matching
        this.activeGroupNames = new Set(); // Filter: selected groups
        this.activeVolumeNames = new Set(); // Filter: selected volumes
        this.sparklineDomainMode = 'relative'; // Sparkline domain mode: 'relative' | 'full'
        this.timelineYearRange = null; // Global timeline year range derived from dataset
        this.refreshVillainList = null; // Callback to rerender villain list when settings change
        this.villainById = new Map();
        this.villainByName = new Map();
        this.groupMembers = new Map();
        this.seriesColorMap = {}; // Will be populated from config.seriesColors
        this.appearanceMetadata = new Map(); // Map<"villainName#issueNumber", metadata>
        
        // Performance: debounce timers and caches
        this._renderDebounceTimer = null;
        this._filterDebounceTimer = null;
        this._dataCache = new Map(); // Cache loaded JSON to avoid re-fetching
        this._sparklineCache = new Map(); // Cache computed sparkline data per villain
    }

    /**
     * Debounce utility for performance optimization
     */
    debounce(fn, delay = 150) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    /**
     * Normalize image URLs so they work when the site is hosted in a sub-path (e.g., GitHub Pages)
     */
    normalizeImageUrl(url) {
        if (!url) return '';
        if (/^https?:\/\//i.test(url)) return url;
        return url.replace(/^\//, '');
    }

    /**
     * Normalize a series name into a display title and volume label
     */
    getSeriesDisplay(seriesName) {
        const name = seriesName || '';
        const match = name.match(/^(.*)\s+Vol\s+(\d+)$/i);
        if (match) {
            return {
                title: match[1].trim(),
                volume: `Vol ${match[2]}`
            };
        }
        return { title: name, volume: null };
    }

    /**
     * Create a styled volume badge element
     */
    createVolumeBadge(volume) {
        if (!volume) return null;
        const badge = document.createElement('span');
        badge.className = 'volume-badge';
        badge.textContent = volume;
        return badge;
    }

    /**
     * Initialize visualization - load and render data
     */
    async init() {
        try {
            // Show loading state
            this.showLoadingState();
            
            // Load primary data files in parallel
            const [villainData, d3Config] = await Promise.all([
                this.loadJSON('data/villains.json'),
                this.loadJSON('data/d3-config.json')
            ]);

            this.data = villainData;
            this.config = d3Config;
            this.sparklineDomainMode = this.getSavedSparklineMode();
            this.timelineYearRange = this.computeTimelineYearRange();
            // Populate series color map from loaded config
            if (d3Config.seriesColors) {
                this.seriesColorMap = d3Config.seriesColors;
                console.log('✓ Loaded series colors from config:', this.seriesColorMap);
            } else {
                console.warn('⚠️ No seriesColors found in d3Config');
            }
            this.villains = villainData.villains || [];
            this.groups = this.resolveGroups(villainData);
            this.villains.forEach(v => {
                this.villainById.set(v.id, v);
                this.villainByName.set((v.name || '').toLowerCase(), v);
            });
            this.buildGroupMembersLookup();

            // Load series-specific data for grid visualization (in parallel)
            this.seriesData = await this.loadSeriesData();
            
            // Build metadata lookup for appearance visualization
            this.appearanceMetadata = await this.buildMetadataLookup(this.seriesData);

            // Initialize theme
            this.initializeTheme();

            // Setup filters
            this.setupFilterControls();
            
            // Hide loading state before rendering
            this.hideLoadingState();

            // Render all components - use requestAnimationFrame for smoother loading
            requestAnimationFrame(() => {
                this.renderStats();
                this.renderGridTimeline();
                this.renderHistogram();
                this.renderTimeline();
                this.renderVillainList();
                this.setupSparklineToggle();
                this.renderGroupList();
                this.renderMissingVillainIssues();

                // Setup toggle listeners
                this.setupGridToggle();
                
                console.log('✅ Visualization loaded successfully');
            });
        } catch (error) {
            this.hideLoadingState();
            console.error('Error loading visualization:', error);
            this.showError(
                'Failed to load data. ' +
                'Please run "npm run scrape" first.'
            );
        }
    }
    
    /**
     * Show loading indicator
     */
    showLoadingState() {
        const container = document.querySelector('.main-content');
        if (!container) return;
        
        // Check if loading indicator already exists
        if (document.getElementById('loadingIndicator')) return;
        
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loadingIndicator';
        loadingDiv.className = 'loading-indicator';
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Loading villain data...</p>
        `;
        container.insertBefore(loadingDiv, container.firstChild);
    }
    
    /**
     * Hide loading indicator
     */
    hideLoadingState() {
        const loading = document.getElementById('loadingIndicator');
        if (loading) {
            loading.remove();
        }
    }

    /**
     * Initialize theme from localStorage or system preference
     */
    initializeTheme() {
        // Check for saved preference
        const savedTheme = localStorage.getItem('villainTimelineTheme');
        
        if (savedTheme) {
            // Use saved preference
            if (savedTheme === 'dark') {
                this.setDarkTheme();
            }
        } else {
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.setDarkTheme();
            }
        }
        
        // Setup theme toggle listener
        this.setupThemeToggle();
    }

    /**
     * Load persisted sparkline domain preference
     */
    getSavedSparklineMode() {
        try {
            const stored = localStorage.getItem('sparklineDomainMode');
            return stored === 'full' ? 'full' : 'relative';
        } catch (err) {
            console.warn('Unable to read sparkline preference, using default', err);
            return 'relative';
        }
    }

    /**
     * Setup theme toggle button listener
     */
    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        themeToggle.addEventListener('click', () => {
            if (document.body.classList.contains('dark-theme')) {
                this.setLightTheme();
            } else {
                this.setDarkTheme();
            }
        });
    }

    /**
     * Enable dark theme
     */
    setDarkTheme() {
        document.body.classList.add('dark-theme');
        localStorage.setItem('villainTimelineTheme', 'dark');
        this.updateThemeIcon();
        // Re-render grids with new SVG background
        this.rerenderCharts();
    }

    /**
     * Enable light theme
     */
    setLightTheme() {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('villainTimelineTheme', 'light');
        this.updateThemeIcon();
        // Re-render grids with new SVG background
        this.rerenderCharts();
    }

    /**
     * Update theme toggle icon
     */
    updateThemeIcon() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;
        
        const icon = themeToggle.querySelector('.theme-icon');
        if (document.body.classList.contains('dark-theme')) {
            icon.textContent = '☀️';
            themeToggle.title = 'Switch to Light Theme';
        } else {
            icon.textContent = '🌙';
            themeToggle.title = 'Switch to Dark Theme';
        }
    }

    /**
     * Re-render charts when theme changes
     */
    rerenderCharts() {
        this.renderGridTimeline();
        this.renderHistogram();
        this.renderTimeline();
    }

    /**
     * Load series-specific data files
     */
    async loadSeriesData() {
        const seriesList = [
            { file: 'data/villains.Amazing_Spider-Man_Vol_1.json', name: 'Amazing Spider-Man Vol 1', color: '#e74c3c' },
            { file: 'data/villains.Untold_Tales_of_Spider-Man_Vol_1.json', name: 'Untold Tales of Spider-Man Vol 1', color: '#3498db' }
        ];

        const loaded = [];
        for (const series of seriesList) {
            try {
                const data = await this.loadJSON(series.file);
                loaded.push({
                    name: series.name,
                    color: series.color,
                    data: data
                });
            } catch (err) {
                // Series file not available, skip silently
                console.debug(`Series file ${series.file} not available`);
            }
        }

        return loaded;
    }

    /**
     * Normalize villain name (remove parenthetical info like real names)
     * Matches the processing done in the data pipeline
     */
    normalizeVillainName(name) {
        // Trim whitespace
        let normalized = name.trim();
        
        // Remove alias information in parentheses
        // e.g., "Green Goblin (Norman Osborn)" → "Green Goblin"
        normalized = normalized.replace(/\([^)]*\)/g, '').trim();
        
        // Remove trailing punctuation
        normalized = normalized.replace(/[,;:\.]+$/, '').trim();
        
        // Standardize spacing (remove multiple spaces)
        normalized = normalized.replace(/\s+/g, ' ');
        
        return normalized;
    }

    /**
     * Build metadata lookup from series data
     * Maps "villainName#issueNumber" to appearance metadata
     */
    async buildMetadataLookup(seriesData) {
        const metadata = new Map();
        
        for (const series of seriesData) {
            const seriesName = series.name;
            if (!series.data || !series.data.timeline) continue;
            
            for (const timelineEntry of series.data.timeline) {
                const issueNum = timelineEntry.issue;
                
                if (timelineEntry.villains && Array.isArray(timelineEntry.villains)) {
                    for (const villain of timelineEntry.villains) {
                        const villainName = typeof villain === 'string' ? villain : villain.name;
                        if (!villainName) continue;
                        
                        // Create a placeholder entry - metadata will be populated from raw data
                        // when available
                        const key = `${villainName}#${issueNum}`;
                        if (!metadata.has(key)) {
                            metadata.set(key, {
                                firstAppearance: false,
                                death: false,
                                mentionedOnly: false,
                                flashback: false
                            });
                        }
                    }
                }
            }
        }
        
        // Try to load raw data and merge metadata
        await this.loadAndMergeRawMetadata(metadata, seriesData);
        
        return metadata;
    }

    /**
     * Load raw data files and merge metadata into the lookup
     */
    async loadAndMergeRawMetadata(metadataMap, seriesData) {
        const rawDataFiles = [
            { file: 'data/raw.Amazing_Spider-Man_Vol_1.json', series: 'Amazing Spider-Man Vol 1' },
            { file: 'data/raw.Untold_Tales_of_Spider-Man_Vol_1.json', series: 'Untold Tales of Spider-Man Vol 1' },
            { file: 'data/raw.Amazing_Spider-Man_Annual_Vol_1.json', series: 'Amazing Spider-Man Annual Vol 1' },
            { file: 'data/raw.Peter_Parker,_The_Spectacular_Spider-Man_Vol_1.json', series: 'Peter Parker, The Spectacular Spider-Man Vol 1' },
            { file: 'data/raw.Sensational_Spider-Man_Vol_1.json', series: 'Sensational Spider-Man Vol 1' },
            { file: 'data/raw.Spider-Man_Unlimited_Vol_1.json', series: 'Spider-Man Unlimited Vol 1' },
            { file: 'data/raw.Spider-Man_Vol_1.json', series: 'Spider-Man Vol 1' },
            { file: 'data/raw.Web_of_Spider-Man_Vol_1.json', series: 'Web of Spider-Man Vol 1' }
        ];
        
        for (const rawFile of rawDataFiles) {
            try {
                const rawData = await this.loadJSON(rawFile.file);
                if (!rawData.issues) continue;
                
                for (const issue of rawData.issues) {
                    const issueNum = issue.issueNumber;
                    
                    if (!issue.antagonists) continue;
                    for (const antagonist of issue.antagonists) {
                        if (typeof antagonist === 'string') continue;
                        
                        const rawVillainName = antagonist.name;
                        const normalizedName = this.normalizeVillainName(rawVillainName);
                        const meta = antagonist.metadata;
                        
                        if (meta && normalizedName) {
                            // Build a robust set of keys to tolerate punctuation/hyphen differences
                            const keySet = new Set();
                            keySet.add(`${normalizedName}#${issueNum}`);
                            keySet.add(`${rawVillainName}#${issueNum}`);

                            const normalizedNoHyphen = normalizedName.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
                            const rawNoHyphen = rawVillainName.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

                            if (normalizedNoHyphen && normalizedNoHyphen !== normalizedName) {
                                keySet.add(`${normalizedNoHyphen}#${issueNum}`);
                            }
                            if (rawNoHyphen && rawNoHyphen !== rawVillainName) {
                                keySet.add(`${rawNoHyphen}#${issueNum}`);
                            }

                            const metadataEntry = {
                                firstAppearance: meta.firstAppearance === true,
                                death: meta.death === true,
                                mentionedOnly: meta.mentionedOnly === true,
                                flashback: meta.flashback === true
                            };

                            // Update all matching keys
                            for (const key of keySet) {
                                metadataMap.set(key, metadataEntry);
                            }
                        }
                    }
                }
            } catch (err) {
                // Raw data file not available, continue
                console.debug(`Raw data file ${rawFile.file} not available`);
            }
        }
    }

    /**
     * Resolve groups data, falling back to timeline-derived groups when absent
     */
    resolveGroups(villainData) {
        if (Array.isArray(villainData.groups) && villainData.groups.length > 0) {
            return villainData.groups;
        }

        // Fallback: derive unique groups from timeline entries
        const timeline = villainData.timeline || [];
        const map = new Map();
        for (const t of timeline) {
            const groups = t.groups || [];
            for (const g of groups) {
                const key = g.name;
                if (!map.has(key)) {
                    map.set(key, {
                        id: g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                        name: g.name,
                        url: undefined,
                        appearances: [t.issue],
                        frequency: 1
                    });
                } else {
                    const entry = map.get(key);
                    if (!entry.appearances.includes(t.issue)) {
                        entry.appearances.push(t.issue);
                        entry.frequency += 1;
                    }
                }
            }
        }
        return Array.from(map.values());
    }

    /**
     * Build lookup of group members aggregated across timeline appearances
     */
    buildGroupMembersLookup() {
        this.groupMembers.clear();
        const timeline = this.data?.timeline || [];
        for (const entry of timeline) {
            const groups = entry.groups || [];
            for (const g of groups) {
                if (!this.groupMembers.has(g.name)) {
                    this.groupMembers.set(g.name, new Set());
                }
                const bucket = this.groupMembers.get(g.name);
                (g.members || []).forEach(m => bucket.add(m));
            }
        }
    }

    /**
     * Get all unique series/volumes from the config data
     */
    getUniqueSeries() {
        if (!this.config || !this.config.data) return [];
        
        const seriesSet = new Set();
        this.config.data.forEach(item => {
            if (item.series) {
                seriesSet.add(item.series);
            }
        });
        
        // Sort by appearance order
        return Array.from(seriesSet).sort();
    }

    /**
     * Setup villain/group filter controls
     */
    setupFilterControls() {
        const villainInput = document.getElementById('villainFilterInput');
        const villainOptions = document.getElementById('villainOptions');
        const addVillainBtn = document.getElementById('addVillainFilter');
        const groupInput = document.getElementById('groupFilterInput');
        const groupOptions = document.getElementById('groupOptions');
        const addGroupBtn = document.getElementById('addGroupFilter');
        const volumeInput = document.getElementById('volumeFilterInput');
        const volumeOptions = document.getElementById('volumeOptions');
        const addVolumeBtn = document.getElementById('addVolumeFilter');
        const clearBtn = document.getElementById('clearFiltersBtn');

        // Populate datalists
        if (villainOptions) {
            villainOptions.innerHTML = '';
            // Sort villains alphabetically
            const sortedVillains = [...this.villains].sort((a, b) => a.name.localeCompare(b.name));
            sortedVillains.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.name;
                opt.label = v.name;
                villainOptions.appendChild(opt);
            });
        }
        if (groupOptions) {
            groupOptions.innerHTML = '';
            // Sort groups alphabetically
            const sortedGroups = [...this.groups].sort((a, b) => a.name.localeCompare(b.name));
            sortedGroups.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g.name;
                opt.label = g.name;
                groupOptions.appendChild(opt);
            });
        }
        if (volumeOptions) {
            volumeOptions.innerHTML = '';
            this.getUniqueSeries().forEach(series => {
                const opt = document.createElement('option');
                opt.value = series;
                opt.label = series;
                volumeOptions.appendChild(opt);
            });
        }

        const addVillain = () => {
            if (!villainInput) return;
            const name = (villainInput.value || '').trim();
            if (!name) return;
            const villain = this.villainByName.get(name.toLowerCase());
            if (villain) {
                this.activeVillainIds.add(villain.id);
                this.activeVillainNames.add(villain.name.toLowerCase());
            } else {
                this.activeVillainNames.add(name.toLowerCase());
            }
            villainInput.value = '';
            this.renderActiveFilters();
            this.rerenderCharts();
        };

        const addGroup = () => {
            if (!groupInput) return;
            const name = (groupInput.value || '').trim();
            if (!name) return;
            this.activeGroupNames.add(name);
            groupInput.value = '';
            this.renderActiveFilters();
            this.rerenderCharts();
        };

        const addVolume = () => {
            if (!volumeInput) return;
            const name = (volumeInput.value || '').trim();
            if (!name) return;
            this.activeVolumeNames.add(name);
            volumeInput.value = '';
            this.renderActiveFilters();
            this.rerenderCharts();
        };

        if (addVillainBtn) {
            addVillainBtn.addEventListener('click', addVillain);
        }
        if (villainInput) {
            villainInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addVillain();
                }
            });
        }
        if (addGroupBtn) {
            addGroupBtn.addEventListener('click', addGroup);
        }
        if (groupInput) {
            groupInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addGroup();
                }
            });
        }
        if (addVolumeBtn) {
            addVolumeBtn.addEventListener('click', addVolume);
        }
        if (volumeInput) {
            volumeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addVolume();
                }
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.activeVillainIds.clear();
                this.activeVillainNames.clear();
                this.activeGroupNames.clear();
                this.activeVolumeNames.clear();
                this.renderActiveFilters();
                this.rerenderCharts();
            });
        }

        this.renderActiveFilters();
    }

    /**
     * Wire up global sparkline domain toggle
     */
    setupSparklineToggle() {
        const toggle = document.getElementById('sparklineFullTimelineToggle');
        if (!toggle) return;

        toggle.checked = this.sparklineDomainMode === 'full';

        toggle.addEventListener('change', () => {
            this.sparklineDomainMode = toggle.checked ? 'full' : 'relative';
            try {
                localStorage.setItem('sparklineDomainMode', this.sparklineDomainMode);
            } catch (err) {
                console.warn('Unable to persist sparkline preference', err);
            }

            if (typeof this.refreshVillainList === 'function') {
                this.refreshVillainList();
            }
        });
    }

    /**
     * Render active filter chips
     */
    renderActiveFilters() {
        const villainChipRow = document.getElementById('activeVillainFilters');
        const groupChipRow = document.getElementById('activeGroupFilters');
        const volumeChipRow = document.getElementById('activeVolumeFilters');

        if (villainChipRow) {
            villainChipRow.innerHTML = '';
            const villainIds = Array.from(this.activeVillainIds);
            const villainNames = Array.from(this.activeVillainNames);

            villainIds.forEach(id => {
                const v = this.villainById.get(id);
                if (!v) return;
                villainChipRow.appendChild(this.createChip(v.name, () => {
                    this.activeVillainIds.delete(id);
                    this.activeVillainNames.delete(v.name.toLowerCase());
                    this.renderActiveFilters();
                    this.rerenderCharts();
                }));
            });

            // Names added without a matching record (fallback)
            villainNames
                .filter(name => !villainIds.some(id => {
                    const v = this.villainById.get(id);
                    return v && v.name.toLowerCase() === name;
                }))
                .forEach(name => {
                    villainChipRow.appendChild(this.createChip(name, () => {
                        this.activeVillainNames.delete(name);
                        this.renderActiveFilters();
                        this.rerenderCharts();
                    }));
                });
        }

        if (groupChipRow) {
            groupChipRow.innerHTML = '';
            this.activeGroupNames.forEach(name => {
                groupChipRow.appendChild(this.createChip(name, () => {
                    this.activeGroupNames.delete(name);
                    this.renderActiveFilters();
                    this.rerenderCharts();
                }));
            });
        }

        if (volumeChipRow) {
            volumeChipRow.innerHTML = '';
            this.activeVolumeNames.forEach(name => {
                volumeChipRow.appendChild(this.createChip(name, () => {
                    this.activeVolumeNames.delete(name);
                    this.renderActiveFilters();
                    this.rerenderCharts();
                }));
            });
        }
    }

    /**
     * Create a removable chip element
     */
    createChip(label, onRemove) {
        const chip = document.createElement('span');
        chip.className = 'filter-chip';
        chip.textContent = label;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'chip-remove';
        removeBtn.type = 'button';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', onRemove);

        chip.appendChild(removeBtn);
        return chip;
    }

    /**
     * Load JSON file with in-memory caching for performance
     * Cache is used during the session to avoid re-fetching on filter changes
     */
    async loadJSON(url, bypassCache = false) {
        // Check in-memory cache first (for repeated loads during same session)
        if (!bypassCache && this._dataCache.has(url)) {
            return this._dataCache.get(url);
        }
        
        // Add timestamp only on first load to get fresh data once per session
        const separator = url.includes('?') ? '&' : '?';
        const bustedUrl = bypassCache ? `${url}${separator}t=${Date.now()}` : url;
        
        const response = await fetch(bustedUrl);
        if (!response.ok) {
            throw new Error(
                `Failed to load ${url}: ${response.statusText}`
            );
        }
        
        const data = await response.json();
        this._dataCache.set(url, data); // Cache for subsequent reads
        return data;
    }

    /**
     * Display error message
     */
    showError(message) {
        const container = document.querySelector('.main-content');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        container.insertBefore(errorDiv, container.firstChild);
    }

    /**
     * Setup toggle listener for trailing grids
     */
    setupGridToggle() {
        const toggle = document.getElementById('showTrailingGrids');
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                this.showTrailingGrids = e.target.checked;
                this.renderGridTimeline();
            });
        }

        const elasticToggle = document.getElementById('elasticModeToggle');
        if (elasticToggle) {
            elasticToggle.addEventListener('change', (e) => {
                this.elasticMode = e.target.checked;
                this.syncTrailingToggleState();
                this.renderGridTimeline();
            });
        }

        // Setup minimum appearances filter
        const minAppearances = document.getElementById('minAppearancesFilter');
        if (minAppearances) {
            minAppearances.addEventListener('change', (e) => {
                this.minAppearancesFilter = parseInt(e.target.value) || 3;
                this.renderGridTimeline();
            });
        }

        // Setup Y-axis sort selector
        const yAxisSort = document.getElementById('yAxisSort');
        if (yAxisSort) {
            yAxisSort.addEventListener('change', (e) => {
                this.yAxisSort = e.target.value;
                this.renderGridTimeline();
            });
        }

        // Setup zoom controls
        this.setupZoomControls();

        // Setup fullscreen
        this.setupFullscreen();

        // Ensure trailing toggle reflects elastic state on load
        this.syncTrailingToggleState();
    }

    /**
     * Sync trailing toggle state based on elastic mode
     */
    syncTrailingToggleState() {
        const trailingToggle = document.getElementById('showTrailingGrids');
        if (!trailingToggle) return;

        if (this.elasticMode) {
            trailingToggle.checked = true;
            trailingToggle.disabled = true;
        } else {
            trailingToggle.disabled = false;
        }
    }

    /**
     * Setup zoom control buttons
     */
    setupZoomControls() {
        const zoomIn = document.getElementById('zoomIn');
        const zoomOut = document.getElementById('zoomOut');
        const zoomReset = document.getElementById('zoomReset');

        if (zoomIn) {
            zoomIn.addEventListener('click', () => this.zoomGridIn());
        }
        if (zoomOut) {
            zoomOut.addEventListener('click', () => this.zoomGridOut());
        }
        if (zoomReset) {
            zoomReset.addEventListener('click', () => this.zoomGridReset());
        }
    }

    /**
     * Zoom in on the grid
     */
    zoomGridIn() {
        if (!this.gridSvg || !this.gridZoom) return;
        this.gridSvg.transition().duration(300).call(
            this.gridZoom.scaleBy,
            1.3
        );
    }

    /**
     * Zoom out on the grid
     */
    zoomGridOut() {
        if (!this.gridSvg || !this.gridZoom) return;
        this.gridSvg.transition().duration(300).call(
            this.gridZoom.scaleBy,
            0.77
        );
    }

    /**
     * Reset zoom on the grid
     */
    zoomGridReset() {
        if (!this.gridSvg || !this.gridZoom) return;
        this.gridSvg.transition().duration(300).call(
            this.gridZoom.transform,
            d3.zoomIdentity
        );
    }

    /**
     * Setup fullscreen functionality
     */
    setupFullscreen() {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (!fullscreenBtn) return;

        fullscreenBtn.addEventListener('click', () => {
            const container = document.getElementById('gridContainer');
            if (!container) return;

            if (!document.fullscreenElement) {
                // Enter fullscreen
                if (container.requestFullscreen) {
                    container.requestFullscreen();
                } else if (container.webkitRequestFullscreen) {
                    container.webkitRequestFullscreen();
                } else if (container.msRequestFullscreen) {
                    container.msRequestFullscreen();
                }
            } else {
                // Exit fullscreen
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }
        });

        // Setup floating zoom controls toggle
        this.setupFloatingZoomToggle();

        // Update button text when fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            this.updateFullscreenButtonText();
        });
        document.addEventListener('webkitfullscreenchange', () => {
            this.updateFullscreenButtonText();
        });
        document.addEventListener('msfullscreenchange', () => {
            this.updateFullscreenButtonText();
        });
    }

    /**
     * Setup floating zoom controls toggle
     */
    setupFloatingZoomToggle() {
        const toggleBtn = document.getElementById('toggleZoomControls');
        const buttonsContainer = document.getElementById('zoomButtonsContainer');
        
        if (!toggleBtn || !buttonsContainer) return;

        toggleBtn.addEventListener('click', () => {
            buttonsContainer.classList.toggle('collapsed');
        });
    }

    /**
     * Update fullscreen button text based on state
     */
    updateFullscreenButtonText() {
        const btn = document.getElementById('fullscreenBtn');
        if (!btn) return;
        
        if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
            btn.textContent = '⛶';
            btn.title = 'Exit Fullscreen';
        } else {
            btn.textContent = '⛶';
            btn.title = 'Fullscreen';
        }
    }

    /**
     * Get SVG background color based on current theme
     */
    getSvgBackground() {
        if (document.body.classList.contains('dark-theme')) {
            return '#2d2d2d';
        }
        return '#ffffff';
    }

    /**
     * Add SVG pattern definitions for metadata visualization
     */
    addSVGPatterns(svg) {
        const defs = svg.append('defs');
        
        // Swap colors: dark theme uses light stripes, light theme uses dark stripes
        const stripeColor = document.body.classList.contains('dark-theme') ? '#cccccc' : '#2e2e2e';
        
        // Diagonal stripe pattern for mentioned/flashback (transparent background)
        const stripePattern = defs.append('pattern')
            .attr('id', 'diagonal-stripes')
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', 3)
            .attr('height', 3)
            .attr('patternTransform', 'rotate(-45)');
        
        stripePattern.append('rect')
            .attr('width', 3)
            .attr('height', 3)
            .attr('fill', 'none');
        
        stripePattern.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', 0)
            .attr('y2', 3)
            .attr('stroke', stripeColor)
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 1);

        // Dedicated pattern for death X stripes (fixed light color)
        const deathStripePattern = defs.append('pattern')
            .attr('id', 'diagonal-stripes-death')
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', 3)
            .attr('height', 3)
            .attr('patternTransform', 'rotate(-45)');

        deathStripePattern.append('rect')
            .attr('width', 3)
            .attr('height', 3)
            .attr('fill', 'none');

        deathStripePattern.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', 0)
            .attr('y2', 3)
            .attr('stroke', stripeColor)
            .attr('stroke-width', 100)
            .attr('stroke-opacity', 1);
        
        // X pattern for death (using SVG group with crossed lines)
        const xMarker = defs.append('marker')
            .attr('id', 'death-x')
            .attr('markerWidth', 10)
            .attr('markerHeight', 10)
            .attr('refX', 5)
            .attr('refY', 5)
            .attr('markerUnits', 'strokeWidth');
    }

    /**
     * Get appearance metadata for a villain in a specific issue
     * Uses normalized villain name to match processed names to raw metadata
     */
    getAppearanceMetadata(villainName, issueNum) {
        const rawName = villainName || '';
        const normalized = this.normalizeVillainName(rawName);
        const normalizedNoHyphen = normalized.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
        const rawNoHyphen = rawName.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

        const candidateKeys = [
            `${normalized}#${issueNum}`,
            `${rawName}#${issueNum}`
        ];

        if (normalizedNoHyphen && normalizedNoHyphen !== normalized) {
            candidateKeys.push(`${normalizedNoHyphen}#${issueNum}`);
        }
        if (rawNoHyphen && rawNoHyphen !== rawName) {
            candidateKeys.push(`${rawNoHyphen}#${issueNum}`);
        }

        for (const key of candidateKeys) {
            const entry = this.appearanceMetadata.get(key);
            if (entry) {
                return entry;
            }
        }

        return {
            firstAppearance: false,
            death: false,
            mentionedOnly: false,
            flashback: false
        };
    }

    /**
     * Apply metadata styling to a cell element
     */
    applyMetadataStyles(element, metadata, cellGroup, x, y, cellSize) {
        if (!metadata) return;
        
        // First appearance: draw inner border for rects, stroke for circles
        // Note: For grid rects, this is applied before overlays; for circles it uses stroke directly
        if (metadata.firstAppearance && element.node().tagName === 'circle') {
            // For circles, use stroke directly
            element.attr('stroke', '#000000')
                   .attr('stroke-width', 2);
        }
    }

    /**
     * Draw first appearance border after all other overlays
     * This ensures the border is visible on top of stripes and other overlays
     */
    drawFirstAppearanceBorder(cellGroup, x, y, cellSize) {
        const borderWidth = 2;
        const inset = 1;
        cellGroup.append('rect')
            .attr('x', x + inset)
            .attr('y', y + inset)
            .attr('width', cellSize - (inset * 2))
            .attr('height', cellSize - (inset * 2))
            .attr('fill', 'none')
            .attr('stroke', '#000000')
            .attr('stroke-width', borderWidth)
            .attr('pointer-events', 'none');
    }

    /**
     * Overlay stripes for mentioned/flashback without losing base color
     */
    addStripeOverlay(group, x, y, width, height, isCircle = false, radius = null) {
        const overlay = group.append(isCircle ? 'circle' : 'rect')
            .attr('fill', 'url(#diagonal-stripes)')
            .attr('pointer-events', 'none');
        
        if (isCircle && radius !== null) {
            overlay.attr('cx', x).attr('cy', y).attr('r', radius);
        } else {
            overlay.attr('x', x).attr('y', y).attr('width', width).attr('height', height);
        }
    }

    /**
     * Draw an X pattern over a cell for death using filled diagonal stripes
     */
    drawDeathX(g, x, y, cellSize, color) {
        // Keep the X centered and inside the shape by using a bounded square
        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;
        const half = Math.max(4, cellSize * 0.28); // scale with cell size but stay inside pill/circle
        const length = half * 2; // full length of X arm
        const width = 4; // thickness of each arm

        // Two filled rectangles rotated to form the X; pattern keeps it contained inside the shape
        g.append('rect')
            .attr('x', cx - width / 2)
            .attr('y', cy - half)
            .attr('width', width)
            .attr('height', length)
            .attr('transform', 'rotate(45 ' + cx + ' ' + cy + ')')
            .attr('fill', 'url(#diagonal-stripes-death)')
            .attr('pointer-events', 'none');

        g.append('rect')
            .attr('x', cx - width / 2)
            .attr('y', cy - half)
            .attr('width', width)
            .attr('height', length)
            .attr('transform', 'rotate(-45 ' + cx + ' ' + cy + ')')
            .attr('fill', 'url(#diagonal-stripes-death)')
            .attr('pointer-events', 'none');
    }

    /**
     * Render statistics panel
     */
    renderStats() {
        const stats = this.data.stats;
        
        document.getElementById('totalVillains').textContent = 
            stats.totalVillains;
        document.getElementById('mostFrequent').textContent = 
            stats.mostFrequent;
        document.getElementById('mostFrequentCount').textContent = 
            stats.mostFrequentCount;
        document.getElementById('avgFrequency').textContent = 
            stats.averageFrequency.toFixed(2);
    }

    matchesActiveFilters(villainName, villainId) {
        const record = this.villainByName.get((villainName || '').toLowerCase());
        const id = villainId || record?.id;

        // Villain filter
        const villainMatch = this.activeVillainIds.size === 0 && this.activeVillainNames.size === 0
            ? true
            : (id && this.activeVillainIds.has(id)) || this.activeVillainNames.has((villainName || '').toLowerCase());

        // Group filter
        const groupMatch = this.activeGroupNames.size === 0
            ? true
            : this.isVillainInSelectedGroups(villainName);

        return villainMatch && groupMatch;
    }

    isVillainInSelectedGroups(villainName) {
        if (this.activeGroupNames.size === 0) return true;
        const name = (villainName || '').toLowerCase();
        for (const groupName of this.activeGroupNames) {
            const members = this.groupMembers.get(groupName) || new Set();
            if (Array.from(members).some(m => (m || '').toLowerCase() === name)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Build timeline series applying active filters
     */
    buildTimelineSeries() {
        const timeline = this.data?.timeline || [];

        return timeline.map(entry => {
            const villains = entry.villains || [];
            const urls = entry.villainUrls || [];
            const ids = entry.villainIds || [];

            const filteredVillains = villains.filter((name, idx) => {
                const id = ids[idx];
                const match = this.matchesActiveFilters(name, id);
                if (!match && this.activeGroupNames.size > 0) {
                    return this.isVillainInSelectedGroups(name);
                }
                return match;
            });

            return {
                issueNumber: entry.issue,
                chronologicalPosition: entry.chronologicalPosition,
                series: entry.series,
                releaseDate: entry.releaseDate,
                villainsInIssue: filteredVillains,
                villainCount: filteredVillains.length
            };
        });
    }

    /**
     * Render unified grid timeline visualization using chronological order across all series
     */
    renderGridTimeline() {
        const gridContainer = document.getElementById('grid-timeline');
        if (!gridContainer) return;

        // Clear previous content
        gridContainer.innerHTML = '';

        // Use the combined timeline from main data
        const allIssues = this.data.timeline || [];

        // Create SVG container
        const svgContainer = document.createElement('div');
        svgContainer.style.marginBottom = '20px';
        svgContainer.style.overflowX = 'auto';
        svgContainer.style.borderRadius = '4px';
        svgContainer.style.padding = '10px';
        
        gridContainer.appendChild(svgContainer);

        // Render merged grid
        this.renderUnifiedGrid(allIssues, svgContainer);
    }

    /**
     * Render a unified grid with all series combined, sorted by chronological position
     */
    renderUnifiedGrid(allIssues, containerDiv) {
        // Filter issues by selected volumes
        let filteredIssues = allIssues;
        if (this.activeVolumeNames.size > 0) {
            filteredIssues = allIssues.filter(entry => 
                this.activeVolumeNames.has(entry.series)
            );
        }

        // Track all unique issues and villains
        const issueMap = new Map(); // Map chronoPos to issue entry
        const villainFirstChrono = {};
        const villainLastChrono = {};
        const villainAppearanceCount = {};
        const appearances = {};

        filteredIssues.forEach(entry => {
            const chronoPos = entry.chronologicalPosition || 0;
            issueMap.set(chronoPos, entry);
            
            if (!appearances[chronoPos]) {
                appearances[chronoPos] = new Set();
            }
            
            if (entry.villains) {
                entry.villains.forEach(villain => {
                    // Track first chronological appearance
                    if (!villainFirstChrono[villain]) {
                        villainFirstChrono[villain] = chronoPos;
                        villainAppearanceCount[villain] = 0;
                    }
                    // Track last chronological appearance
                    villainLastChrono[villain] = chronoPos;
                    // Count appearances
                    villainAppearanceCount[villain]++;
                    appearances[chronoPos].add(villain);
                });
            }
        });

        // Filter villains by minimum appearances
        let filteredVillains = Object.keys(villainFirstChrono)
            .filter(villain => villainAppearanceCount[villain] >= this.minAppearancesFilter);

        // Apply active villain/group filters
        filteredVillains = filteredVillains.filter(name => this.matchesActiveFilters(name));

        // Sort villains based on selected sort method
        if (this.yAxisSort === 'span') {
            // Sort by chronological span (longest first)
            filteredVillains.sort((a, b) => {
                const spanA = villainLastChrono[a] - villainFirstChrono[a];
                const spanB = villainLastChrono[b] - villainFirstChrono[b];
                // Reverse sort to get longest span first
                return spanB - spanA;
            });
        } else {
            // Default: sort by first chronological appearance
            filteredVillains.sort((a, b) => villainFirstChrono[a] - villainFirstChrono[b]);
        }

        // Sort issues by chronological position
        const issues = Array.from(issueMap.values())
            .sort((a, b) => (a.chronologicalPosition || 0) - (b.chronologicalPosition || 0))
            .map((entry) => ({
                number: entry.issue,
                label: `#${entry.issue}`,
                chronologicalPosition: entry.chronologicalPosition,
                series: entry.series,
                // VERIFICATION: Grey (#999) = BAD! Indicates series name not found in seriesColorMap
                // If you see grey cells in grid, series name mismatch or seriesColorMap not loaded
                seriesColor: this.seriesColorMap[entry.series] || '#999'
            }));

        // Use filtered villains list
        const villains = filteredVillains;

        if (villains.length === 0) {
            containerDiv.innerHTML = '<p class="chart-description">No villains match the current filters.</p>';
            return;
        }

        if (this.elasticMode) {
            const elasticData = this.buildElasticGridData({
                issues,
                villains,
                appearances,
                issueMap
            });
            this.renderElasticGrid({
                containerDiv,
                villains,
                villainFirstChrono,
                villainLastChrono,
                appearances,
                elasticData
            });
            return;
        }

        const cellSize = 20;
        const marginLeft = 150;
        const marginTop = 40;
        const marginRight = 20;
        const marginBottom = 20;

        const width = issues.length * cellSize;
        const height = villains.length * cellSize;
        const totalWidth = width + marginLeft + marginRight;
        const totalHeight = height + marginTop + marginBottom;

        // Create SVG
        const svg = d3.select(containerDiv)
            .append('svg')
            .attr('width', Math.max(800, totalWidth))
            .attr('height', totalHeight)
            .attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
            .style('background', this.getSvgBackground());

        // Add SVG pattern definitions for metadata visualization
        this.addSVGPatterns(svg);

        // Pan and zoom group
        const g = svg.append('g')
            .attr('transform', `translate(${marginLeft},${marginTop})`);

        // Pan and zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 16])
            .on('zoom', (event) => {
                g.attr('transform', event.transform.translate(marginLeft, marginTop));
            });

        svg.call(zoom);

        // Store references for external zoom control
        this.gridSvg = svg;
        this.gridZoom = zoom;
        this.gridGroup = g;

        // PERFORMANCE OPTIMIZATION: Draw grid background as a single rect + grid lines
        // Instead of creating individual rects for every empty cell
        const emptyColor = document.body.classList.contains('dark-theme') ? '#353535' : '#ecf0f1';
        const gridLineColor = document.body.classList.contains('dark-theme') ? '#2d2d2d' : '#ddd';
                
        // PERFORMANCE: Use single path elements for all grid lines instead of individual lines
        // Build path data for vertical lines
        let verticalPathD = '';
        for (let x = 0; x <= issues.length; x++) {
            verticalPathD += `M${x * cellSize},0 L${x * cellSize},${height} `;
        }
        g.append('path')
            .attr('class', 'grid-lines-v')
            .attr('d', verticalPathD)
            .attr('stroke', gridLineColor)
            .attr('stroke-width', 0.5)
            .attr('fill', 'none');
        
        // Build path data for horizontal lines
        let horizontalPathD = '';
        for (let y = 0; y <= villains.length; y++) {
            horizontalPathD += `M0,${y * cellSize} L${width},${y * cellSize} `;
        }
        g.append('path')
            .attr('class', 'grid-lines-h')
            .attr('d', horizontalPathD)
            .attr('stroke', gridLineColor)
            .attr('stroke-width', 0.5)
            .attr('fill', 'none');

        // For each villain, draw a single rect (or a few, if there are gaps) spanning their timeline
        villains.forEach((villain, yIdx) => {
            // Find the first and last visible issue for this villain in the current filtered issues
            // Only draw if the villain's true first appearance is in the visible issues
            const trueFirstChrono = villainFirstChrono[villain];
            const trueLastChrono = villainLastChrono[villain];
            const firstIdx = issues.findIndex(issue => issue.chronologicalPosition === trueFirstChrono);
            const lastIdx = issues.findIndex(issue => issue.chronologicalPosition === trueLastChrono);
            const y = yIdx * cellSize;
            let xStart = firstIdx;
            let xEnd = lastIdx;
            if (this.showTrailingGrids) {
                xEnd = issues.length - 1;
            }
            // Only draw if the villain's first appearance is in the visible issues
            if (xStart === -1 || xEnd === -1) {
                // Do not draw anything for this villain
                return;
            }
            // Draw background for the villain's row (empty cells)
            g.append('rect')
                .attr('class', 'villain-row-bg')
                .attr('x', xStart * cellSize)
                .attr('y', y)
                .attr('width', (xEnd - xStart + 1) * cellSize)
                .attr('height', cellSize)
                .attr('fill', emptyColor)
                .attr('stroke', 'none');

            // Find all contiguous runs of appearances for this villain (within the visible issues)
            let runStart = null;
            let runColor = null;
            for (let x = xStart; x <= xEnd; x++) {
                const issue = issues[x];
                if (!issue) continue;
                const chronoPos = issue.chronologicalPosition;
                const isPresent = appearances[chronoPos]?.has(villain) ?? false;
                if (isPresent) {
                    if (runStart === null) {
                        runStart = x;
                        runColor = issue.seriesColor;
                    }
                } else {
                    if (runStart !== null) {
                        // End of a run, draw the colored rect
                        g.append('rect')
                            .attr('class', 'villain-appearance')
                            .attr('x', runStart * cellSize)
                            .attr('y', y)
                            .attr('width', (x - runStart) * cellSize)
                            .attr('height', cellSize)
                            .attr('fill', runColor)
                            .attr('stroke', 'none');
                        runStart = null;
                        runColor = null;
                    }
                }
            }
            // If a run was open at the end, close it
            if (runStart !== null) {
                g.append('rect')
                    .attr('class', 'villain-appearance')
                    .attr('x', runStart * cellSize)
                    .attr('y', y)
                    .attr('width', (xEnd - runStart + 1) * cellSize)
                    .attr('height', cellSize)
                    .attr('fill', runColor)
                    .attr('stroke', 'none');
            }
        });

        // Issue labels (X-axis)
        g.selectAll('text.issue-label')
            .data(issues)
            .enter()
            .append('text')
            .attr('class', 'issue-label')
            .attr('x', (d, i) => i * cellSize + cellSize / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .text((d) => d.label)
            .append('title')
            .text((d) => `${d.series} (Chrono: ${d.chronologicalPosition})`);

        // Villain labels (Y-axis)
        g.selectAll('text.villain-label')
            .data(villains)
            .enter()
            .append('text')
            .attr('class', 'villain-label')
            .attr('x', (d) => {
                const firstChrono = villainFirstChrono[d];
                const issueIndex = issues.findIndex(issue => issue.chronologicalPosition === firstChrono);
                return issueIndex * cellSize - 8;
            })
            .attr('y', (d, i) => i * cellSize + cellSize / 2 + 4)
            .attr('text-anchor', 'end')
            .attr('font-size', '11px')
            .text((d) => d);
    }

    /**
     * Build elastic grid data structure (issue + gap columns and web ranges)
     */
    buildElasticGridData({ issues, villains, appearances, issueMap }) {
        // Create a map from chronological position to transformed issue object
        const chronoToIssue = new Map();
        issues.forEach(issue => {
            chronoToIssue.set(issue.chronologicalPosition, issue);
        });
        
        // For elastic mode, only include columns where filtered villains appear
        const relevantChronos = new Set();
        
        // Collect all chronological positions where ANY filtered villain appears
        villains.forEach(villain => {
            for (let chrono in appearances) {
                if (appearances[chrono]?.has(villain)) {
                    relevantChronos.add(Number(chrono));
                }
            }
        });
        
        // Sort the relevant chronos
        const sortedChronos = Array.from(relevantChronos).sort((a, b) => a - b);
        
        if (sortedChronos.length === 0) {
            return {
                elasticColumns: [],
                chronoToElasticPos: new Map(),
                villainChronos: new Map(),
                villainWebRanges: {}
            };
        }
        
        const elasticColumns = [];
        const chronoToElasticPos = new Map();

        for (let i = 0; i < sortedChronos.length; i++) {
            const chrono = sortedChronos[i];
            const issueEntry = chronoToIssue.get(chrono);
            const issueColumn = {
                type: 'issue',
                chrono,
                issue: issueEntry
            };
            chronoToElasticPos.set(chrono, elasticColumns.length);
            elasticColumns.push(issueColumn);

            if (i < sortedChronos.length - 1) {
                const nextChrono = sortedChronos[i + 1];
                const gapSize = nextChrono - chrono - 1;
                if (gapSize > 0) {
                    elasticColumns.push({
                        type: 'gap',
                        fromChrono: chrono,
                        toChrono: nextChrono,
                        gapSize,
                        color: document.body.classList.contains('dark-theme') ? '#2d2d2d' : '#f8f9fa'
                    });
                }
            }
        }

        // Track villain-specific chronological appearances for web ranges
        const villainChronos = new Map();
        villains.forEach((villain) => {
            const chronos = [];
            sortedChronos.forEach((chrono) => {
                if (appearances[chrono]?.has(villain)) {
                    chronos.push(chrono);
                }
            });
            villainChronos.set(villain, chronos);
        });

        const villainWebRanges = {};
        villains.forEach((villain) => {
            const chronos = villainChronos.get(villain) || [];
            const ranges = [];
            for (let i = 0; i < chronos.length - 1; i++) {
                const fromChrono = chronos[i];
                const toChrono = chronos[i + 1];
                const gapSize = toChrono - fromChrono - 1;
                
                // Only create web range if there's an actual gap between appearances
                if (gapSize > 0) {
                    const fromIdx = chronoToElasticPos.get(fromChrono);
                    const toIdx = chronoToElasticPos.get(toChrono);
                    if (typeof fromIdx === 'number' && typeof toIdx === 'number') {
                        const fromIssue = chronoToIssue.get(fromChrono);
                        const toIssue = chronoToIssue.get(toChrono);
                        ranges.push({
                            from: fromIdx,
                            to: toIdx,
                            gapSize: gapSize,
                            fromChrono: fromChrono,
                            toChrono: toChrono,
                            fromIssue: fromIssue,
                            toIssue: toIssue,
                            color: (fromIssue && fromIssue.seriesColor) || '#e74c3c'
                        });
                    }
                }
            }
            villainWebRanges[villain] = ranges;
        });

        return {
            elasticColumns,
            chronoToElasticPos,
            villainChronos,
            villainWebRanges
        };
    }

    /**
     * Render elastic grid with gap columns and web connectors
     */
    renderElasticGrid({ containerDiv, villains, villainFirstChrono, villainLastChrono, appearances, elasticData }) {

        
        const cellSize = 20;
        const marginLeft = 150;
        const marginTop = 40;
        const marginRight = 20;
        const marginBottom = 20;

        const width = elasticData.elasticColumns.length * cellSize;
        const height = villains.length * cellSize;
        const totalWidth = width + marginLeft + marginRight;
        const totalHeight = height + marginTop + marginBottom;

        // Create SVG
        const svg = d3.select(containerDiv)
            .append('svg')
            .attr('width', Math.max(800, totalWidth))
            .attr('height', totalHeight)
            .attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
            .style('background', this.getSvgBackground());

        // Add SVG pattern definitions for metadata visualization
        this.addSVGPatterns(svg);

        // Pan and zoom group
        const g = svg.append('g')
            .attr('transform', `translate(${marginLeft},${marginTop})`);

        // Pan and zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 16])
            .on('zoom', (event) => {
                g.attr('transform', event.transform.translate(marginLeft, marginTop));
            });

        svg.call(zoom);

        this.gridSvg = svg;
        this.gridZoom = zoom;
        this.gridGroup = g;

        // Draw gap column backgrounds across all rows
        elasticData.elasticColumns.forEach((column, xIdx) => {
            if (column.type === 'gap') {
                g.append('rect')
                    .attr('class', 'gap-column-bg')
                    .attr('x', xIdx * cellSize)
                    .attr('y', 0)
                    .attr('width', cellSize)
                    .attr('height', villains.length * cellSize)
                    .attr('fill', column.color)
                    .attr('stroke', 'none')
                    .attr('opacity', 0.12);
            }
        });

        // Issue labels (X-axis) for issue columns only
        g.selectAll('text.elastic-issue-label')
            .data(elasticData.elasticColumns.filter(d => d.type === 'issue'))
            .enter()
            .append('text')
            .attr('class', 'issue-label')
            .attr('x', (d, i) => {
                // Find actual index in elasticColumns
                const actualIdx = elasticData.elasticColumns.indexOf(d);
                return actualIdx * cellSize + cellSize / 2;
            })
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .text((d) => d.issue ? d.issue.label : `#${d.chrono}`)
            .append('title')
            .text((d) => d.issue ? `${d.issue.series} (Chrono: ${d.chrono})` : `Chrono: ${d.chrono}`);

        // Villain labels (Y-axis)
        g.selectAll('text.villain-label')
            .data(villains)
            .enter()
            .append('text')
            .attr('class', 'villain-label')
            .attr('x', (d) => {
                const firstChrono = villainFirstChrono[d];
                const elasticPos = elasticData.chronoToElasticPos.get(firstChrono) || 0;
                return elasticPos * cellSize - 8;
            })
            .attr('y', (d, i) => i * cellSize + cellSize / 2 + 4)
            .attr('text-anchor', 'end')
            .attr('font-size', '11px')
            .text((d) => d);

        // Draw web connectors FIRST (so they appear below circles)
        villains.forEach((villain, yIdx) => {
            const y = yIdx * cellSize;
            const webRanges = elasticData.villainWebRanges[villain] || [];
            
            webRanges.forEach(webRange => {
                const startX = webRange.from * cellSize + cellSize / 2;
                const endX = webRange.to * cellSize + cellSize / 2;
                
                g.append('line')
                    .attr('class', 'web-connector')
                    .attr('x1', startX)
                    .attr('y1', y + cellSize / 2)
                    .attr('x2', endX)
                    .attr('y2', y + cellSize / 2)
                    .attr('stroke', webRange.color)
                    .attr('stroke-width', 2)
                    .attr('opacity', 0.7)
                    .on('mouseenter', (event) => {
                        this.showGridTooltip(event, {
                            villain,
                            issue: `Web Connector`,
                            series: webRange.fromIssue ? webRange.fromIssue.series : 'Unknown',
                            present: false,
                            chronoPos: webRange.fromChrono,
                            webInfo: `${webRange.fromIssue ? webRange.fromIssue.label : '#' + webRange.fromChrono} → ${webRange.toIssue ? webRange.toIssue.label : '#' + webRange.toChrono} (Gap: ${webRange.gapSize} issues)`
                        });
                    })
                    .on('mouseleave', () => {
                        this.hideGridTooltip();
                    });
            });
        });

        // Render villain rows (cells on top of lines)
        villains.forEach((villain, yIdx) => {
            const y = yIdx * cellSize;
            const webRanges = elasticData.villainWebRanges[villain] || [];
            
            // Get villain's appearances sorted by chrono
            const villainAppearances = elasticData.elasticColumns
                .map((col, idx) => ({ col, idx }))
                .filter(({ col }) => col.type === 'issue' && appearances[col.chrono]?.has(villain))
                .map(({ col, idx }) => ({ chrono: col.chrono, colIdx: idx, issue: col.issue }));
            
            // Detect consecutive runs
            const consecutiveRuns = [];
            let currentRun = null;
            
            villainAppearances.forEach((app, i) => {
                const isConsecWithPrev = i > 0 && app.chrono === villainAppearances[i - 1].chrono + 1;
                const isConsecWithNext = i < villainAppearances.length - 1 && villainAppearances[i + 1].chrono === app.chrono + 1;
                
                if (!isConsecWithPrev && !isConsecWithNext) {
                    // Standalone
                    consecutiveRuns.push({ type: 'standalone', appearances: [app] });
                } else if (!isConsecWithPrev && isConsecWithNext) {
                    // Start of run
                    currentRun = { type: 'run', appearances: [app] };
                } else if (isConsecWithPrev && isConsecWithNext) {
                    // Middle of run
                    currentRun.appearances.push(app);
                } else if (isConsecWithPrev && !isConsecWithNext) {
                    // End of run
                    currentRun.appearances.push(app);
                    consecutiveRuns.push(currentRun);
                    currentRun = null;
                }
            });
            
            // Draw each run
            consecutiveRuns.forEach(run => {
                if (run.type === 'standalone') {
                    // Draw full circle
                    const app = run.appearances[0];
                    const x = app.colIdx * cellSize;
                    const cellColor = (app.issue && app.issue.seriesColor) || '#e74c3c';
                    const issueNumberForMetadata = app.issue ? app.issue.number : app.chrono;
                    const metadata = this.getAppearanceMetadata(villain, issueNumberForMetadata);
                    
                    // Create a group for the circle and potential X overlay
                    const cellGroup = g.append('g');
                    
                    const circle = cellGroup.append('circle')
                        .attr('class', 'grid-cell')
                        .attr('cx', x + cellSize / 2)
                        .attr('cy', y + cellSize / 2)
                        .attr('r', cellSize / 2.5)
                        .attr('fill', cellColor)
                        .attr('stroke', 'none')
                        .on('mouseenter', (event) => {
                            this.showGridTooltip(event, {
                                villain,
                                issue: app.issue ? app.issue.label : `#${app.chrono}`,
                                series: app.issue ? app.issue.series : 'Unknown',
                                present: true,
                                chronoPos: app.chrono,
                                metadata: metadata
                            });
                        })
                        .on('mouseleave', () => {
                            this.hideGridTooltip();
                        });
                    
                    // Apply metadata styles
                    this.applyMetadataStyles(circle, metadata, cellGroup, x, y, cellSize);
                    
                    // Mentioned/flashback stripes overlay (skip if death)
                    if ((metadata.mentionedOnly || metadata.flashback) && !metadata.death) {
                        this.addStripeOverlay(cellGroup, x + cellSize / 2, y + cellSize / 2, 0, 0, true, cellSize / 2.5);
                    }
                    
                    if (metadata.death) {
                        this.drawDeathX(cellGroup, x, y, cellSize, cellColor);
                    }
                } else {
                    // Draw consecutive run as connected shape
                    run.appearances.forEach((app, idx) => {
                        const x = app.colIdx * cellSize;
                        const cellColor = (app.issue && app.issue.seriesColor) || '#e74c3c';
                        const radius = cellSize / 2.5;
                        const issueNumberForMetadata = app.issue ? app.issue.number : app.chrono;
                        const metadata = this.getAppearanceMetadata(villain, issueNumberForMetadata);
                        
                        if (idx === 0) {
                            // Left half-circle
                            const path = `
                                M ${x + cellSize / 2} ${y + cellSize / 2 - radius}
                                A ${radius} ${radius} 0 0 0 ${x + cellSize / 2} ${y + cellSize / 2 + radius}
                                L ${x + cellSize} ${y + cellSize / 2 + radius}
                                L ${x + cellSize} ${y + cellSize / 2 - radius}
                                Z
                            `;
                            const cellGroup = g.append('g');
                            
                            const pathEl = cellGroup.append('path')
                                .attr('class', 'grid-cell')
                                .attr('d', path)
                                .attr('fill', cellColor)
                                .attr('stroke', 'none')
                                .on('mouseenter', (event) => {
                                    this.showGridTooltip(event, {
                                        villain,
                                        issue: app.issue ? app.issue.label : `#${app.chrono}`,
                                        series: app.issue ? app.issue.series : 'Unknown',
                                        present: true,
                                        chronoPos: app.chrono,
                                        metadata: metadata
                                    });
                                })
                                .on('mouseleave', () => {
                                    this.hideGridTooltip();
                                });
                            
                            // Apply metadata styles
                            this.applyMetadataStyles(pathEl, metadata, cellGroup, x, y, cellSize);
                            
                            // Mentioned/flashback stripes overlay (skip if death)
                            if ((metadata.mentionedOnly || metadata.flashback) && !metadata.death) {
                                cellGroup.append('path')
                                    .attr('d', path)
                                    .attr('fill', 'url(#diagonal-stripes)')
                                    .attr('pointer-events', 'none');
                            }
                            
                            if (metadata.death) {
                                this.drawDeathX(cellGroup, x, y, cellSize, cellColor);
                            }
                        } else if (idx === run.appearances.length - 1) {
                            // Right half-circle
                            const path = `
                                M ${x} ${y + cellSize / 2 - radius}
                                L ${x + cellSize / 2} ${y + cellSize / 2 - radius}
                                A ${radius} ${radius} 0 0 1 ${x + cellSize / 2} ${y + cellSize / 2 + radius}
                                L ${x} ${y + cellSize / 2 + radius}
                                Z
                            `;
                            const cellGroup = g.append('g');
                            
                            const pathEl = cellGroup.append('path')
                                .attr('class', 'grid-cell')
                                .attr('d', path)
                                .attr('fill', cellColor)
                                .attr('stroke', 'none')
                                .on('mouseenter', (event) => {
                                    this.showGridTooltip(event, {
                                        villain,
                                        issue: app.issue ? app.issue.label : `#${app.chrono}`,
                                        series: app.issue ? app.issue.series : 'Unknown',
                                        present: true,
                                        chronoPos: app.chrono,
                                        metadata: metadata
                                    });
                                })
                                .on('mouseleave', () => {
                                    this.hideGridTooltip();
                                });
                            
                            // Apply metadata styles
                            this.applyMetadataStyles(pathEl, metadata);
                            
                            // Mentioned/flashback stripes overlay (skip if death)
                            if ((metadata.mentionedOnly || metadata.flashback) && !metadata.death) {
                                cellGroup.append('path')
                                    .attr('d', path)
                                    .attr('fill', 'url(#diagonal-stripes)')
                                    .attr('pointer-events', 'none');
                            }
                            
                            if (metadata.death) {
                                this.drawDeathX(cellGroup, x, y, cellSize, cellColor);
                            }
                        } else {
                            // Middle rectangle
                            const cellGroup = g.append('g');
                            
                            const rect = cellGroup.append('rect')
                                .attr('class', 'grid-cell')
                                .attr('x', x)
                                .attr('y', y + cellSize / 2 - radius)
                                .attr('width', cellSize)
                                .attr('height', radius * 2)
                                .attr('fill', cellColor)
                                .attr('stroke', 'none')
                                .on('mouseenter', (event) => {
                                    this.showGridTooltip(event, {
                                        villain,
                                        issue: app.issue ? app.issue.label : `#${app.chrono}`,
                                        series: app.issue ? app.issue.series : 'Unknown',
                                        present: true,
                                        chronoPos: app.chrono,
                                        metadata: metadata
                                    });
                                })
                                .on('mouseleave', () => {
                                    this.hideGridTooltip();
                                });
                            
                            // Apply metadata styles
                            this.applyMetadataStyles(rect, metadata, cellGroup, x, y, cellSize);
                            
                            // Mentioned/flashback stripes overlay (skip if death)
                            if ((metadata.mentionedOnly || metadata.flashback) && !metadata.death) {
                                this.addStripeOverlay(cellGroup, x, y + cellSize / 2 - radius, cellSize, radius * 2, false);
                            }
                            
                            if (metadata.death) {
                                this.drawDeathX(cellGroup, x, y, cellSize, cellColor);
                            }
                        }
                    });
                }
            });
        });
    }

    /**
     * Show tooltip for grid cell
     */
    showGridTooltip(event, d) {
        let tooltip = document.getElementById('grid-tooltip');
        
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'grid-tooltip';
            tooltip.className = 'tooltip';
            document.body.appendChild(tooltip);
        }

        const statusLine = d.webInfo 
            ? `Web: ${d.webInfo}`
            : `Status: ${d.present ? 'Appears' : 'Absent'}`;
        
        // Build metadata line
        let metadataLine = '';
        if (d.metadata) {
            const tags = [];
            if (d.metadata.firstAppearance) tags.push('First Appearance');
            if (d.metadata.death) tags.push('Death');
            if (d.metadata.mentionedOnly) tags.push('Mentioned Only');
            if (d.metadata.flashback) tags.push('Flashback');
            if (tags.length > 0) {
                metadataLine = `<br>Metadata: ${tags.join(', ')}`;
            }
        }
        
        tooltip.innerHTML = `
            <strong>${d.villain}</strong><br>
            Issue: ${d.issue} (${d.series})<br>
            ${statusLine}${metadataLine}
        `;

        // Position tooltip near mouse cursor
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY - 10) + 'px';
        tooltip.style.display = 'block';
    }

    /**
     * Hide grid tooltip
     */
    hideGridTooltip() {
        const tooltip = document.getElementById('grid-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }


    /**
     * Render D3 timeline visualization
     */
    renderTimeline() {
        const data = this.buildTimelineSeries();
        const baseScales = this.config.scales;

        // Dimensions
        const chartContainer = document.getElementById('timeline-chart');
        const containerRect = chartContainer.parentElement.getBoundingClientRect();
        const width = containerRect.width;
        const height = containerRect.height;

        // Create SVG
        const svg = d3.select('#timeline-chart')
            .attr('width', width)
            .attr('height', height);

        // Clear previous content
        svg.selectAll('*').remove();

        // Create group for margin offset
        const g = svg.append('g')
            .attr('transform', `translate(${VIZ_CONFIG.margin.left},${VIZ_CONFIG.margin.top})`);

        const plotWidth = width - VIZ_CONFIG.margin.left - VIZ_CONFIG.margin.right;
        const plotHeight = height - VIZ_CONFIG.margin.top - VIZ_CONFIG.margin.bottom;

        // Create scales (reuse X domain to keep alignment)
        const xScale = d3.scaleLinear()
            .domain(baseScales.x.domain)
            .range([0, plotWidth]);

        const maxVillains = data.length > 0 ? Math.max(...data.map(d => d.villainCount)) : 0;
        const yMax = Math.max(baseScales.y.domain[1] || 0, maxVillains);
        const yScale = d3.scaleLinear()
            .domain([0, yMax])
            .range([plotHeight, 0]);

        // Add grid
        g.append('g')
            .attr('class', 'grid')
            .attr('stroke', '#e0e0e0')
            .attr('stroke-dasharray', '4,4')
            .call(d3.axisLeft(yScale)
                .tickSize(-plotWidth)
                .tickFormat(''));

        // Add axes
        g.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${plotHeight})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.format('d')))
            .append('text')
            .attr('class', 'axis-label')
            .attr('x', plotWidth / 2)
            .attr('y', 35)
            .attr('fill', '#333')
            .attr('text-anchor', 'middle')
            .text(data.some(d => d.chronologicalPosition !== undefined) ? 'Chronological Position' : 'Issue Number');

        g.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(yScale))
            .append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -plotHeight / 2)
            .attr('y', -50)
            .attr('fill', '#333')
            .attr('text-anchor', 'middle')
            .text('Villain Count');

        // Create line generator - use chronologicalPosition if available
        const line = d3.line()
            .x(d => xScale(d.chronologicalPosition !== undefined ? d.chronologicalPosition : d.issueNumber))
            .y(d => yScale(d.villainCount));

        // Add line path
        g.append('path')
            .datum(data)
            .attr('class', 'line-path')
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', '#e74c3c')
            .attr('stroke-width', 2);

        // Add data points
        g.selectAll('.data-point')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'data-point')
            .attr('cx', d => xScale(d.chronologicalPosition !== undefined ? d.chronologicalPosition : d.issueNumber))
            .attr('cy', d => yScale(d.villainCount))
            .attr('r', 5)
            .attr('fill', '#e74c3c')
            .on('mouseenter', (event, d) => this.showTooltip(event, d))
            .on('mouseleave', () => this.hideTooltip());
    }

    /**
     * Build histogram data showing new villains per year
     */
    buildHistogramData() {
        // Map to track first appearance of each villain (by ID)
        const villainFirstAppearance = new Map();
        
        // Build lookup of villain IDs to their first appearance year
        for (const villain of this.villains) {
            // Find the timeline entry for this villain's first appearance
            // Need to match the issue number AND the series (if specified)
            const firstIssue = this.data.timeline.find(t => {
                // Check if this issue contains the villain
                if (!t.villainIds || !t.villainIds.includes(villain.id)) {
                    return false;
                }
                
                // If villain has a firstAppearanceSeries, match it
                if (villain.firstAppearanceSeries) {
                    return t.issue === villain.firstAppearance && 
                           t.series === villain.firstAppearanceSeries;
                }
                
                // Otherwise just match issue number
                return t.issue === villain.firstAppearance;
            });
            
            if (firstIssue && firstIssue.releaseDate) {
                // Parse year from release date (format: "Month DD, YYYY")
                const yearMatch = firstIssue.releaseDate.match(/\d{4}$/);
                if (yearMatch) {
                    const year = parseInt(yearMatch[0], 10);
                    villainFirstAppearance.set(villain.id, {
                        year,
                        name: villain.name
                    });
                }
            }
        }
        
        // Group by year
        const yearMap = new Map();
        
        for (const [_, info] of villainFirstAppearance) {
            if (!yearMap.has(info.year)) {
                yearMap.set(info.year, []);
            }
            yearMap.get(info.year).push(info.name);
        }
        
        // Convert to array and sort by year
        const histogram = [];
        for (const [year, villains] of yearMap) {
            histogram.push({
                year,
                count: villains.length,
                villains: villains.sort()
            });
        }
        
        return histogram.sort((a, b) => a.year - b.year);
    }

    /**
     * Render histogram of new villains per year
     */
    renderHistogram() {
        const histogramData = this.buildHistogramData();
        
        if (!histogramData || histogramData.length === 0) {
            console.warn('No histogram data available');
            return;
        }

        // Dimensions
        const chartContainer = document.getElementById('histogram-chart');
        const containerRect = chartContainer.parentElement.getBoundingClientRect();
        const width = containerRect.width;
        const height = containerRect.height;

        // Create SVG
        const svg = d3.select('#histogram-chart')
            .attr('width', width)
            .attr('height', height);

        // Clear previous content
        svg.selectAll('*').remove();

        // Create group for margin offset
        const g = svg.append('g')
            .attr('transform', `translate(${VIZ_CONFIG.margin.left},${VIZ_CONFIG.margin.top})`);

        const plotWidth = width - VIZ_CONFIG.margin.left - VIZ_CONFIG.margin.right;
        const plotHeight = height - VIZ_CONFIG.margin.top - VIZ_CONFIG.margin.bottom;

        // Create scales
        const xScale = d3.scaleBand()
            .domain(histogramData.map(d => d.year.toString()))
            .range([0, plotWidth])
            .padding(0.2);

        const maxCount = Math.max(...histogramData.map(d => d.count));
        const yScale = d3.scaleLinear()
            .domain([0, maxCount])
            .range([plotHeight, 0]);

        // Add grid
        g.append('g')
            .attr('class', 'grid')
            .attr('stroke', '#e0e0e0')
            .attr('stroke-dasharray', '4,4')
            .call(d3.axisLeft(yScale)
                .tickSize(-plotWidth)
                .tickFormat(''));

        // Add axes
        g.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${plotHeight})`)
            .call(d3.axisBottom(xScale))
            .append('text')
            .attr('class', 'axis-label')
            .attr('x', plotWidth / 2)
            .attr('y', 35)
            .attr('fill', '#333')
            .attr('text-anchor', 'middle')
            .text('Year');

        g.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(yScale))
            .append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -plotHeight / 2)
            .attr('y', -50)
            .attr('fill', '#333')
            .attr('text-anchor', 'middle')
            .text('New Villains');

        // Add bars with indigo color
        g.selectAll('.bar')
            .data(histogramData)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.year.toString()))
            .attr('y', d => yScale(d.count))
            .attr('width', xScale.bandwidth())
            .attr('height', d => plotHeight - yScale(d.count))
            .attr('fill', '#4A90E2') // Medium blue
            .on('mouseenter', (event, d) => this.showHistogramTooltip(event, d))
            .on('mouseleave', () => this.hideTooltip());
    }

    /**
     * Show tooltip for histogram bar
     */
    showHistogramTooltip(event, d) {
        let tooltip = document.getElementById('tooltip');
        
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'tooltip';
            tooltip.className = 'tooltip';
            document.body.appendChild(tooltip);
        }

        const villainList = d.villains.length > 0
            ? d.villains.join(', ')
            : 'None';

        let content = `<strong>${d.year}</strong><br>`;
        content += `New Villains: ${d.count}<br>`;
        content += `<small>${villainList}</small>`;

        tooltip.innerHTML = content;

        // Position tooltip near mouse cursor
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY - 10) + 'px';
        tooltip.style.display = 'block';
    }

    /**
     * Show tooltip on hover
     */
    showTooltip(event, d) {
        let tooltip = document.getElementById('tooltip');
        
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'tooltip';
            tooltip.className = 'tooltip';
            document.body.appendChild(tooltip);
        }

        const villainList = d.villainsInIssue.length > 0
            ? d.villainsInIssue.join(', ')
            : 'None listed';

        // Build tooltip content with series and issue info
        let content = '';
        if (d.series && d.series !== 'Combined') {
            content += `<strong>${d.series} #${d.issueNumber}</strong><br>`;
        } else {
            content += `<strong>Issue ${d.issueNumber}</strong><br>`;
        }
        if (d.releaseDate) {
            content += `Release: ${d.releaseDate}<br>`;
        }
        if (d.chronologicalPosition !== undefined) {
            content += `Position: ${d.chronologicalPosition}<br>`;
        }
        content += `Villains: ${d.villainCount}<br>`;
        content += `<small>${villainList}</small>`;

        tooltip.innerHTML = content;

        // Position tooltip near mouse cursor
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY - 10) + 'px';
        tooltip.style.display = 'block';
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    /**
     * Render villain list with filtering and lazy loading for performance
     * Uses IntersectionObserver to only render sparklines when visible
     */
    renderVillainList() {
        const villainListDiv = 
            document.getElementById('villainList');
        const filterInput = 
            document.getElementById('villainFilter');

        if (!villainListDiv) {
            return;
        }

        // Sort villains by frequency
        const sortedVillains = 
            [...this.villains].sort((a, b) => 
                b.frequency - a.frequency
            );

        // IntersectionObserver for lazy loading sparklines
        const sparklineObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const container = entry.target;
                    const villainId = container.dataset.villainId;
                    const villain = this.villainById.get(villainId);
                    if (villain && !container.dataset.loaded) {
                        container.dataset.loaded = 'true';
                        // Use cached sparkline data if available
                        let series = this._sparklineCache.get(villainId);
                        if (!series) {
                            series = this.buildYearlyCounts(villain);
                            this._sparklineCache.set(villainId, series);
                        }
                        this.renderSparkline(container, series);
                    }
                    sparklineObserver.unobserve(container);
                }
            });
        }, { rootMargin: '100px' }); // Pre-load 100px before visible

        // Render villains with lazy sparkline loading
        const renderVillains = (villainsToRender) => {
            villainListDiv.innerHTML = '';
            
            if (villainsToRender.length === 0) {
                villainListDiv.innerHTML = 
                    '<p>No villains found</p>';
                return;
            }

            // Use DocumentFragment for batch DOM insertion (performance)
            const fragment = document.createDocumentFragment();
            
            villainsToRender.forEach(villain => {
                const card = this.createVillainCardLazy(villain, sparklineObserver);
                fragment.appendChild(card);
            });
            
            villainListDiv.appendChild(fragment);
        };

        const getFilteredVillains = () => {
            const query = (filterInput?.value || '').toLowerCase();
            return sortedVillains.filter(villain =>
                villain.name.toLowerCase().includes(query)
            );
        };

        const renderCurrentVillains = () => {
            renderVillains(getFilteredVillains());
        };

        // Initial render
        renderCurrentVillains();

        // Add filter functionality with debouncing for performance
        if (filterInput) {
            const debouncedRender = this.debounce(renderCurrentVillains, 200);
            filterInput.addEventListener('input', debouncedRender);
        }

        // Expose re-render for external toggles (e.g., sparkline domain)
        this.refreshVillainList = renderCurrentVillains;
    }

    /**
     * Render groups list with latest roster per group
     */
    renderGroupList() {
        const groupListDiv = document.getElementById('groupList');
        const filterInput = document.getElementById('groupFilter');

        const timeline = this.data.timeline || [];

        // Helper: get latest roster for a group by name
        const getLatestRoster = (groupName) => {
            // Search timeline groups from latest to earliest
            for (let i = timeline.length - 1; i >= 0; i--) {
                const t = timeline[i];
                const groups = t.groups || [];
                const match = groups.find(g => g.name === groupName);
                if (match) {
                    return { issue: t.issue, members: match.members };
                }
            }
            return { issue: null, members: [] };
        };

        // Sort groups by frequency
        const sortedGroups = [...this.groups].sort((a, b) => b.frequency - a.frequency);

        const renderGroups = (groupsToRender) => {
            groupListDiv.innerHTML = '';
            if (groupsToRender.length === 0) {
                groupListDiv.innerHTML = '<p>No groups found</p>';
                return;
            }
            groupsToRender.forEach(group => {
                const latest = getLatestRoster(group.name);
                const card = this.createGroupCard(group, latest.issue, latest.members);
                groupListDiv.appendChild(card);
            });
        };

        renderGroups(sortedGroups);

        if (filterInput) {
            filterInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = sortedGroups.filter(g => g.name.toLowerCase().includes(query));
                renderGroups(filtered);
            });
        }
    }

    /**
     * Render a debugging list of timeline entries with no villains
     */
    renderMissingVillainIssues() {
        const section = document.getElementById('missingVillainsSection');
        const list = document.getElementById('missingVillainsList');
        const countBadge = document.getElementById('missingVillainsCount');

        if (!section || !list) return;

        const timeline = this.data?.timeline || [];
        const missing = timeline.filter(entry => {
            const villains = entry.villains || [];
            const count = entry.villainCount !== undefined ? entry.villainCount : villains.length;
            return villains.length === 0 || count === 0;
        });

        if (countBadge) {
            countBadge.textContent = String(missing.length);
        }

        if (missing.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        list.innerHTML = '';

        missing
            .sort((a, b) => (a.issue || 0) - (b.issue || 0))
            .forEach(entry => {
                const item = document.createElement('li');
                const parts = [];
                if (entry.issue !== undefined) {
                    parts.push(`#${entry.issue}`);
                }
                if (entry.series) {
                    parts.push(entry.series);
                }
                if (entry.releaseDate) {
                    parts.push(entry.releaseDate);
                }
                item.textContent = parts.join(' • ');
                list.appendChild(item);
            });
    }

    /**
     * Create a group card element
     */
    createGroupCard(group, latestIssue, members) {
        const card = document.createElement('div');
        card.className = 'group-card';

        const name = document.createElement('div');
        name.className = 'group-name';
        name.textContent = group.name;

        const statsDiv = document.createElement('div');
        const frequencyStat = this.createGroupStat('Appearances', group.frequency);
        const lastSeenStat = this.createGroupStat('Last Issue', latestIssue || '—');

        statsDiv.appendChild(frequencyStat);
        statsDiv.appendChild(lastSeenStat);

        const membersDiv = document.createElement('div');
        membersDiv.className = 'group-members';

        const membersLabel = document.createElement('div');
        membersLabel.className = 'group-members-label';
        membersLabel.textContent = 'Latest Roster:';

        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'member-tags';
        members.forEach(m => {
            const tag = document.createElement('span');
            tag.className = 'member-tag';
            tag.textContent = m;
            tagsDiv.appendChild(tag);
        });

        membersDiv.appendChild(membersLabel);
        membersDiv.appendChild(tagsDiv);

        card.appendChild(name);
        card.appendChild(statsDiv);
        card.appendChild(membersDiv);

        return card;
    }

    /**
     * Create a group stat element
     */
    createGroupStat(label, value) {
        const stat = document.createElement('div');
        stat.className = 'group-stat';

        const labelEl = document.createElement('span');
        labelEl.className = 'group-stat-label';
        labelEl.textContent = label;

        const valueEl = document.createElement('span');
        valueEl.className = 'group-stat-value';
        valueEl.textContent = value;

        stat.appendChild(labelEl);
        stat.appendChild(valueEl);

        return stat;
    }

    /**
     * Extract year from various date formats
     */
    extractYear(dateStr) {
        if (!dateStr) return null;
        
        // Try ISO format (YYYY-MM-DD)
        const isoMatch = dateStr.match(/^(\d{4})-/);
        if (isoMatch) return Number(isoMatch[1]);
        
        // Try text format (Month Day, Year)
        const textMatch = dateStr.match(/(\d{4})$/);
        if (textMatch) return Number(textMatch[1]);
        
        // Try Year at start
        const startMatch = dateStr.match(/^(\d{4})/);
        if (startMatch) return Number(startMatch[1]);
        
        return null;
    }

    /**
     * Compute earliest and latest release years across the full dataset
     */
    computeTimelineYearRange() {
        const timeline = this.data?.timeline || [];
        let minYear = null;
        let maxYear = null;

        timeline.forEach(entry => {
            const year = this.extractYear(entry.releaseDate);
            if (!year || Number.isNaN(year)) return;
            if (minYear === null || year < minYear) minYear = year;
            if (maxYear === null || year > maxYear) maxYear = year;
        });

        if (minYear === null || maxYear === null) {
            return null;
        }

        return { minYear, maxYear };
    }

    /**
     * Build yearly appearance counts for a villain
     */
    buildYearlyCounts(villain) {
        const counts = new Map();
        const timeline = this.data?.timeline || [];

        timeline.forEach(entry => {
            if (!entry.releaseDate) return;
            const year = this.extractYear(entry.releaseDate);
            if (!year || Number.isNaN(year)) return;

            const villains = entry.villains || [];
            const ids = entry.villainIds || [];
            const urls = entry.villainUrls || [];

            const appears = villains.some((name, idx) => {
                const id = ids[idx];
                const url = urls[idx];
                // Prioritize URL matching for variant-specific accuracy
                if (url && villain.url && url === villain.url) {
                    return true;
                }
                // Fall back to ID matching
                if (id && villain.id && id === villain.id) {
                    return true;
                }
                // Only use name as last resort if no URL/ID available
                return false;
            });

            if (appears) {
                counts.set(year, (counts.get(year) || 0) + 1);
            }
        });

        return Array.from(counts.entries())
            .map(([year, count]) => ({ year, count }))
            .sort((a, b) => a.year - b.year);
    }

    /**
     * Resolve sparkline domain depending on toggle state
     */
    getSparklineDomain(series) {
        const defaultMin = series[0]?.year;
        const defaultMax = series[series.length - 1]?.year;

        if (this.sparklineDomainMode === 'full' && this.timelineYearRange) {
            return {
                minYear: this.timelineYearRange.minYear,
                maxYear: this.timelineYearRange.maxYear
            };
        }

        return {
            minYear: defaultMin,
            maxYear: defaultMax
        };
    }

    /**
     * Read sparkline accent color from CSS variables
     */
    getSparklineColor() {
        const root = document.documentElement;
        const value = getComputedStyle(root).getPropertyValue('--color-sparkline');
        const color = (value || '').trim();
        return color || '#d4af37';
    }

    /**
     * Render compact sparkline for yearly counts
     */
    renderSparkline(container, series) {
        if (!container) return;
        container.innerHTML = '';

        if (!series || series.length === 0) {
            container.textContent = 'No dated appearances';
            return;
        }

        if (series.length < 2) {
            container.textContent = 'Needs appearances across 2+ years to show a trend';
            return;
        }

        const height = 60;
        const margin = { top: 6, right: 6, bottom: 18, left: 6 };
        const domain = this.getSparklineDomain(series);
        const minYear = domain.minYear ?? series[0].year;
        const rawMaxYear = domain.maxYear ?? series[series.length - 1].year;
        const maxYear = rawMaxYear === minYear ? rawMaxYear + 1 : rawMaxYear;
        const labelMaxYear = rawMaxYear;
        const maxCount = Math.max(...series.map(s => s.count));
        const sparkColor = this.getSparklineColor();

        // Use a reasonable default width for layout, will scale via CSS
        // Calculate actual width after SVG is inserted into DOM
        const defaultWidth = 400;
        
        const scaleX = d3.scaleLinear()
            .domain([minYear, maxYear])
            .range([margin.left, defaultWidth - margin.right]);

        const scaleY = d3.scaleLinear()
            .domain([0, maxCount])
            .range([height - margin.bottom, margin.top]);

        const line = d3.line()
            .x(d => scaleX(d.year))
            .y(d => scaleY(d.count));

        const svg = d3.select(container)
            .append('svg')
            .attr('class', 'sparkline')
            .attr('width', '100%')
            .attr('height', height)
            .style('display', 'block')
            .attr('preserveAspectRatio', 'none')
            .attr('viewBox', `0 0 ${defaultWidth} ${height}`);

        // Baseline axis
        svg.append('line')
            .attr('x1', margin.left)
            .attr('x2', defaultWidth - margin.right)
            .attr('y1', height - margin.bottom)
            .attr('y2', height - margin.bottom)
            .attr('stroke', 'var(--color-border)');

        // Path
        svg.append('path')
            .datum(series)
            .attr('class', 'sparkline-path')
            .attr('d', line)
            .attr('stroke', sparkColor);

        // Points
        svg.selectAll('.sparkline-point')
            .data(series)
            .enter()
            .append('circle')
            .attr('class', 'sparkline-point')
            .attr('cx', d => scaleX(d.year))
            .attr('cy', d => scaleY(d.count))
            .attr('r', 3)
            .attr('fill', sparkColor)
            .append('title')
            .text(d => `${d.year}: ${d.count}`);

        // Labels
        svg.append('text')
            .attr('class', 'sparkline-label')
            .attr('x', margin.left)
            .attr('y', height - 2)
            .text(minYear);

        svg.append('text')
            .attr('class', 'sparkline-label')
            .attr('x', defaultWidth - margin.right)
            .attr('y', height - 2)
            .attr('text-anchor', 'end')
            .text(labelMaxYear);
    }

    /**
     * Create a villain card element
     */
    createVillainCard(villain) {
        const card = document.createElement('div');
        card.className = 'villain-card';

        // Create header section with name/stats and image
        const header = document.createElement('div');
        header.className = 'villain-card-header';

        // Name and stats container (left side)
        const infoContainer = document.createElement('div');
        infoContainer.className = 'villain-info-container';

        const name = document.createElement('div');
        name.className = 'villain-name';
        name.textContent = villain.name;
        name.title = `ID: ${villain.id}`;

        const statsDiv = document.createElement('div');
        
        const frequencyStat = this.createStatElement(
            'Appearances',
            villain.frequency
        );
        const firstAppearanceStat = this.createStatElement(
            'First Issue',
            villain.firstAppearance
        );

        statsDiv.appendChild(frequencyStat);
        statsDiv.appendChild(firstAppearanceStat);

        infoContainer.appendChild(name);
        infoContainer.appendChild(statsDiv);
        header.appendChild(infoContainer);

        // Add villain image if available (right side)
        if (villain.imageUrl) {
            const img = document.createElement('img');
            img.className = 'villain-image';
            // Try original URL first; if it 404s, fall back to a de-scaled variant.
            const variants = [this.normalizeImageUrl(villain.imageUrl)];
            if (villain.imageUrl.includes('/scale-to-width-down/')) {
                variants.push(
                    this.normalizeImageUrl(
                        villain.imageUrl.replace(/\/scale-to-width-down\/\d+/i, '')
                    )
                );
            }

            let attempt = 0;
            const tryLoad = () => {
                const url = variants[attempt];
                console.log(`Loading image for ${villain.name}: ${url}`);
                img.src = url;
            };

            tryLoad();
            img.alt = villain.name;
            img.title = villain.name;
            img.loading = 'lazy';
            img.referrerPolicy = 'no-referrer'; // mitigate hotlinking blocks
            img.onerror = () => {
                console.error(`Failed to load image for ${villain.name}:`, img.src);
                attempt += 1;
                if (attempt < variants.length) {
                    console.log(`Retrying ${villain.name} with fallback URL: ${variants[attempt]}`);
                    tryLoad();
                } else {
                    img.style.display = 'none';
                }
            };
            img.onload = () => {
                // Image loaded successfully
            };
            header.appendChild(img);
        }

        card.appendChild(header);

        const appearancesDiv = document.createElement('div');
        appearancesDiv.className = 'villain-appearances';

        const appearancesLabel = 
            document.createElement('div');
        appearancesLabel.className = 
            'villain-appearances-label';
        appearancesLabel.textContent = 'In Issues:';

        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'issue-tags';

        // Build a map of (villainUrl, issue) -> series from timeline
        // This uses URL-based matching to handle villain name variations
        const villainUrlIssueToSeries = {};
        const timeline = this.data.timeline || [];
        for (const entry of timeline) {
            if (!entry.villainUrls) continue;
            entry.villainUrls.forEach((url, idx) => {
                const key = `${url}|${entry.issue}`;
                if (!villainUrlIssueToSeries[key]) {
                    villainUrlIssueToSeries[key] = [];
                }
                villainUrlIssueToSeries[key].push({
                    series: entry.series,
                    chronoPos: entry.chronologicalPosition || Infinity
                });
            });
        }
        
        // Sort each series list by chronological position
        for (const key in villainUrlIssueToSeries) {
            villainUrlIssueToSeries[key].sort((a, b) => a.chronoPos - b.chronoPos);
        }

        // DEBUG: Log this villain's data
        if (villain.name.includes('Alistair')) {
            console.log(`DEBUG ${villain.name}:`, {
                url: villain.url,
                appearances: villain.appearances,
                mapSize: Object.keys(villainUrlIssueToSeries).length,
                sampleKeys: Object.keys(villainUrlIssueToSeries).slice(0, 5)
            });
        }

        villain.appearances.forEach(issue => {
            const key = `${villain.url}|${issue}`;
            const seriesList = villainUrlIssueToSeries[key];
            
            if (villain.name.includes('Alistair')) {
                console.log(`  Issue ${issue}: key="${key}", found=${!!seriesList}`);
            }
            
            if (seriesList && seriesList.length > 0) {
                // Use the earliest chronological appearance for coloring
                const primarySeries = seriesList[0];
                const series = primarySeries.series;
                
                const tag = document.createElement('span');
                tag.className = 'issue-tag';
                tag.textContent = `#${issue}`;
                tag.title = series;
                
                // Apply series-specific color
                // VERIFICATION: Grey (#95a5a6) = BAD! Indicates series name not found in seriesColorMap
                // If you see grey issue tags on villain cards, series name matching failed
                const color = this.seriesColorMap[series] || '#95a5a6';
                if (villain.name === 'Doctor Octopus' && issue === 3) {
                    console.log(`DEBUG: Doctor Octopus #3: series="${series}", color="${color}", seriesColorMap=`, this.seriesColorMap);
                }
                tag.style.backgroundColor = color;
                tag.setAttribute('data-series', series);
                
                tagsDiv.appendChild(tag);
            } else {
                // Fallback: No series found for this appearance - this is a data issue
                // VERIFICATION: Grey (#95a5a6) = BAD! Series lookup failed
                const tag = document.createElement('span');
                tag.className = 'issue-tag';
                tag.textContent = `#${issue}`;
                tag.style.backgroundColor = '#95a5a6';
                console.warn(`⚠️ No series found for ${villain.name} #${issue}`);
                tagsDiv.appendChild(tag);
            }
        });

        appearancesDiv.appendChild(appearancesLabel);
        appearancesDiv.appendChild(tagsDiv);

        card.appendChild(appearancesDiv);

        const trendDiv = document.createElement('div');
        trendDiv.className = 'villain-trend';
        const trendLabel = document.createElement('div');
        trendLabel.className = 'villain-trend-label';
        trendLabel.textContent = 'Appearances per year';
        const sparklineHost = document.createElement('div');
        sparklineHost.className = 'villain-sparkline';
        const yearlySeries = this.buildYearlyCounts(villain);
        this.renderSparkline(sparklineHost, yearlySeries);
        trendDiv.appendChild(trendLabel);
        trendDiv.appendChild(sparklineHost);
        card.appendChild(trendDiv);

        // Add wiki link in bottom-right
        if (villain.url) {
            const wikiLink = document.createElement('a');
            wikiLink.href = villain.url;
            wikiLink.className = 'villain-wiki-link';
            wikiLink.target = '_blank';
            wikiLink.rel = 'noopener noreferrer';
            wikiLink.textContent = 'Wiki →';
            wikiLink.title = `View ${villain.name} on Marvel Wiki`;
            card.appendChild(wikiLink);
        }

        return card;
    }

    /**
     * Create a villain card with lazy-loaded sparkline for performance
     * Sparkline rendering is deferred until the card scrolls into view
     */
    createVillainCardLazy(villain, sparklineObserver) {
        const card = document.createElement('div');
        card.className = 'villain-card';

        // Create header section with name/stats and image
        const header = document.createElement('div');
        header.className = 'villain-card-header';

        // Name and stats container (left side)
        const infoContainer = document.createElement('div');
        infoContainer.className = 'villain-info-container';

        const name = document.createElement('div');
        name.className = 'villain-name';
        name.textContent = villain.name;
        name.title = `ID: ${villain.id}`;

        const statsDiv = document.createElement('div');
        
        const frequencyStat = this.createStatElement(
            'Appearances',
            villain.frequency
        );
        const firstAppearanceStat = this.createStatElement(
            'First Issue',
            villain.firstAppearance
        );

        statsDiv.appendChild(frequencyStat);
        statsDiv.appendChild(firstAppearanceStat);

        infoContainer.appendChild(name);
        infoContainer.appendChild(statsDiv);
        header.appendChild(infoContainer);

        // Add villain image if available (right side)
        if (villain.imageUrl) {
            const img = document.createElement('img');
            img.className = 'villain-image';
            const variants = [this.normalizeImageUrl(villain.imageUrl)];
            if (villain.imageUrl.includes('/scale-to-width-down/')) {
                variants.push(
                    this.normalizeImageUrl(
                        villain.imageUrl.replace(/\/scale-to-width-down\/\d+/i, '')
                    )
                );
            }

            let attempt = 0;
            const tryLoad = () => {
                img.src = variants[attempt];
            };

            tryLoad();
            img.alt = villain.name;
            img.title = villain.name;
            img.loading = 'lazy';
            img.referrerPolicy = 'no-referrer';
            img.onerror = () => {
                attempt += 1;
                if (attempt < variants.length) {
                    tryLoad();
                } else {
                    img.style.display = 'none';
                }
            };
            header.appendChild(img);
        }

        card.appendChild(header);

        const appearancesDiv = document.createElement('div');
        appearancesDiv.className = 'villain-appearances';

        const appearancesLabel = document.createElement('div');
        appearancesLabel.className = 'villain-appearances-label';
        appearancesLabel.textContent = 'In Issues:';

        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'issue-tags';

        // Build URL->series map from timeline
        const villainUrlIssueToSeries = {};
        const timeline = this.data.timeline || [];
        for (const entry of timeline) {
            if (!entry.villainUrls) continue;
            entry.villainUrls.forEach((url) => {
                const key = `${url}|${entry.issue}`;
                if (!villainUrlIssueToSeries[key]) {
                    villainUrlIssueToSeries[key] = [];
                }
                villainUrlIssueToSeries[key].push({
                    series: entry.series,
                    chronoPos: entry.chronologicalPosition || Infinity
                });
            });
        }
        
        for (const key in villainUrlIssueToSeries) {
            villainUrlIssueToSeries[key].sort((a, b) => a.chronoPos - b.chronoPos);
        }

        villain.appearances.forEach(issue => {
            const key = `${villain.url}|${issue}`;
            const seriesList = villainUrlIssueToSeries[key];
            
            const tag = document.createElement('span');
            tag.className = 'issue-tag';
            tag.textContent = `#${issue}`;
            
            if (seriesList && seriesList.length > 0) {
                const series = seriesList[0].series;
                tag.title = series;
                const color = this.seriesColorMap[series] || '#95a5a6';
                tag.style.backgroundColor = color;
                tag.setAttribute('data-series', series);
            } else {
                tag.style.backgroundColor = '#95a5a6';
            }
            tagsDiv.appendChild(tag);
        });

        appearancesDiv.appendChild(appearancesLabel);
        appearancesDiv.appendChild(tagsDiv);
        card.appendChild(appearancesDiv);

        // Sparkline container - will be populated lazily via IntersectionObserver
        const trendDiv = document.createElement('div');
        trendDiv.className = 'villain-trend';
        const trendLabel = document.createElement('div');
        trendLabel.className = 'villain-trend-label';
        trendLabel.textContent = 'Appearances per year';
        
        const sparklineHost = document.createElement('div');
        sparklineHost.className = 'villain-sparkline';
        sparklineHost.dataset.villainId = villain.id;
        sparklineHost.textContent = 'Loading...'; // Placeholder
        
        // Register for lazy loading
        if (sparklineObserver) {
            sparklineObserver.observe(sparklineHost);
        }
        
        trendDiv.appendChild(trendLabel);
        trendDiv.appendChild(sparklineHost);
        card.appendChild(trendDiv);

        // Wiki link
        if (villain.url) {
            const wikiLink = document.createElement('a');
            wikiLink.href = villain.url;
            wikiLink.className = 'villain-wiki-link';
            wikiLink.target = '_blank';
            wikiLink.rel = 'noopener noreferrer';
            wikiLink.textContent = 'Wiki →';
            wikiLink.title = `View ${villain.name} on Marvel Wiki`;
            card.appendChild(wikiLink);
        }

        return card;
    }

    /**
     * Create a stat element
     */
    createStatElement(label, value) {
        const stat = document.createElement('div');
        stat.className = 'villain-stat';

        const labelEl = document.createElement('span');
        labelEl.className = 'villain-stat-label';
        labelEl.textContent = label;

        const valueEl = document.createElement('span');
        valueEl.className = 'villain-stat-value';
        valueEl.textContent = value;

        stat.appendChild(labelEl);
        stat.appendChild(valueEl);

        return stat;
    }
}

// Initialize visualization on page load
document.addEventListener('DOMContentLoaded', () => {
    const viz = new SpiderManVisualization();
    viz.init();
});
