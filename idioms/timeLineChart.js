function createTimeLineChart(characters, edges, containerSelector, colorMap) {
	// Build a lookup: name -> group
	const charGroup = {};
	characters.forEach(c => {
		charGroup[c.name] = c.level1 || c.level2 || c.level3 || c.level4 || 'Unknown';
	});

    const color = (d) => colorMap[d] || '#888';

	// Aggregate counts
	const periods = Array.from(new Set(edges.map(e => e.period))).filter(Boolean);
	const groupsRaw = Array.from(new Set(Object.values(charGroup)));
	const counts = {};
	periods.forEach(p => { counts[p] = {}; groupsRaw.forEach(g => { counts[p][g] = 0; }); counts[p]['Other'] = 0; });

	edges.forEach(e => {
		const period = e.period;
		if (!periods.includes(period)) return;
		[e.source, e.target].forEach(name => {
			const group = charGroup[name];
			if (group && counts[period][group] !== undefined) {
				counts[period][group]++;
			}
		});
	});

	// Find top 5 groups by total mentions
	const groupTotals = groupsRaw.map(g => ({
		name: g,
		total: periods.reduce((sum, p) => sum + counts[p][g], 0)
	}));
	const topGroups = groupTotals.sort((a,b) => b.total - a.total).slice(0, 5).map(g => g.name);

	// Aggregate others into 'Other'
	periods.forEach(period => {
		groupsRaw.forEach(g => {
			if (!topGroups.includes(g)) {
				counts[period]['Other'] += counts[period][g];
			}
		});
	});

	const groups = [...topGroups, 'Other'];

	// Format for D3
	const data = periods.map(period => {
		const row = { period };
		groups.forEach(g => { row[g] = counts[period][g]; });
		return row;
	});

	// D3 multi-line chart
	const margin = { top: 40, right: 120, bottom: 40, left: 60 };
	// Responsive: get container size
	const container = d3.select(containerSelector).node();
	const fullWidth = container.offsetWidth || 700;
	const fullHeight = container.offsetHeight || 400;
	const width = fullWidth - margin.left - margin.right;
	const height = fullHeight - margin.top - margin.bottom;

	const svgRoot = d3.select(containerSelector)
		.append('svg')
		.attr('width', '100%')
		.attr('height', '100%')
		.attr('viewBox', `0 0 ${fullWidth} ${fullHeight}`)
		.attr('preserveAspectRatio', 'xMidYMid meet');

	// Add background rect for click-to-reset
	svgRoot.append('rect')
		.attr('width', fullWidth)
		.attr('height', fullHeight)
		.attr('fill', 'transparent')
		.style('cursor', 'pointer')
		.on('click', function(event) {
			// Only reset if clicking on the background, not a line
			if (window.globalSelection) {
				window.globalSelection.set(null);
			}
		});

	const svg = svgRoot.append('g')
		.attr('transform', `translate(${margin.left},${margin.top})`);

	// X axis
	const x = d3.scalePoint()
		.domain(periods)
		.range([0, width]);
	svg.append('g')
		.attr('transform', `translate(0,${height})`)
		.call(d3.axisBottom(x));

	// Y axis
	const y = d3.scaleLinear()
		.domain([0, d3.max(data, d => d3.max(groups.map(g => d[g])))])
		.range([height, 0]);
	svg.append('g')
		.call(d3.axisLeft(y));

	// Color scale from shared mapping
    //	const color = d3.scaleOrdinal(d3.schemeTableau10).domain(groups);

	// Draw lines with click event for global selection
	const linePaths = [];
	groups.forEach(group => {
		const line = d3.line()
			.x(d => x(d.period))
			.y(d => y(d[group]));
		// Visible line
		const path = svg.append('path')
			.datum(data)
			.attr('fill', 'none')
			.attr('stroke', color(group))
			.attr('stroke-width', 2.5)
			.attr('d', line)
			.attr('class', 'timeline-line');
		// Invisible hit area
		svg.append('path')
			.datum(data)
			.attr('fill', 'none')
			.attr('stroke', 'transparent')
			.attr('stroke-width', 12)
			.attr('d', line)
			.attr('class', 'timeline-hitarea')
			.style('cursor', 'pointer')
			.on('click', function() {
				if (window.globalSelection) {
					window.globalSelection.set(group);
				}
			});
		linePaths.push({ group, path });
	});

	// Listen for global selection changes to highlight lines
	if (window.globalSelection) {
		window.globalSelection.onChange(function(selectedGroup) {
			linePaths.forEach(({ group, path }) => {
				if (selectedGroup === group) {
					path.attr('stroke-width', 5)
						.attr('opacity', 1)
						.attr('stroke', color(group));
				} else if (selectedGroup) {
					path.attr('stroke-width', 2.5)
						.attr('opacity', 0.2)
						.attr('stroke', color(group));
				} else {
					path.attr('stroke-width', 2.5)
						.attr('opacity', 1)
						.attr('stroke', color(group));
				}
			});
		});
	}

	// Draw legend
	svg.selectAll('.legend')
		.data(groups)
		.enter()
		.append('g')
		.attr('class', 'legend')
		.attr('transform', (d, i) => `translate(${width + 20},${i * 24})`)
		.call(g => {
			g.append('rect')
				.attr('width', 18)
				.attr('height', 18)
				.attr('fill', d => color(d));
			g.append('text')
				.attr('x', 24)
				.attr('y', 13)
				.text(d => d)
				.style('font-size', '14px');
		});

	// Add axis labels
	svg.append('text')
		.attr('x', width / 2)
		.attr('y', height + margin.bottom - 2)
		.attr('text-anchor', 'middle')
		.text('Literary Period');
	svg.append('text')
		.attr('transform', 'rotate(-90)')
		.attr('x', -height / 2)
		.attr('y', -margin.left + 16)
		.attr('text-anchor', 'middle')
		.text('Mentions');
}