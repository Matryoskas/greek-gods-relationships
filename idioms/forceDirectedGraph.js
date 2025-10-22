async function createForceDirectedGraph(nodes, edges, containerId, colorMap) {
    const div = document.querySelector(containerId)

    // Use pre-filtered data from script.js (no need to filter again)
    // Data is already filtered by weight, top-N edges, and connected nodes
    // Levels are already normalized in script.js

    // Accept shared color mapping as parameter
    const color = (d) => colorMap[d] || '#888'

    // Unified highlight color used for all selection modes (legend, timeline, butterfly, and node/edge clicks)
    const HIGHLIGHT_COLOR = '#ff0'

    // First, initialize all nodes with weight 0
    nodes.forEach((n) => (n.weight = 0))

    // Then accumulate edge weights
    edges.forEach((e) => {
        const w = e.normalized_weight || 0
        if (e.source.name) {
            // after simulation starts, source/target are o                        // Konsistenter Tooltip (kein „Category:" Quatsch mehr)
            permanentTooltip.html(`
                            <p><strong>Edges shown:</strong> 0</p>
                            <p><strong>Characters shown:</strong> 0</p>
                            <div style="margin-top: 10px;">
                                <small>Click background to reset view</small>
                            </div>
                            <hr style="margin: 10px 0;">
                            ${buildLegendHTML(selectedGroup)}
                        `)
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
                <p><strong>Literary Period:</strong> ${d.period || 'Other'}</p>
                <div style="margin-top: 10px; font-size: 0.85em; color: #666;">
                    <em>Click background to deselect</em>
                </div>
            `)

            // Highlight the connected nodes
            const sourceName = d.source.name || d.source
            const targetName = d.target.name || d.target

            node.attr('stroke', (n) =>
                n.name === sourceName || n.name === targetName
                    ? HIGHLIGHT_COLOR
                    : '#000'
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
                    ? HIGHLIGHT_COLOR
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
                window.globalSelection.setGroup(null)
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
    // Ensure the "Other" category is always grey for clarity (case-insensitive)
    if (parents.includes('Other')) {
        parentColor.set('Other', '#888')
    }
    // Ensure the "Titan(s)" category is always brown (Tableau10 brown), case-insensitive and singular/plural
    if (parents.includes('Titan')) {
        if (parents.includes('Titan')) parentColor.set('Titan', '#8c564b')
    }

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
    function buildLegendHTML(selectedGroup = null) {
        let html = `<h3>Mythological Categories</h3>`

        // Render each parent; use <details> only if it actually has children, otherwise a simple row
        parents.forEach((p) => {
            const pColor = parentColor.get(p)
            const children = Array.from(groupMap.get(p)).sort()
            const isSelected = selectedGroup === p

            if (children.length === 0) {
                // Flat parent (no subgroups) - now clickable
                html += `
          <div class="legend-item" data-category="${p}" data-type="parent" style="cursor: pointer; ${
                    isSelected
                        ? 'background-color: #e3f2fd; font-weight: bold; border: 2px solid #1976d2; border-radius: 4px; padding: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);'
                        : ''
                }">
            <span class="legend-dot" style="background:${pColor};"></span>
            ${p}
          </div>`
            } else {
                // Parent with children (collapsible)
                html += `
          <details class="legend-group" ${
              isSelected
                  ? 'style="background-color: #e3f2fd; border: 2px solid #1976d2; border-radius: 4px; padding: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"'
                  : ''
          }>
            <summary data-category="${p}" data-type="parent" ${
                    isSelected ? 'style="font-weight: bold;"' : ''
                }>
              <span class="legend-dot" style="background:${pColor};"></span>
              <span class="legend-label" style="cursor: pointer;">${p}</span>
            </summary>
            <ul class="legend-list">
              ${children
                  .map((c) => {
                      const isChildSelected = selectedGroup === c
                      return `
                <li class="legend-item" data-category="${c}" data-parent="${p}" data-type="child" style="cursor: pointer; ${
                          isChildSelected
                              ? 'background-color: #e3f2fd; font-weight: bold; border: 2px solid #1976d2; border-radius: 4px; padding: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);'
                              : ''
                      }">
                  <span class="legend-dot" style="background:${childColor.get(
                      compositeKey(p, c)
                  )};"></span>
                  ${c}
                </li>`
                  })
                  .join('')}
            </ul>
          </details>`
            }
        })

        // Add a placeholder div for selection info below the legend
        // html += `<div id="legend-selection-info" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd;"></div>`

        return html
    }

    function attachLegendHandlers() {
        // Use event delegation on the permanentTooltip container so handlers persist after HTML updates
        permanentTooltip.on('click', function (event) {
            const labelEl = event.target.closest('.legend-label')
            const itemEl = event.target.closest('.legend-item')

            // If click happened outside any legend control, ignore
            if (!labelEl && !itemEl) return

            event.stopPropagation()

            // Handle clicks on child or flat parent items
            if (itemEl) {
                const clickedCategory = itemEl.getAttribute('data-category')
                const categoryType = itemEl.getAttribute('data-type')
                const parentCategory = itemEl.getAttribute('data-parent')

                if (window.globalSelection) {
                    if (categoryType === 'child') {
                        // For child categories, highlight the entire parent family
                        window.globalSelection.setGroup(parentCategory)
                    } else {
                        // For parent categories, highlight the entire family
                        window.globalSelection.setGroup(clickedCategory)
                    }
                }
                return
            }

            // Handle clicks on parent labels inside <summary>
            if (labelEl) {
                const summaryElement = labelEl.closest('summary')
                if (!summaryElement) return
                const clickedCategory =
                    summaryElement.getAttribute('data-category')
                if (window.globalSelection) {
                    window.globalSelection.setGroup(clickedCategory)
                }
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
                n === d
                    ? HIGHLIGHT_COLOR
                    : neighbors.has(n.name)
                    ? '#ffa500'
                    : '#fff'
            )
                .attr('stroke-width', (n) =>
                    n === d || neighbors.has(n.name) ? 4 : 1.5
                )
                .attr('opacity', (n) =>
                    n === d || neighbors.has(n.name) ? 1 : 0.2
                )
            label
                .attr('font-weight', (n) =>
                    n === d || neighbors.has(n.name) ? 'bold' : 'normal'
                )
                .attr('opacity', (n) =>
                    n === d || neighbors.has(n.name) ? 1 : 0.2
                )
            link.attr('stroke', (l) => {
                const src = l.source.name || l.source
                const tgt = l.target.name || l.target
                return src === d.name || tgt === d.name
                    ? HIGHLIGHT_COLOR
                    : '#999'
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
                window.globalSelection.setGroup(null)
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

            // Reset global selection (this will propagate to all charts)
            if (window.globalSelection) {
                window.globalSelection.setGroup(null) // Clear all selections (groups, types, domains, authors)
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
        window.globalSelection.onGroupChange(function (selectedGroup) {
            console.log(
                'Force-directed graph received selection:',
                selectedGroup
            )
            if (selectedGroup) {
                // Check if this is an author selection by looking at butterfly data
                const isAuthorSelection =
                    window.butterflyData &&
                    window.butterflyData.gender_by_author &&
                    window.butterflyData.gender_by_author[selectedGroup]

                if (isAuthorSelection) {
                    // Handle author selection - filter by edges written by this author
                    const relevantLinks = edges.filter(
                        (l) => l.author === selectedGroup
                    )

                    // Get all node names connected by those links
                    const relevantNodeNames = new Set()
                    relevantLinks.forEach((l) => {
                        relevantNodeNames.add(l.source.name || l.source)
                        relevantNodeNames.add(l.target.name || l.target)
                    })

                    // Check if author has no connections in the filtered graph
                    if (relevantLinks.length === 0) {
                        // Show message when no edges are found
                        let noConnectionsMessage = g.select(
                            '.no-connections-message'
                        )
                        if (noConnectionsMessage.empty()) {
                            noConnectionsMessage = g
                                .append('text')
                                .attr('class', 'no-connections-message')
                                .attr('x', width / 2)
                                .attr('y', height / 2)
                                .attr('text-anchor', 'middle')
                                .attr('dominant-baseline', 'middle')
                                .attr('font-size', '18px')
                                .attr('font-weight', 'bold')
                                .attr('fill', '#666')
                                .attr('opacity', 0)
                        }

                        noConnectionsMessage
                            .text(
                                `No connections found for ${selectedGroup} in the filtered graph`
                            )
                            .transition()
                            .duration(300)
                            .attr('opacity', 1)

                        // Add subtitle explaining the filtering
                        let subtitleMessage = g.select(
                            '.no-connections-subtitle'
                        )
                        if (subtitleMessage.empty()) {
                            subtitleMessage = g
                                .append('text')
                                .attr('class', 'no-connections-subtitle')
                                .attr('x', width / 2)
                                .attr('y', height / 2 + 25)
                                .attr('text-anchor', 'middle')
                                .attr('dominant-baseline', 'middle')
                                .attr('font-size', '14px')
                                .attr('fill', '#999')
                                .attr('opacity', 0)
                        }

                        subtitleMessage
                            .text(
                                '(Graph shows only the strongest character relationships)'
                            )
                            .transition()
                            .duration(300)
                            .attr('opacity', 1)

                        // Dim all nodes and edges
                        node.attr('opacity', 0.1)
                            .attr('stroke-width', 1.5)
                            .attr('stroke', '#fff')
                        label.attr('opacity', 0.1).attr('font-weight', 'normal')
                        link.attr('opacity', 0.05).attr('stroke', '#999')
                    } else {
                        // Hide no connections message if it exists
                        g.select('.no-connections-message')
                            .transition()
                            .duration(300)
                            .attr('opacity', 0)
                            .remove()
                        g.select('.no-connections-subtitle')
                            .transition()
                            .duration(300)
                            .attr('opacity', 0)
                            .remove()

                        // Highlight nodes connected to selected author's edges
                        node.attr('opacity', (n) =>
                            relevantNodeNames.has(n.name) ? 1 : 0.1
                        )
                            .attr('stroke-width', (n) =>
                                relevantNodeNames.has(n.name) ? 3 : 1.5
                            )
                            .attr('stroke', (n) =>
                                relevantNodeNames.has(n.name)
                                    ? HIGHLIGHT_COLOR
                                    : '#fff'
                            )

                        // Highlight labels of those nodes
                        label
                            .attr('opacity', (n) =>
                                relevantNodeNames.has(n.name) ? 1 : 0.1
                            )
                            .attr('font-weight', (n) =>
                                relevantNodeNames.has(n.name)
                                    ? 'bold'
                                    : 'normal'
                            )

                        // Highlight only edges by the selected author
                        link.attr('opacity', (l) =>
                            l.author === selectedGroup ? 0.8 : 0.05
                        ).attr('stroke', (l) =>
                            l.author === selectedGroup
                                ? HIGHLIGHT_COLOR
                                : '#999'
                        )
                    }

                    // Update tooltip for author selection
                    permanentTooltip.html(`
                <div class="selection-banner">
                     <span>Selected Author:</span>
                     <span>${selectedGroup}</span>
                </div>
                <p><strong>Edges shown:</strong> ${relevantLinks.length}</p>
                <p><strong>Characters connected:</strong> ${
                    relevantNodeNames.size
                }</p>
                <div style="margin-top: 10px;">
                    <small>Click background to reset view</small>
                </div>
                <hr style="margin: 10px 0;">
                ${buildLegendHTML(selectedGroup)}
            `)
                } else {
                    // =======================
                    // Character Type / Domain
                    // =======================

                    // Normalizer (Title-Case, trim, collapse spaces)
                    function norm(s) {
                        if (!s) return s
                        return String(s)
                            .trim()
                            .split(/\s+/)
                            .map(
                                (t) =>
                                    t.charAt(0).toUpperCase() +
                                    t.slice(1).toLowerCase()
                            )
                            .join(' ')
                    }

                    const sel = norm(selectedGroup)

                    // 1) Versuche: exakte Character-Liste aus butterfly_data.json (Character Type)
                    let charList = null
                    if (
                        window.butterflyData?.gender_by_type?.[sel]?.characters
                    ) {
                        charList = new Set(
                            window.butterflyData.gender_by_type[
                                sel
                            ].characters.map(norm)
                        )
                    }

                    // 2) Falls nicht vorhanden: Domains-Mapping aus butterfly_data.json
                    if (
                        !charList &&
                        window.butterflyData?.domains_grouped_by_gender?.[sel]
                            ?.characters
                    ) {
                        charList = new Set(
                            window.butterflyData.domains_grouped_by_gender[
                                sel
                            ].characters.map(norm)
                        )
                    }

                    // 3) Fallback: Hierarchie/Description (normalisiert)
                    let relevantNodes
                    if (charList) {
                        relevantNodes = nodes.filter((n) =>
                            charList.has(norm(n.name))
                        )
                    } else {
                        relevantNodes = nodes.filter((n) => {
                            const parentGroup = norm(parentKey(n))
                            const characterType = norm(n.description)
                            return parentGroup === sel || characterType === sel
                        })
                    }

                    const relevantNodeNames = new Set(
                        relevantNodes.map((n) => n.name)
                    )

                    if (relevantNodes.length === 0) {
                        // Kein Ergebnis → alles abdunkeln
                        node.attr('opacity', 0.1)
                            .attr('stroke-width', 1.5)
                            .attr('stroke', '#fff')
                        label.attr('opacity', 0.1).attr('font-weight', 'normal')
                        link.attr('opacity', 0.05).attr('stroke', '#999')

                        // Konsistenter Tooltip (kein „Category:“ Quatsch mehr)
                        permanentTooltip.html(`
                            <p><strong>Edges shown:</strong> 0</p>
                            <p><strong>Characters shown:</strong> 0</p>
                            <div style="margin-top: 10px;">
                                <small>Click background to reset view</small>
                            </div>
                            <hr style="margin: 10px 0;">
                            ${buildLegendHTML(selectedGroup)}
                        `)
                    } else {
                        // Sichtbarkeit/Styles
                        node.attr('opacity', (n) =>
                            relevantNodeNames.has(n.name) ? 1 : 0.1
                        )
                            .attr('stroke-width', (n) =>
                                relevantNodeNames.has(n.name) ? 3 : 1.5
                            )
                            .attr('stroke', (n) =>
                                relevantNodeNames.has(n.name)
                                    ? HIGHLIGHT_COLOR
                                    : '#fff'
                            )

                        label
                            .attr('opacity', (n) =>
                                relevantNodeNames.has(n.name) ? 1 : 0.1
                            )
                            .attr('font-weight', (n) =>
                                relevantNodeNames.has(n.name)
                                    ? 'bold'
                                    : 'normal'
                            )

                        link.attr('opacity', (l) => {
                            const s = l.source.name || l.source
                            const t = l.target.name || l.target
                            return relevantNodeNames.has(s) &&
                                relevantNodeNames.has(t)
                                ? 0.8
                                : 0.05
                        }).attr('stroke', (l) => {
                            const s = l.source.name || l.source
                            const t = l.target.name || l.target
                            return relevantNodeNames.has(s) &&
                                relevantNodeNames.has(t)
                                ? HIGHLIGHT_COLOR
                                : '#999'
                        })

                        // Edges innerhalb der Auswahl zählen
                        const relevantEdgeCount = edges.filter((e) => {
                            const s =
                                typeof e.source === 'object'
                                    ? e.source?.name
                                    : e.source
                            const t =
                                typeof e.target === 'object'
                                    ? e.target?.name
                                    : e.target
                            return (
                                relevantNodeNames.has(s) &&
                                relevantNodeNames.has(t)
                            )
                        }).length

                        // Konsistenter Tooltip (wie bei Titan/Author)
                        permanentTooltip.html(`
                            <p><strong>Edges shown:</strong> ${relevantEdgeCount}</p>
                            <p><strong>Characters shown:</strong> ${
                                relevantNodes.length
                            }</p>
                            <div style=\"margin-top: 10px;\">
                                <small>Click background to reset view</small>
                            </div>
                            <hr style=\"margin: 10px 0;\">
                            ${buildLegendHTML(selectedGroup)}
                        `)
                    }
                }
            } else {
                // Remove no connections message if it exists
                g.select('.no-connections-message')
                    .transition()
                    .duration(300)
                    .attr('opacity', 0)
                    .remove()
                g.select('.no-connections-subtitle')
                    .transition()
                    .duration(300)
                    .attr('opacity', 0)
                    .remove()

                // Reset to normal view only if no individual node is selected
                console.log('afsd')
                if (!fixedNode) {
                    node.attr('opacity', 1)
                        .attr('stroke-width', 1.5)
                        .attr('stroke', '#fff')

                    label.attr('opacity', 1).attr('font-weight', 'normal')

                    link.attr('opacity', 0.6).attr('stroke', '#999')
                }

                // Always restore original legend regardless of node selection
                permanentTooltip.html(legendHtml)
                attachLegendHandlers()
            }
        })
    }
}
