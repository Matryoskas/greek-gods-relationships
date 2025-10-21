// Global edge filtering function (same as in force-directed graph)
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

function init() {
    window.globalSelection = {
        selectedGroup: null,
        selectedAuthor: null,
        groupListeners: [],
        authorListeners: [],

        // --- GROUP selection ---
        setGroup(group) {
            if (this.selectedGroup === group) {
                this.selectedGroup = null
            } else {
                this.selectedGroup = group
            }
            this.groupListeners.forEach((fn) => fn(this.selectedGroup))
        },
        onGroupChange(fn) {
            this.groupListeners.push(fn)
        },
        getSelectedGroup() {
            return this.selectedGroup
        },

        // --- AUTHOR selection ---
        setAuthor(author) {
            if (this.selectedAuthor === author) {
                this.selectedAuthor = null
            } else {
                this.selectedAuthor = author
            }
            this.authorListeners.forEach((fn) => fn(this.selectedAuthor))
        },
        onAuthorChange(fn) {
            this.authorListeners.push(fn)
        },
        getSelectedAuthor() {
            return this.selectedAuthor
        },
    }
    Promise.all([
        d3.csv('datasets/unique_characters.csv', (d) => ({
            name: d.name,
            description: d.description,
            gender: d.gender,
            father: d.Father,
            mother: d.Mother,
            aliases: d.aliases,
            level1: d.level1,
            level2: d.level2,
            level3: d.level3,
            level4: d.level4,
            domain: d.domain,
        })),
        d3.csv('datasets/edges_filtered.csv', (d) => ({
            source: d.source,
            target: d.target,
            normalized_weight: +d.normalized_weight, // convert to number
            author: d.author,
            title: d.title,
            period: d.period,
        })),
    ]).then(([characters, allEdges]) => {
        // GLOBAL DATA PROCESSING - used by both charts

        // Keep original edges for timeline period analysis
        const timelineEdges = allEdges

        // Filter edges by weight for force-directed graph
        let filteredEdges = allEdges.filter((d) => d.normalized_weight > 0.3)
        filteredEdges = filterTopNEdges(filteredEdges, 2)

        // Find connected nodes (only nodes that appear in filtered edges)
        const connected = new Set()
        filteredEdges.forEach((e) => {
            connected.add(e.source.name || e.source)
            connected.add(e.target.name || e.target)
        })

        // Filter characters to only those that are connected
        const filteredCharacters = characters.filter((n) =>
            connected.has(n.name)
        )

        // Normalize category strings to Title Case for every word (collapse spaces)
        function normalize(str) {
            if (!str) return str
            return String(str)
                .trim()
                .split(/\s+/)
                .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
                .join(' ')
        }

        // Apply normalization to all characters
        filteredCharacters.forEach((n) => {
            if (n.level1) n.level1 = normalize(n.level1)
            if (n.level2) n.level2 = normalize(n.level2)
            if (n.level3) n.level3 = normalize(n.level3)
            if (n.level4) n.level4 = normalize(n.level4)
            n.description = normalize(n.description)
        })

        // Define global grouping logic (same as force-directed graph)
        const parentKey = (n) => n.level2 || n.level1 || 'Other'
        const childKey = (n) => n.level3 || n.level4 || null

        // Build parent → children map from filtered characters
        const groupMap = new Map()
        filteredCharacters.forEach((n) => {
            const p = parentKey(n)
            const c = childKey(n)
            if (!groupMap.has(p)) groupMap.set(p, new Set())
            if (c) groupMap.get(p).add(c)
        })

        // Get all parent groups for consistent category list
        const parentGroups = Array.from(groupMap.keys()).sort()

        // Get all unique categories for coloring (from filtered data)
        const usedCategories = Array.from(
            new Set(
                filteredCharacters.map(
                    (n) =>
                        n.level4 ||
                        n.level3 ||
                        n.level2 ||
                        n.level1 ||
                        'Other'
                )
            )
        )

        const combinedColors = d3.schemeTableau10.concat(d3.schemeSet3)

        // If we have more categories than colors, generate extra ones
        function getColor(i) {
            if (i < combinedColors.length) {
                return combinedColors[i]
            }
            //Generate extra colors using interpolateRainbow
            return d3.interpolateRainbow(i / usedCategories.length)
        }

        //Assign each category a unique color
        const categoryColorMap = {}
        usedCategories.forEach((cat, i) => {
            categoryColorMap[cat] = getColor(i)
        })
        // Ensure the "Other" category is always grey (case-insensitive)
        ;['Other', 'OTHER'].forEach((k) => {
            if (usedCategories.includes(k)) {
                categoryColorMap[k] = '#888'
            }
        })
        // Ensure "Titan" uses a vivid, distinct color (case-insensitive)
        ;['Titan', 'TITAN'].forEach((k) => {
            if (usedCategories.includes(k)) {
                categoryColorMap[k] = '#b100e8'
            }
        })

        // Create a parent group color map for timeline chart
        const parentColorMap = {}
        parentGroups.forEach((parentGroup, i) => {
            parentColorMap[parentGroup] = getColor(i)
        })
        // Ensure the "Other" parent group is always grey (case-insensitive)
        ;['Other', 'OTHER'].forEach((k) => {
            if (parentGroups.includes(k)) {
                parentColorMap[k] = '#888'
            }
        })
        // Ensure "Titan" parent group uses a vivid, distinct color (case-insensitive)
        ;['Titan', 'TITAN'].forEach((k) => {
            if (parentGroups.includes(k)) {
                parentColorMap[k] = '#b100e8'
            }
        })

        console.log('Parent groups:', parentGroups)
        console.log('Parent color map:', parentColorMap)

        // Global handler for tooltip clicks
        window.handleTooltipClick = function (group) {
            if (window.globalSelection) {
                window.globalSelection.setGroup(group)
            }
            //  can add more custom actions here
        }

        // Pass filtered data and parent groups to both charts
        createForceDirectedGraph(
            filteredCharacters,
            filteredEdges, // Use filtered edges for force-directed graph
            '.ForceDirectedGraph',
            categoryColorMap
        )
        createTimeLineChart(
            filteredCharacters,
            timelineEdges, // Use full edge dataset for timeline analysis
            '.TimelineChart',
            parentColorMap, // Use parent color map for timeline
            parentGroups
        )

        // Initialize general butterfly chart with pre-computed data
        createButterflyChart(
            '.ButterflyChart',
            parentGroups,
            'butterfly_data.json'
        )

        //createTimeLineChart(characters, edges, '.TimelineChart');
    })
}
