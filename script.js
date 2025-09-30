function init() {
    // Global event dispatcher for selection (is it working?)
    window.globalSelection = {
        selectedGroup: null,
        listeners: [],
        set(group) {
            this.selectedGroup = group;
            this.listeners.forEach(fn => fn(group));
        },
        onChange(fn) {
            this.listeners.push(fn);
        }
    };
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
    ]).then(([characters, edges]) => {
        //createForceDirectedGraph(characters, edges, '.ForceDirectedGraph');

        // Get all unique categories for coloring
        const usedCategories = Array.from(
            new Set(
                characters.map(
                    (n) => n.level4 || n.level3 || n.level2 || n.level1 || 'Unknown'
                )
            )
        );

        const combinedColors = d3.schemeTableau10.concat(d3.schemeSet3);

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

    
        // Global handler for tooltip clicks
        window.handleTooltipClick = function(group) {
            if (window.globalSelection) {
                window.globalSelection.set(group);
            }
            //  can add more custom actions here
        }


        createForceDirectedGraph(characters, edges, '.ForceDirectedGraph', categoryColorMap);
        createTimeLineChart(characters, edges, '.TimelineChart', categoryColorMap);
        //createTimeLineChart(characters, edges, '.TimelineChart');

    })
}
