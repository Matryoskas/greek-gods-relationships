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

    // Add invisible hit areas for easier edge hovering
    const linkHitArea = g
        .append('g')
        .selectAll('line')
        .data(edges)
        .join('line')
        .attr('stroke', 'transparent')
        .attr('stroke-width', 10) // Much thicker for easier hovering
        .attr('cursor', 'pointer')
        .on('mouseover', (event, d) => {
            // Only show edge tooltip if no node is currently fixed/selected
            if (!fixedNode && !fixedEdge) {
                tooltip.style('opacity', 1).style('pointer-events', 'auto')
                    .html(`
                    <h3>Relationship Details</h3>
                    <p><strong>Between:</strong> ${
                        d.source.name || d.source
                    } ↔ ${d.target.name || d.target}</p>
                    <p><strong>Connection Strength:</strong> ${
                        d.normalized_weight
                    }</p>
                    <p><strong>Source Work:</strong> ${d.title || 'Other'}</p>
                    <p><strong>Author:</strong> ${d.author || 'Other'}</p>
                    <p><strong>Literary Period:</strong> ${
                        d.period || 'Other'
                    }</p>
                    <div style="margin-top: 10px; font-size: 0.85em; color: #666;">
                        <em>Click to pin this information</em>
                    </div>
                `)
            }
        })
        .on('mouseout', () => {
            // Only hide tooltip if no node or edge is currently fixed/selected
            if (!fixedNode && !fixedEdge) {
                tooltip.style('opacity', 0).style('pointer-events', 'none')
            }
        })
        .on('click', (event, d) => {
            // Clear any node selection first
            fixedNode = null

            // Set edge as fixed
            fixedEdge = d

            // Show detailed edge tooltip
            tooltip.style('opacity', 1).style('pointer-events', 'auto').html(`
                <h3>Relationship Details</h3>
                <p><strong>Between:</strong> ${d.source.name || d.source} ↔ ${
                d.target.name || d.target
            }</p>
                <p><strong>Connection Strength:</strong> ${
                    d.normalized_weight
                }</p>
                <p><strong>Source Work:</strong> ${d.title || 'Other'}</p>
                <p><strong>Author:</strong> ${d.author || 'Other'}</p>
                <p><strong>Literary Period:</strong> ${
                    d.period || 'Other'
                }</p>
                <div style="margin-top: 10px; font-size: 0.85em; color: #666;">
                    <em>Click background to deselect</em>
                </div>
            `)

            // Highlight the connected nodes
            const sourceName = d.source.name || d.source
            const targetName = d.target.name || d.target

            node.attr('stroke', (n) =>
                n.name === sourceName || n.name === targetName ? '# ' : '#000'
            )
                .attr('stroke-width', (n) =>
                    n.name === sourceName || n.name === targetName ? 4 : 1.5
                )
                .attr('opacity', (n) =>
                    n.name === sourceName || n.name === targetName ? 1 : 0.3
                )

            // Highlight labels for connected nodes
            label
                .attr('font-weight', (n) =>
                    n.name === sourceName || n.name === targetName
                        ? 'bold'
                        : 'normal'
                )
                .attr('opacity', (n) =>
                    n.name === sourceName || n.name === targetName ? 1 : 0.3
                )

            // Highlight the selected edge and dim others
            link.attr('stroke', (l) => {
                const lSrc = l.source.name || l.source
                const lTgt = l.target.name || l.target
                return (lSrc === sourceName && lTgt === targetName) ||
                    (lSrc === targetName && lTgt === sourceName)
                    ? '#ff0'
                    : '#999'
            })
                .attr('stroke-width', (l) => {
                    const lSrc = l.source.name || l.source
                    const lTgt = l.target.name || l.target
                    return (lSrc === sourceName && lTgt === targetName) ||
                        (lSrc === targetName && lTgt === sourceName)
                        ? 6
                        : linkWidth(l.normalized_weight)
                })
                .attr('opacity', (l) => {
                    const lSrc = l.source.name || l.source
                    const lTgt = l.target.name || l.target
                    return (lSrc === sourceName && lTgt === targetName) ||
                        (lSrc === targetName && lTgt === sourceName)
                        ? 1
                        : 0.2
                })

            // Reset global selection when clicking on an edge
            if (window.globalSelection) {
                window.globalSelection.set(null)
            }
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

        linkHitArea
            .attr('x1', (d) => d.source.x)
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
        .style('pointer-events', 'none')
        .style('opacity', 0)

    // Prevent scroll events from bubbling to the graph when tooltip is visible
    tooltip.node().addEventListener(
        'wheel',
        function (event) {
            event.stopPropagation()
        },
        { passive: false }
    )

    tooltip.node().addEventListener('scroll', function (event) {
        event.stopPropagation()
    })

    // Variables to track fixed nodes and edges
    let fixedNode = null
    let fixedEdge = null
    function showTooltip(d) {
        tooltip.style('opacity', 1).style('pointer-events', 'auto') // Enable interactions when visible
            .html(`
            <h3>${d.name}</h3>
            <p>${d.description || 'No description available.'}</p>
            <p><strong>Gender:</strong> ${d.gender || 'Other'}</p>
            <p><strong>Father:</strong> ${d.father || 'Other'}</p>
            <p><strong>Mother:</strong> ${d.mother || 'Other'}</p>
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
    const parentKey = (n) => n.level2 || n.level1 || 'Other'
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
function buildLegendHTML() {
    let html = `<h3>Mythological Categories</h3>`

    // Render each parent; use <details> only if it actually has children, otherwise a simple row
    parents.forEach((p) => {
        const pColor = parentColor.get(p)
        const children = Array.from(groupMap.get(p)).sort()
        if (children.length === 0) {
            // Flat parent (no subgroups) - now clickable
            html += `
          <div class="legend-item" data-category="${p}" data-type="parent" style="cursor: pointer;">
            <span class="legend-dot" style="background:${pColor};"></span>
            ${p}
          </div>`
        } else {
            // Parent with children (collapsible)
            html += `
          <details class="legend-group">
            <summary data-category="${p}" data-type="parent">
              <span class="legend-dot" style="background:${pColor};"></span>
              <span class="legend-label" style="cursor: pointer;">${p}</span>
            </summary>
            <ul class="legend-list">
              ${children
                  .map(
                      (c) => `
                <li class="legend-item" data-category="${c}" data-parent="${p}" data-type="child" style="cursor: pointer;">
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

    // Add a placeholder div for selection info below the legend
    html += `<div id="legend-selection-info" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd;"></div>`

    return html
}

function attachLegendHandlers() {
    // Add click handlers to legend items (children and flat parents)
    permanentTooltip.selectAll('.legend-item').on('click', function(event) {
        event.stopPropagation()

        const clickedCategory = this.getAttribute('data-category')
        const categoryType = this.getAttribute('data-type')
        const parentCategory = this.getAttribute('data-parent')

        if (window.globalSelection) {
            if (categoryType === 'child') {
                // For child categories, highlight the entire parent family
                window.globalSelection.set(parentCategory)
            } else {
                // For parent categories, highlight the entire family
                window.globalSelection.set(clickedCategory)
            }
        }
    })

    // Add click handlers to legend labels inside summary (only to the text, not the arrow)
    permanentTooltip.selectAll('.legend-label').on('click', function(event) {
        event.stopPropagation()

        // Find the parent summary element to get the category
        const summaryElement = this.closest('summary')
        const clickedCategory = summaryElement.getAttribute('data-category')

        if (window.globalSelection) {
            window.globalSelection.set(clickedCategory)
        }
    })
}

const legendHtml = buildLegendHTML()
permanentTooltip.html(legendHtml)
attachLegendHandlers()

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
            // Only clear bold labels if no global category is selected
            if (
                !window.globalSelection ||
                !window.globalSelection.selectedGroup
            ) {
                updateLabelBold(null)
            }
        }
    })
        .on('mouseout', () => {
            if (!fixedNode) {
                tooltip.style('opacity', 0).style('pointer-events', 'none')
                // Only clear bold labels if no global category is selected
                if (
                    !window.globalSelection ||
                    !window.globalSelection.selectedGroup
                ) {
                    updateLabelBold(null)
                }
            }
        })
        .on('click', (event, d) => {
            fixedNode = d
            fixedEdge = null // Clear any edge selection
            showTooltip(d)
            // Highlight selected node and direct connections
            const neighbors = getDirectConnections(d)
            node.attr('stroke', (n) =>
                n === d ? '#000' : neighbors.has(n.name) ? '#ffa500' : '#fff'
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
                return src === d.name || tgt === d.name ? '#000' : '#999'
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

            // Reset timeline/category selection when clicking on a specific node
            if (window.globalSelection) {
                window.globalSelection.set(null)
            }
        })

    // Unfix tooltip and node highlight on background click
    svg.on('click', function (event) {
        if (event.target.tagName === 'svg') {
            fixedNode = null
            fixedEdge = null
            tooltip.style('opacity', 0).style('pointer-events', 'none')
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

            // Reset global selection (this will propagate to timeline chart)
            if (window.globalSelection) {
                window.globalSelection.set(null)
            }
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

    // Listen for global selection changes from timeline chart
    if (window.globalSelection) {
        window.globalSelection.onChange(function (selectedGroup) {
            console.log(
                'Force-directed graph received selection:',
                selectedGroup
            )

            if (selectedGroup) {
                // Filter nodes to show only characters from selected category
                const relevantNodes = nodes.filter((n) => {
                    const parentGroup = parentKey(n)
                    return parentGroup === selectedGroup
                })

                const relevantNodeNames = new Set(
                    relevantNodes.map((n) => n.name)
                )

                // Update node visibility and styling
                node.attr('opacity', (n) =>
                    relevantNodeNames.has(n.name) ? 1 : 0.1
                )
                    .attr('stroke-width', (n) =>
                        relevantNodeNames.has(n.name) ? 3 : 1.5
                    )
                    .attr('stroke', (n) =>
                        relevantNodeNames.has(n.name) ? '#ff0' : '#fff'
                    )

                // Update label visibility
                label
                    .attr('opacity', (n) =>
                        relevantNodeNames.has(n.name) ? 1 : 0.1
                    )
                    .attr('font-weight', (n) =>
                        relevantNodeNames.has(n.name) ? 'bold' : 'normal'
                    )

                // Update edge visibility (show only edges between relevant nodes)
                link.attr('opacity', (l) => {
                    const srcName = l.source.name || l.source
                    const tgtName = l.target.name || l.target
                    return relevantNodeNames.has(srcName) &&
                        relevantNodeNames.has(tgtName)
                        ? 0.8
                        : 0.05
                }).attr('stroke', (l) => {
                    const srcName = l.source.name || l.source
                    const tgtName = l.target.name || l.target
                    return relevantNodeNames.has(srcName) &&
                        relevantNodeNames.has(tgtName)
                        ? '#ff0'
                        : '#999'
                })

// Update the selection info div instead of replacing the entire tooltip
const selectionInfo = permanentTooltip.select('#legend-selection-info')
if (!selectionInfo.empty()) {
    selectionInfo.html(`
        <h4 style="margin: 0 0 8px 0; color: #333;">Selected: ${selectedGroup}</h4>
        <p style="margin: 0 0 4px 0;"><strong>Characters shown:</strong> ${relevantNodes.length}</p>
        <div style="margin-top: 8px; font-size: 0.85em; color: #666;">
            <small>Click background to reset</small>
        </div>
    `)
}
} else {
    // Reset to normal view only if no individual node is selected
    if (!fixedNode) {
        node.attr('opacity', 1)
            .attr('stroke-width', 1.5)
            .attr('stroke', '#fff')

        label.attr('opacity', 1).attr('font-weight', 'normal')

        link.attr('opacity', 0.6).attr('stroke', '#999')
    }

    // Always restore original legend regardless of node selection
    permanentTooltip.html(legendHtml)
}
        })
    }
}
