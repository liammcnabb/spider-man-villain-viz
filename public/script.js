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
        this.minAppearancesFilter = 3; // Minimum number of appearances to display
        this.yAxisSort = 'default'; // Sorting method: 'default' or 'span'
        this.gridSvg = null; // Reference to current grid SVG
        this.gridZoom = null; // Reference to current zoom behavior
        this.gridGroup = null; // Reference to zoomed group
        this.activeVillainIds = new Set(); // Filter: selected villains
        this.activeVillainNames = new Set(); // Lowercased names for fallback matching
        this.activeGroupNames = new Set(); // Filter: selected groups
        this.villainById = new Map();
        this.villainByName = new Map();
        this.groupMembers = new Map();
        this.seriesColorMap = {
            'Amazing Spider-Man Vol 1': '#e74c3c',
            'Amazing Spider-Man Annual Vol 1': '#9b59b6',
            'Untold Tales of Spider-Man Vol 1': '#3498db'
        };
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
            // Load data from JSON files
            const [villainData, d3Config] = await Promise.all([
                this.loadJSON('data/villains.json'),
                this.loadJSON('data/d3-config.json')
            ]);

            this.data = villainData;
            this.config = d3Config;
            this.villains = villainData.villains || [];
            this.groups = this.resolveGroups(villainData);
            this.villains.forEach(v => {
                this.villainById.set(v.id, v);
                this.villainByName.set((v.name || '').toLowerCase(), v);
            });
            this.buildGroupMembersLookup();

            // Load series-specific data for grid visualization
            this.seriesData = await this.loadSeriesData();

            // Initialize theme
            this.initializeTheme();

            // Setup filters
            this.setupFilterControls();

            // Render all components
            this.renderStats();
            this.renderGridTimeline();
            this.renderTimeline();
            this.renderVillainList();
            this.renderGroupList();

            // Setup toggle listeners
            this.setupGridToggle();

            console.log('✅ Visualization loaded successfully');
        } catch (error) {
            console.error('Error loading visualization:', error);
            this.showError(
                'Failed to load data. ' +
                'Please run "npm run scrape" first.'
            );
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
     * Setup villain/group filter controls
     */
    setupFilterControls() {
        const villainInput = document.getElementById('villainFilterInput');
        const villainOptions = document.getElementById('villainOptions');
        const addVillainBtn = document.getElementById('addVillainFilter');
        const groupInput = document.getElementById('groupFilterInput');
        const groupOptions = document.getElementById('groupOptions');
        const addGroupBtn = document.getElementById('addGroupFilter');
        const clearBtn = document.getElementById('clearFiltersBtn');

        // Populate datalists
        if (villainOptions) {
            villainOptions.innerHTML = '';
            this.villains.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.name;
                opt.label = v.name;
                villainOptions.appendChild(opt);
            });
        }
        if (groupOptions) {
            groupOptions.innerHTML = '';
            this.groups.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g.name;
                opt.label = g.name;
                groupOptions.appendChild(opt);
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
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.activeVillainIds.clear();
                this.activeVillainNames.clear();
                this.activeGroupNames.clear();
                this.renderActiveFilters();
                this.rerenderCharts();
            });
        }

        this.renderActiveFilters();
    }

    /**
     * Render active filter chips
     */
    renderActiveFilters() {
        const villainChipRow = document.getElementById('activeVillainFilters');
        const groupChipRow = document.getElementById('activeGroupFilters');

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
     * Load JSON file
     */
    async loadJSON(url) {
        // Prevent stale caches from hiding updated groups data
        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(
                `Failed to load ${url}: ${response.statusText}`
            );
        }
        return response.json();
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
        // Track all unique issues and villains
        const issueMap = new Map(); // Map chronoPos to issue entry
        const villainFirstChrono = {};
        const villainLastChrono = {};
        const villainAppearanceCount = {};
        const appearances = {};

        allIssues.forEach(entry => {
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
                seriesColor: this.seriesColorMap[entry.series] || '#999'
            }));

        // Use filtered villains list
        const villains = filteredVillains;

        if (villains.length === 0) {
            containerDiv.innerHTML = '<p class="chart-description">No villains match the current filters.</p>';
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

        // Draw grid cells
        const cellData = [];
        issues.forEach((issue, xIdx) => {
            villains.forEach((villain, yIdx) => {
                const chronoPos = issue.chronologicalPosition;
                let shouldShowCell = chronoPos >= villainFirstChrono[villain];
                
                // Only filter trailing cells if toggle is OFF
                if (!this.showTrailingGrids) {
                    shouldShowCell = shouldShowCell && chronoPos <= villainLastChrono[villain];
                }
                
                if (shouldShowCell) {
                    const isPresent = appearances[chronoPos]?.has(villain) ?? false;
                    cellData.push({
                        issue: issue.label,
                        issueNum: issue.number,
                        chronoPos: chronoPos,
                        series: issue.series,
                        seriesColor: issue.seriesColor,
                        villain,
                        x: xIdx,
                        y: yIdx,
                        present: isPresent
                    });
                }
            });
        });

        g.selectAll('rect.grid-cell')
            .data(cellData)
            .enter()
            .append('rect')
            .attr('class', 'grid-cell')
            .attr('x', (d) => d.x * cellSize)
            .attr('y', (d) => d.y * cellSize)
            .attr('width', cellSize)
            .attr('height', cellSize)
            .attr('fill', (d) => d.present ? d.seriesColor : '#ecf0f1')
            .attr('stroke', '#bdc3c7')
            .attr('stroke-width', 0.5)
            .on('mouseenter', (event, d) => {
                if (d.present) {
                    this.showGridTooltip(event, d);
                }
            })
            .on('mouseleave', () => {
                this.hideGridTooltip();
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

        tooltip.innerHTML = `
            <strong>${d.villain}</strong><br>
            Issue: ${d.issue} (${d.series})<br>
            Status: ${d.present ? 'Appears' : 'Absent'}
        `;

        const rect = event.target.getBoundingClientRect();
        tooltip.style.left = (rect.left + 10) + 'px';
        tooltip.style.top = (rect.top - 40) + 'px';
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

        const rect = event.target.getBoundingClientRect();
        tooltip.style.left = (rect.left + 10) + 'px';
        tooltip.style.top = (rect.top - 40) + 'px';
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
     * Render villain list with filtering
     */
    renderVillainList() {
        const villainListDiv = 
            document.getElementById('villainList');
        const filterInput = 
            document.getElementById('villainFilter');

        // Sort villains by frequency
        const sortedVillains = 
            [...this.villains].sort((a, b) => 
                b.frequency - a.frequency
            );

        // Render all villains initially
        const renderVillains = (villainsToRender) => {
            villainListDiv.innerHTML = '';
            
            if (villainsToRender.length === 0) {
                villainListDiv.innerHTML = 
                    '<p>No villains found</p>';
                return;
            }

            villainsToRender.forEach(villain => {
                const card = this.createVillainCard(villain);
                villainListDiv.appendChild(card);
            });
        };

        // Initial render
        renderVillains(sortedVillains);

        // Add filter functionality
        filterInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = sortedVillains.filter(villain =>
                villain.name.toLowerCase().includes(query)
            );
            renderVillains(filtered);
        });
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
            container.textContent = 'Not enough data points';
            return;
        }

        const height = 60;
        const margin = { top: 6, right: 6, bottom: 18, left: 6 };

        const minYear = series[0].year;
        const maxYear = series[series.length - 1].year;
        const maxCount = Math.max(...series.map(s => s.count));

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
            .attr('stroke', '#9b59b6');

        // Points
        svg.selectAll('.sparkline-point')
            .data(series)
            .enter()
            .append('circle')
            .attr('class', 'sparkline-point')
            .attr('cx', d => scaleX(d.year))
            .attr('cy', d => scaleY(d.count))
            .attr('r', 3)
            .attr('fill', '#9b59b6')
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
            .text(maxYear);
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
            const variants = [villain.imageUrl];
            if (villain.imageUrl.includes('/scale-to-width-down/')) {
                variants.push(
                    villain.imageUrl.replace(/\/scale-to-width-down\/\d+/i, '')
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
                console.log(`✓ Image loaded successfully for ${villain.name}`);
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
                const color = this.seriesColorMap[series] || '#95a5a6';
                tag.style.backgroundColor = color;
                tag.setAttribute('data-series', series);
                
                tagsDiv.appendChild(tag);
            } else {
                const tag = document.createElement('span');
                tag.className = 'issue-tag';
                tag.textContent = `#${issue}`;
                tag.style.backgroundColor = '#95a5a6';
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
