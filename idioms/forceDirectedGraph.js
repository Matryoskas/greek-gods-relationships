function filterTopNEdges(edges, n = 5) {
    // Group edges by source node
    const grouped = d3.group(edges, (d) => d.source.name || d.source)

    const topEdges = []

    grouped.forEach((edgeList, source) => {
        // Sort descending by weight
        edgeList.sort((a, b) =>
            d3.descending(a.normalized_weight, b.normalized_weight)
        )

        // Take top-N
        topEdges.push(...edgeList.slice(0, n))
    })

    return topEdges
}

async function createForceDirectedGraph(nodes, edges, containerId) {
    const color = d3.scaleOrdinal(d3.schemeCategory10)

    edges = edges.filter((d) => d.normalized_weight > 0.2)
    edges = filterTopNEdges(edges, 5)

    const connected = new Set()
    edges.forEach((e) => {
        connected.add(e.source.name || e.source)
        connected.add(e.target.name || e.target)
    })

    nodes = nodes.filter((n) => connected.has(n.name))

    // First, initialize all nodes with weight 0
    nodes.forEach((n) => (n.weight = 0))

    // Then accumulate edge weights
    edges.forEach((e) => {
        const w = e.normalized_weight || 0
        if (e.source.name) {
            // after simulation starts, source/target are objects
            e.source.weight = (e.source.weight || 0) + w
            e.target.weight = (e.target.weight || 0) + w
        } else {
            // before simulation starts (still strings)
            console.log('source/targets are strings')
            const src = nodes.find((n) => n.name === e.source)
            const tgt = nodes.find((n) => n.name === e.target)
            if (src) src.weight += w
            if (tgt) tgt.weight += w
        }
    })

    console.log(nodes)

    const sizeScale = d3
        .scaleSqrt()
        .domain([0, d3.max(nodes, (d) => d.weight)]) // input: min→max degree
        .range([4, 40]) // output: radius in pixels

    const div = document.querySelector(containerId)
    const width = div.clientWidth
    const height = div.clientHeight
    const svg = d3
        .select(containerId)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .attr('preserveAspectRatio', 'xMidYMid meet')

    // a single group that we will zoom/pan
    const g = svg.append('g')

    // Initialize simulation
    const simulation = d3
        .forceSimulation(nodes)
        .force(
            'link',
            d3
                .forceLink(edges)
                .id((d) => d.name)
                .distance(100)
                .strength(1)
        )
        .force('charge', d3.forceManyBody().strength(-500))
        .force('center', d3.forceCenter(width / 2, height / 2))

    const linkWidth = d3
        .scaleLinear()
        .domain([0, 1]) // input: normalized_weight
        .range([1, 5]) // output: stroke-width in pixels

    // Draw edges (links)
    const link = g
        .append('g')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .selectAll('line')
        .data(edges)
        .join('line')
        .attr('stroke-width', (d) => linkWidth(d.normalized_weight))

    // Draw nodes
    const node = g
        .append('g')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', (d) => sizeScale(d.weight))
        .attr('fill', (d) => color(d.name))
        .call(drag(simulation))

    // Add labels
    const label = g
        .append('g')
        .selectAll('text')
        .data(nodes)
        .join('text')
        .text((d) => d.name)
        .attr('font-size', 12)
        .attr('dy', -12)
        .attr('text-anchor', 'middle')

    // Zoom behavior
    svg.call(
        d3
            .zoom()
            .scaleExtent([0.2, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform)
            })
    )

    // Simulation tick update
    simulation.on('tick', () => {
        link.attr('x1', (d) => d.source.x)
            .attr('y1', (d) => d.source.y)
            .attr('x2', (d) => d.target.x)
            .attr('y2', (d) => d.target.y)

        node.attr('cx', (d) => d.x).attr('cy', (d) => d.y)

        label.attr('x', (d) => d.x).attr('y', (d) => d.y)
    })

    // Create tooltip inside the ForceDirectedGraph container
    const tooltip = d3
        .select(containerId)
        .append('div')
        .attr('class', 'node-tooltip')

    // Show tooltip on hover
    node.on('mouseover', (event, d) => {
        tooltip.style('opacity', 1).html(`
        <h3>${d.name}</h3>
        <p>${d.description || 'No description available.'}</p>
        <p><strong>Gender:</strong> ${d.gender || 'Unknown'}</p>
        <p><strong>Father:</strong> ${d.father || 'Unknown'}</p>
        <p><strong>Mother:</strong> ${d.mother || 'Unknown'}</p>
        <p><strong>Aliases:</strong> ${(() => {
            if (Array.isArray(d.aliases)) {
                return d.aliases.map(a => a.trim()).join(', ')
            }
            if (typeof d.aliases === 'string') {
                // Remove brackets and quotes if present, so we dont show as an actual list
                let str = d.aliases.trim();
                if (str.startsWith('[') && str.endsWith(']')) {
                    str = str.slice(1, -1);
                }
                // Remove quotes and extra spaces
                str = str.replace(/['"]/g, '').split(',').map(s => s.trim()).filter(Boolean).join(', ');
                return str || 'None';
            }
            return 'None';
        })()}</p>
        <p><strong>Domains:</strong> ${(() => {
            if (Array.isArray(d.domain)) {
                return d.domain.map(a => a.trim()).join(', ')
            }
            if (typeof d.domain === 'string') {
                let str = d.domain.trim();
                if (str.startsWith('[') && str.endsWith(']')) {
                    str = str.slice(1, -1);
                }
                str = str.replace(/['"]/g, '').split(',').map(s => s.trim()).filter(Boolean).join(', ');
                return str || 'None';
            }
            return 'None';
        })()}</p>
        <p><strong>Level 1:</strong> ${d.level1 || '-'}</p>
        <p><strong>Level 2:</strong> ${d.level2 || '-'}</p>
        <p><strong>Level 3:</strong> ${d.level3 || '-'}</p>
        <p><strong>Level 4:</strong> ${d.level4 || '-'}</p>
      `)
    }).on('mouseout', () => {
        tooltip.style('opacity', 0)
    })

    // Drag behavior
    function drag(simulation) {
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
        }

        function dragged(event, d) {
            d.fx = event.x
            d.fy = event.y
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
        }

        return d3
            .drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended)
    }
}
