function createTimeLineChart(
    characters,
    edges,
    containerSelector,
    colorMap,
    parentGroups
) {
    // Use same hierarchical grouping logic as global preprocessing
    const parentKey = (c) => c.level2 || c.level1 || 'Other'

    // Build a lookup: name -> parent group (data is already filtered and normalized)
    const charGroup = {}
    characters.forEach((c) => {
        charGroup[c.name] = parentKey(c)
    })

    const color = (d) => colorMap[d] || '#888'

    // Aggregate counts by parent groups (using the global parent groups list)
    const periodsUnordered = Array.from(
        new Set(edges.map((e) => e.period))
    ).filter(Boolean)

    // Function to determine chronological order of periods
    function getChronologicalOrder(periods) {
        // Define period metadata with approximate start dates
        const periodInfo = {
            Archaic: { start: -800, priority: 1 },
            Classical: { start: -480, priority: 2 },
            Hellenistic: { start: -323, priority: 3 },
            'Imperial Roman': { start: -27, priority: 4 },
            'Late Roman': { start: 284, priority: 5 },
            // Add more periods here as needed
        }

        return periods.sort((a, b) => {
            // If both periods are in our metadata, sort by priority
            if (periodInfo[a] && periodInfo[b]) {
                return periodInfo[a].priority - periodInfo[b].priority
            }
            // If only one is known, put known ones first
            if (periodInfo[a] && !periodInfo[b]) return -1
            if (!periodInfo[a] && periodInfo[b]) return 1
            // If neither is known, sort alphabetically as fallback
            return a.localeCompare(b)
        })
    }

    // Sort periods chronologically
    const periods = getChronologicalOrder([...periodsUnordered])

    const counts = {}
    periods.forEach((p) => {
        counts[p] = {}
        parentGroups.forEach((g) => {
            counts[p][g] = 0
        })
    })

    edges.forEach((e) => {
        const period = e.period
        if (!periods.includes(period)) return
        ;[e.source, e.target].forEach((name) => {
            const parentGroup = charGroup[name]
            if (parentGroup && counts[period][parentGroup] !== undefined) {
                counts[period][parentGroup]++
            }
        })
    })

    // Debug: Check if data actually varies by period
    console.log('Periods found:', periods)
    periods.forEach((period) => {
        console.log(`Period ${period} counts:`, counts[period])
    })

    // Use ALL the global parent groups exactly (same as force-directed graph)
    const groups = parentGroups

    // Debug: Log the groups being used
    console.log('Timeline chart groups:', groups)
    console.log('Number of groups:', groups.length)

    // Format for D3 and convert to rank-based data
    const data = periods.map((period) => {
        const row = { period }

        // First, get raw counts for this period
        const periodCounts = groups.map((g) => ({
            group: g,
            count: counts[period][g] || 0,
        }))

        // Debug: Log counts for first period
        if (period === periods[0]) {
            console.log(`Period ${period} raw counts:`, periodCounts)
        }

        // Sort by count (descending) to determine ranks
        periodCounts.sort((a, b) => b.count - a.count)

        // Debug: Log sorted counts for first period
        if (period === periods[0]) {
            console.log(`Period ${period} sorted counts:`, periodCounts)
        }

        // Assign ranks (1 = highest mentions, etc.)
        periodCounts.forEach((item, index) => {
            row[item.group] = index + 1 // rank = position + 1
        })

        // Debug: Log final ranks for first period
        if (period === periods[0]) {
            console.log(
                `Period ${period} final ranks:`,
                groups.map(
                    (g) =>
                        `${g}: rank ${row[g]} (${counts[period][g]} mentions)`
                )
            )
        }

        return row
    })

    // D3 multi-line chart
    const margin = { top: 40, right: 40, bottom: 40, left: 60 }
    // Responsive: get container size
    const container = d3.select(containerSelector).node()
    const fullWidth = container.offsetWidth || 700
    const fullHeight = container.offsetHeight || 400
    const width = fullWidth - margin.left - margin.right
    const height = fullHeight - margin.top - margin.bottom

    const svgRoot = d3
        .select(containerSelector)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${fullWidth} ${fullHeight}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')

    // Add background rect for click-to-reset
    svgRoot
        .append('rect')
        .attr('width', fullWidth)
        .attr('height', fullHeight)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('click', function (event) {
            // Only reset if clicking on the background, not a line
            if (window.globalSelection) {
                window.globalSelection.set(null)
            }
        })

    const svg = svgRoot
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)

    // X axis
    const x = d3.scalePoint().domain(periods).range([0, width])
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))

    // Y axis - rank scale (1 = best rank at top, higher numbers at bottom)
    const maxRank = groups.length // Maximum possible rank
    const y = d3
        .scaleLinear()
        .domain([1, maxRank]) // Rank 1 to max rank
        .range([0, height]) // Inverted: rank 1 at top, highest rank at bottom

    svg.append('g').call(
        d3
            .axisLeft(y)
            .tickValues(d3.range(1, maxRank + 1)) // Show all ranks
            .tickFormat((d) => {
                if (d === 1) return '1st'
                else if (d === 2) return '2nd'
                else if (d === 3) return '3rd'
                else return d + 'th'
            })
    )

    // Color scale from shared mapping
    //	const color = d3.scaleOrdinal(d3.schemeTableau10).domain(groups);

    // Draw lines with click event for global selection
    const linePaths = []

    // Calculate smart offsets for lines that are too close
    function calculateOffsets(data, groups, yScale, chartHeight) {
        const offsets = {}
        const minSeparation = 8 // reduced minimum pixels between lines
        const maxOffset = 6 // maximum offset in pixels

        groups.forEach((group) => (offsets[group] = 0))

        // For each period, check if lines are too close and need separation
        data.forEach((d) => {
            const positions = groups
                .map((group) => ({
                    group,
                    y: yScale(d[group]),
                    value: d[group],
                }))
                .sort((a, b) => a.y - b.y)

            // Only adjust if lines are very close and values are low enough to safely offset
            for (let i = 1; i < positions.length; i++) {
                const current = positions[i]
                const previous = positions[i - 1]

                if (current.y - previous.y < minSeparation && current.y > 20) {
                    // only if not too close to top
                    const adjustment = Math.min(
                        maxOffset,
                        (minSeparation - (current.y - previous.y)) / 2
                    )

                    // Only apply offset if it won't push lines below chart or above reasonable bounds
                    const prevNewY = previous.y - adjustment
                    const currNewY = current.y + adjustment

                    if (prevNewY >= 0 && currNewY <= chartHeight - 10) {
                        offsets[previous.group] = Math.min(
                            offsets[previous.group] || 0,
                            -adjustment
                        )
                        offsets[current.group] = Math.max(
                            offsets[current.group] || 0,
                            adjustment
                        )
                    }
                }
            }
        })

        return offsets
    }

    const offsets = calculateOffsets(data, groups, y, height)

    // Create tooltip
    const tooltip = d3
        .select('body')
        .append('div')
        .attr('class', 'timeline-tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '0.4vw')
        .style('border-radius', '0.3vw')
        .style('font-size', '0.75vw')
        .style('pointer-events', 'none')
        .style('z-index', '1000')

    groups.forEach((group, index) => {
        const line = d3
            .line()
            .x((d) => x(d.period))
            .y((d) => {
                const baseY = y(d[group])
                const offsetY = baseY + (offsets[group] || 0)
                // Ensure the line stays within chart bounds (not below zero line or above chart)
                return Math.max(0, Math.min(height, offsetY))
            })

        // Visible line with enhanced styling
        const path = svg
            .append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', color(group))
            .attr('stroke-width', 2.5)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('d', line)
            .attr('class', 'timeline-line')

        // Add dots at data points for better visibility and tooltips
        svg.selectAll(`.dot-${group}`)
            .data(data)
            .enter()
            .append('circle')
            .attr('class', `dot-${group}`)
            .attr('cx', (d) => x(d.period))
            .attr('cy', (d) => {
                const baseY = y(d[group])
                const offsetY = baseY + (offsets[group] || 0)
                // Ensure dots stay within chart bounds
                return Math.max(0, Math.min(height, offsetY))
            })
            .attr('r', '0.4vw')
            .attr('fill', color(group))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                const rank = d[group]
                const mentions = counts[d.period][group]

                tooltip.style('visibility', 'visible').html(`
                        <strong>${group}</strong><br/>
                        Period: ${d.period}<br/>
                        Rank: ${
                            rank === 1
                                ? '1st'
                                : rank === 2
                                ? '2nd'
                                : rank === 3
                                ? '3rd'
                                : rank + 'th'
                        }<br/>
                        Mentions: ${mentions}
                    `)

                // Highlight the dot
                d3.select(this).attr('r', '0.4vw').attr('stroke-width', 1)
            })
            .on('mousemove', function (event) {
                tooltip
                    .style('top', event.pageY - 10 + 'px')
                    .style('left', event.pageX + 10 + 'px')
            })
            .on('mouseout', function () {
                tooltip.style('visibility', 'hidden')

                // Reset dot appearance
                d3.select(this).attr('r', '0.4vw').attr('stroke-width', 1)
            })
            .on('click', function () {
                if (window.globalSelection) {
                    window.globalSelection.set(group)
                }
            })

        // Invisible hit area (wider for easier clicking and hovering)
        svg.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', 'transparent')
            .attr('stroke-width', 15)
            .attr('d', line)
            .attr('class', 'timeline-hitarea')
            .style('cursor', 'pointer')
            .on('mouseover', function (event) {
                // Find closest data point to mouse position
                const [mouseX] = d3.pointer(event)
                const closestPeriod = x
                    .domain()
                    .reduce((prev, curr) =>
                        Math.abs(x(curr) - mouseX) < Math.abs(x(prev) - mouseX)
                            ? curr
                            : prev
                    )
                const periodData = data.find((d) => d.period === closestPeriod)

                if (periodData) {
                    const rank = periodData[group]
                    const mentions = counts[periodData.period][group]

                    tooltip.style('visibility', 'visible').html(`
                            <strong>${group}</strong><br/>
                            Period: ${periodData.period}<br/>
                            Rank: ${
                                rank === 1
                                    ? '1st'
                                    : rank === 2
                                    ? '2nd'
                                    : rank === 3
                                    ? '3rd'
                                    : rank + 'th'
                            }<br/>
                            Mentions: ${mentions}
                        `)
                }

                // Highlight the line
                path.attr('stroke-width', 4)
            })
            .on('mousemove', function (event) {
                tooltip
                    .style('top', event.pageY - 10 + 'px')
                    .style('left', event.pageX + 10 + 'px')
            })
            .on('mouseout', function () {
                tooltip.style('visibility', 'hidden')

                // Reset line appearance (unless it's selected)
                if (
                    !window.globalSelection?.selectedGroup ||
                    window.globalSelection.selectedGroup !== group
                ) {
                    path.attr('stroke-width', 2.5)
                }
            })
            .on('click', function () {
                if (window.globalSelection) {
                    window.globalSelection.set(group)
                }
            })

        linePaths.push({ group, path })
    })

    // Listen for global selection changes to highlight lines
    if (window.globalSelection) {
        window.globalSelection.onChange(function (selectedGroup) {
            linePaths.forEach(({ group, path }) => {
                if (selectedGroup === group) {
                    path.attr('stroke-width', 5)
                        .attr('opacity', 1)
                        .attr('stroke', color(group))
                } else if (selectedGroup) {
                    path.attr('stroke-width', 2.5)
                        .attr('opacity', 0.2)
                        .attr('stroke', color(group))
                } else {
                    path.attr('stroke-width', 2.5)
                        .attr('opacity', 1)
                        .attr('stroke', color(group))
                }
            })
        })
    }

    // Add axis labels
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 6)
        .attr('text-anchor', 'middle')
        .text('Literary Period')
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 16)
        .attr('text-anchor', 'middle')
        .text('Rank by Mentions')
        .style('font-size', '0.75vw')

    // Title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -margin.top / 2) // above the plot area
        .attr('text-anchor', 'middle')
        .style('font-size', '1vw')
        .style('font-weight', 'bold')
        .text('Timeline of Mythological Group Mentions by Period')
}
