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

            // Load series-specific data for grid visualization
            this.seriesData = await this.loadSeriesData();

            // Render all components
            this.renderStats();
            this.renderGridTimeline();
            this.renderTimeline();
            this.renderVillainList();
            this.renderGroupList();

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

    /**
     * Render grid timeline visualization with separate grids per series
     */
    renderGridTimeline() {
        const gridContainer = document.getElementById('grid-timeline');
        if (!gridContainer) return;

        // Clear previous content
        gridContainer.innerHTML = '';

        // Create a grid for each series
        for (const series of this.seriesData) {
            // Create section header
            const header = document.createElement('div');
            header.style.marginTop = '30px';
            header.style.marginBottom = '15px';
            
            const { title: seriesTitle, volume } = this.getSeriesDisplay(series.name);

            const title = document.createElement('h3');
            title.textContent = seriesTitle;
            if (volume) {
                const badge = this.createVolumeBadge(volume);
                if (badge) {
                    title.appendChild(badge);
                }
            }
            title.style.marginBottom = '10px';
            title.style.color = series.color;
            title.style.fontWeight = 'bold';
            
            header.appendChild(title);
            gridContainer.appendChild(header);

            // Create SVG container for this series' grid
            const svgContainer = document.createElement('div');
            svgContainer.style.marginBottom = '20px';
            svgContainer.style.overflowX = 'auto';
            svgContainer.style.border = `2px solid ${series.color}`;
            svgContainer.style.borderRadius = '4px';
            svgContainer.style.padding = '10px';
            
            gridContainer.appendChild(svgContainer);

            // Render grid for this series
            this.renderSeriesGrid(series, svgContainer);
        }
    }

    /**
     * Render a single series grid with color coding
     */
    renderSeriesGrid(series, containerDiv) {
        const timeline = series.data.timeline || [];
        
        // Extract unique issues and villains in order, including chronological data
        const issueMap = new Map(); // Map issue number to full timeline entry
        const villainFirstAppearance = {};
        const appearances = {};

        timeline.forEach(entry => {
            issueMap.set(entry.issue, entry);
            if (!appearances[entry.issue]) {
                appearances[entry.issue] = new Set();
            }
            if (entry.villains) {
                entry.villains.forEach(villain => {
                    // Track first appearance for each villain
                    if (!villainFirstAppearance[villain]) {
                        villainFirstAppearance[villain] = entry.issue;
                    }
                    appearances[entry.issue].add(villain);
                });
            }
        });

        // Sort by chronologicalPosition instead of issue number
        const issues = Array.from(issueMap.entries())
            .sort((a, b) => (a[1].chronologicalPosition || 0) - (b[1].chronologicalPosition || 0))
            .map(([issueNum, entry]) => ({
                number: issueNum,
                label: `#${issueNum}`,
                series: entry.series,
                chronologicalPosition: entry.chronologicalPosition
            }));
        const villains = Object.keys(villainFirstAppearance).sort((a, b) => villainFirstAppearance[a] - villainFirstAppearance[b]);

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
            .style('background', '#fff');

        // Pan and zoom group
        const g = svg.append('g')
            .attr('transform', `translate(${marginLeft},${marginTop})`);

        // Pan and zoom behavior
        svg.call(
            d3.zoom()
                .scaleExtent([0.5, 16])
                .on('zoom', (event) => {
                    g.attr('transform', event.transform.translate(marginLeft, marginTop));
                })
        );

        // Draw grid cells
        const cellData = [];
        issues.forEach((issue, xIdx) => {
            villains.forEach((villain, yIdx) => {
                const issueNum = issue.number;
                if (issueNum >= villainFirstAppearance[villain]) {
                    const isPresent = appearances[issueNum]?.has(villain) ?? false;
                    cellData.push({
                        issue: issue.label,
                        issueNum,
                        series: issue.series,
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
            .attr('fill', (d) => d.present ? series.color : '#ecf0f1')
            .attr('stroke', '#bdc3c7')
            .attr('stroke-width', 0.5)
            .on('mouseenter', (event, d) => {
                this.showGridTooltip(event, d);
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
            .text((d) => d.series);

        // Villain labels (Y-axis)
        g.selectAll('text.villain-label')
            .data(villains)
            .enter()
            .append('text')
            .attr('class', 'villain-label')
            .attr('x', (d) => {
                const firstAppearanceIssue = villainFirstAppearance[d];
                const issueIndex = issues.findIndex(issue => issue.number === firstAppearanceIssue);
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
        const data = this.config.data;
        const scales = this.config.scales;
        const colors = this.config.colors;

        // Dimensions
        const chartContainer = 
            document.getElementById('timeline-chart');
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
            .attr('transform', 
                  `translate(${VIZ_CONFIG.margin.left},` +
                  `${VIZ_CONFIG.margin.top})`);

        const plotWidth = 
            width - VIZ_CONFIG.margin.left - VIZ_CONFIG.margin.right;
        const plotHeight = 
            height - VIZ_CONFIG.margin.top - VIZ_CONFIG.margin.bottom;

        // Create scales
        const xScale = d3.scaleLinear()
            .domain(scales.x.domain)
            .range([0, plotWidth]);

        const yScale = d3.scaleLinear()
            .domain(scales.y.domain)
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
            .text(data.some(d => d.chronologicalPosition !== undefined) 
                ? 'Chronological Position' 
                : 'Issue Number');

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
            .on('mouseenter', (event, d) => 
                this.showTooltip(event, d))
            .on('mouseleave', () => 
                this.hideTooltip());
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
     * Create a villain card element
     */
    createVillainCard(villain) {
        const card = document.createElement('div');
        card.className = 'villain-card';

        const name = document.createElement('div');
        name.className = 'villain-name';
        name.textContent = villain.name;

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

        const appearancesDiv = document.createElement('div');
        appearancesDiv.className = 'villain-appearances';

        const appearancesLabel = 
            document.createElement('div');
        appearancesLabel.className = 
            'villain-appearances-label';
        appearancesLabel.textContent = 'In Issues:';

        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'issue-tags';

        // Build a map of (issue, villainName) -> series from timeline
        const villainIssueToSeries = {};
        const timeline = this.data.timeline || [];
        for (const entry of timeline) {
            for (const villainInEntry of entry.villains) {
                const key = `${entry.issue}|${villainInEntry}`;
                villainIssueToSeries[key] = entry.series;
            }
        }

        villain.appearances.forEach(issue => {
            const tag = document.createElement('span');
            tag.className = 'issue-tag';
            
            // Get the specific series where THIS villain appears in THIS issue
            const key = `${issue}|${villain.name}`;
            const series = villainIssueToSeries[key];
            
            if (series) {
                // Show with series info
                tag.textContent = `#${issue}`;
                tag.title = series;
                // Apply series-specific color
                const color = this.seriesColorMap[series] || '#95a5a6';
                tag.style.backgroundColor = color;
                tag.setAttribute('data-series', series);
            } else {
                tag.textContent = `#${issue}`;
                tag.style.backgroundColor = '#95a5a6';
            }
            
            tagsDiv.appendChild(tag);
        });

        appearancesDiv.appendChild(appearancesLabel);
        appearancesDiv.appendChild(tagsDiv);

        card.appendChild(name);
        card.appendChild(statsDiv);
        card.appendChild(appearancesDiv);

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
