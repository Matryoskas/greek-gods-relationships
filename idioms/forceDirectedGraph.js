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

async function createForceDirectedGraph(nodes, edges, containerId, colorMap) {
    const div = document.querySelector(containerId)

    // Use pre-filtered data from script.js (no need to filter again)
    // Data is already filtered by weight, top-N edges, and connected nodes
    // Levels are already normalized in script.js

    // Accept shared color mapping as parameter
    const color = (d) => colorMap[d] || '#888'

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

    // Use the div variable already declared above
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
        .force('x', d3.forceX(width / 2).strength(0.1))
        .force('y', d3.forceY(height / 2).strength(0.1))
        .force(
            'collide',
            d3.forceCollide((d) => sizeScale(d.weight) + 3)
        )

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
        .on('mouseover', (event, d) => {
            // Show tooltip with edge info
            tooltip.style('opacity', 1).html(`
                <h3>Edge Info</h3>
                <p><strong>Source:</strong> ${d.source.name || d.source}</p>
                <p><strong>Target:</strong> ${d.target.name || d.target}</p>
                <p><strong>Weight:</strong> ${d.normalized_weight}</p>
                <p><strong>Author:</strong> ${d.author || 'Unknown'}</p>
                <p><strong>Title:</strong> ${d.title || 'Unknown'}</p>
                <p><strong>Period:</strong> ${d.period || 'Unknown'}</p>
            `)
        })
        .on('mouseout', () => {
            tooltip.style('opacity', 0)
        })

    // Draw nodes
    // Draw nodes
    const node = g
        .append('g')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', (d) => sizeScale(d.weight))
        // OLD:
        // .attr('fill', (d) => {
        //   const level = d.level4 || d.level3 || d.level2 || d.level1 || 'Unknown'
        //   return color(level)
        // })
        // NEW:
        .attr('fill', '#ccc')
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

    let fixedNode = null
    function showTooltip(d) {
        tooltip.style('opacity', 1).html(`
            <h3>${d.name}</h3>
            <p>${d.description || 'No description available.'}</p>
            <p><strong>Gender:</strong> ${d.gender || 'Unknown'}</p>
            <p><strong>Father:</strong> ${d.father || 'Unknown'}</p>
            <p><strong>Mother:</strong> ${d.mother || 'Unknown'}</p>
            <p><strong>Aliases:</strong> ${
                Array.isArray(d.aliases)
                    ? d.aliases.map((a) => a.trim()).join(', ')
                    : typeof d.aliases === 'string'
                    ? (() => {
                          let str = d.aliases.trim()
                          if (str.startsWith('[') && str.endsWith(']')) {
                              str = str.slice(1, -1)
                          }
                          str = str
                              .replace(/['"]/g, '')
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean)
                              .join(', ')
                          return str || 'None'
                      })()
                    : 'None'
            }
            </p>
            <p><strong>Domains:</strong> ${
                Array.isArray(d.domain)
                    ? d.domain.map((a) => a.trim()).join(', ')
                    : typeof d.domain === 'string'
                    ? (() => {
                          let str = d.domain.trim()
                          if (str.startsWith('[') && str.endsWith(']')) {
                              str = str.slice(1, -1)
                          }
                          str = str
                              .replace(/['"]/g, '')
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean)
                              .join(', ')
                          return str || 'None'
                      })()
                    : 'None'
            }
            </p>
            <p><strong>Level 1:</strong> ${d.level1 || '-'}</p>
            <p><strong>Level 2:</strong> ${d.level2 || '-'}</p>
            <p><strong>Level 3:</strong> ${d.level3 || '-'}</p>
            <p><strong>Level 4:</strong> ${d.level4 || '-'}</p>
        `)
    }
    // Create a permanent tooltip inside the ForceDirectedGraph container
    const permanentTooltip = d3
        .select(containerId)
        .append('div')
        .attr('class', 'node-tooltip permanent-tooltip')
        .style('opacity', 1)

    // ---------- GROUPED COLORS + COLLAPSIBLE LEGEND ----------

    // Decide parent/subgroup keys from your hierarchy columns
    const parentKey = (n) => n.level2 || n.level1 || 'Unknown'
    const childKey = (n) => n.level3 || n.level4 || null
    const compositeKey = (p, c) => `${p}::${c}` // avoid child-name clashes across parents

    // Build parent → children map from the nodes currently in view
    const groupMap = new Map()
    nodes.forEach((n) => {
        const p = parentKey(n)
        const c = childKey(n)
        if (!groupMap.has(p)) groupMap.set(p, new Set())
        if (c) groupMap.get(p).add(c)
    })

    // Stable parent list
    const parents = Array.from(groupMap.keys()).sort()

    // Base palette for parents (distinct hues)
    const basePalette = (d3.schemeTableau10 || []).concat(d3.schemeSet3 || [])
    const parentColor = new Map()
    parents.forEach((p, i) => {
        parentColor.set(p, basePalette[i % basePalette.length] || '#888')
    })

    // Derive child tints from the parent hue
    function tintFromParent(parentHex, i, n) {
        // interpolate parent → white for distinct lightness steps
        const t = n === 1 ? 0.35 : 0.2 + (i / Math.max(1, n - 1)) * 0.6 // 0.2..0.8
        return d3.interpolateRgb(parentHex, '#ffffff')(t)
    }

    const childColor = new Map()
    groupMap.forEach((childSet, p) => {
        const children = Array.from(childSet).sort()
        children.forEach((c, i) => {
            childColor.set(
                compositeKey(p, c),
                tintFromParent(parentColor.get(p), i, children.length)
            )
        })
    })

    // Color accessor for nodes
    function nodeColor(d) {
        const p = parentKey(d)
        const c = childKey(d)
        if (c) {
            const ck = compositeKey(p, c)
            if (childColor.has(ck)) return childColor.get(ck)
        }
        if (parentColor.has(p)) return parentColor.get(p)
        return '#888'
    }

    // If circles already exist, recolor them now
    if (typeof node !== 'undefined') {
        node.attr('fill', (d) => nodeColor(d))
    }

    // --- Build a collapsible legend using <details>/<summary> ---
    let legendHtml = `<h3>Mythological Categories</h3>`

    // Render each parent; use <details> only if it actually has children, otherwise a simple row
    parents.forEach((p) => {
        const pColor = parentColor.get(p)
        const children = Array.from(groupMap.get(p)).sort()
        if (children.length === 0) {
            // Flat parent (no subgroups)
            legendHtml += `
      <div class="legend-item">
        <span class="legend-dot" style="background:${pColor};"></span>
        ${p}
      </div>`
        } else {
            // Parent with children (collapsible)
            legendHtml += `
      <details class="legend-group">
        <summary>
          <span class="legend-dot" style="background:${pColor};"></span>
          ${p}
        </summary>
        <ul class="legend-list">
          ${children
              .map(
                  (c) => `
            <li>
              <span class="legend-dot" style="background:${childColor.get(
                  compositeKey(p, c)
              )};"></span>
              ${c}
            </li>`
              )
              .join('')}
        </ul>
      </details>`
        }
    })

    permanentTooltip.html(legendHtml)
    // ---------- /GROUPED COLORS + COLLAPSIBLE LEGEND ----------

    // Helper to update label font weight
    function updateLabelBold(selected) {
        label.attr('font-weight', (n) => (n === selected ? 'bold' : 'normal'))
    }
    // (Removed duplicate/broken code after showTooltip)

    // Helper: get direct neighbors of a node
    function getDirectConnections(node) {
        const neighbors = new Set()
        edges.forEach((e) => {
            if ((e.source.name || e.source) === node.name) {
                neighbors.add(e.target.name || e.target)
            }
            if ((e.target.name || e.target) === node.name) {
                neighbors.add(e.source.name || e.source)
            }
        })
        return neighbors
    }

    node.on('mouseover', (event, d) => {
        if (!fixedNode) {
            showTooltip(d)
            updateLabelBold(null)
        }
    })
        .on('mouseout', () => {
            if (!fixedNode) {
                tooltip.style('opacity', 0)
                updateLabelBold(null)
            }
        })
        .on('click', (event, d) => {
            fixedNode = d
            showTooltip(d)
            // Highlight selected node and direct connections
            const neighbors = getDirectConnections(d)
            node.attr('stroke', (n) =>
                n === d ? '#ff0' : neighbors.has(n.name) ? '#ffa500' : '#fff'
            )
                .attr('stroke-width', (n) =>
                    n === d || neighbors.has(n.name) ? 4 : 1.5
                )
                .attr('opacity', (n) =>
                    n === d || neighbors.has(n.name) ? 1 : 0.2
                )
            label
                .attr('font-weight', (n) =>
                    n === d ? 'bold' : neighbors.has(n.name) ? 'bold' : 'normal'
                )
                .attr('opacity', (n) =>
                    n === d || neighbors.has(n.name) ? 1 : 0.2
                )
            link.attr('stroke', (l) => {
                const src = l.source.name || l.source
                const tgt = l.target.name || l.target
                return src === d.name || tgt === d.name ? '#ff0' : '#999'
            })
                .attr('stroke-width', (l) => {
                    const src = l.source.name || l.source
                    const tgt = l.target.name || l.target
                    return src === d.name || tgt === d.name ? 5 : 1.5
                })
                .attr('opacity', (l) => {
                    const src = l.source.name || l.source
                    const tgt = l.target.name || l.target
                    return src === d.name || tgt === d.name ? 1 : 0.15
                })
        })

    // Unfix tooltip and node highlight on background click
    svg.on('click', function (event) {
        if (event.target.tagName === 'svg') {
            fixedNode = null
            tooltip.style('opacity', 0)
            node.attr('stroke', '#fff')
                .attr('stroke-width', 1.5)
                .attr('opacity', 1)
            label.attr('font-weight', 'normal').attr('opacity', 1)
            link.attr('stroke', '#999')
                .attr('stroke-width', (l) => linkWidth(l.normalized_weight))
                .attr('opacity', 0.6)
            nodes.forEach((n) => {
                n.fx = null
                n.fy = null
            })
            simulation.alphaTarget(0)
        }
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
